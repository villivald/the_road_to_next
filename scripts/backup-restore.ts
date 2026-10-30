import { get } from "@vercel/blob";
import dotenv from "dotenv";
import assert from "node:assert/strict";
import type { ChildProcess } from "node:child_process";
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { setTimeout } from "node:timers/promises";
import { parseArgs } from "node:util";
import pg from "pg";
import { operationsTarget } from "./lib/operations-target";

// Source connections are read-only. Plain backup/restore bytes stay in container tmpfs.
// No application server, worker, public port or hosted restore is started.
const main = async () => {
  const { values } = parseArgs({
    options: {
      host: { type: "string" },
      port: { type: "string" },
      database: { type: "string" },
      schema: { type: "string" },
      "database-env": { type: "string" },
      "media-env": { type: "string" },
      "blob-store": { type: "string" },
    },
  });
  assert(values["database-env"] && values["media-env"] && values["blob-store"]);
  const readSelected = async (file: string) =>
    dotenv.parse(
      (await readFile(file, "utf8"))
        .split("\n")
        .filter((line) =>
          /^\s*(?:export\s+)?(?:DIRECT_URL|BLOB_READ_WRITE_TOKEN|BLOB_STORE_ID)\s*=/.test(
            line,
          ),
        )
        .join("\n"),
    );
  const databaseSettings = await readSelected(values["database-env"]);
  const mediaSettings = await readSelected(values["media-env"]);
  operationsTarget(databaseSettings.DIRECT_URL, {
    host: values.host,
    port: values.port,
    database: values.database,
    schema: values.schema,
  });
  const source = new URL(databaseSettings.DIRECT_URL);
  assert(
    source.hostname.endsWith(".neon.tech") &&
      !source.hostname.includes("-pooler.") &&
      values.schema === "public",
  );
  assert(
    mediaSettings.BLOB_READ_WRITE_TOKEN &&
      mediaSettings.BLOB_STORE_ID === values["blob-store"],
  );
  if (databaseSettings.BLOB_STORE_ID)
    assert.equal(databaseSettings.BLOB_STORE_ID, values["blob-store"]);
  source.searchParams.set("sslmode", "verify-full");
  const id = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
  const backupDirectory = path.resolve(".local/operations/manual-backups", id);
  const keysDirectory = path.resolve(".local/operations/backup-keys");
  await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
  await mkdir(keysDirectory, { recursive: true, mode: 0o700 });
  const keyPath = path.join(keysDirectory, `${id}.passphrase`);
  const archivePath = path.join(backupDirectory, "wishlist.tar.gpg");
  const passphrase = randomBytes(32).toString("base64url");
  const gpgHome = await mkdtemp("/private/tmp/wgpg-");
  const container = `wishlist-hosted-recovery-${randomUUID()}`;
  let created = false;
  let snapshotOpen = false;
  let stage = "preflight";
  const started = Date.now();
  const client = new pg.Client({
    connectionString: source.toString(),
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
    application_name: "wishlist-step6-backup-readonly",
  });
  const digest = (value: string | Buffer) =>
    createHash("sha256").update(value).digest("hex");
  const run = (args: string[], input?: string | Buffer) => {
    const p = spawnSync("docker", args, {
      input,
      maxBuffer: 64 * 1024 * 1024,
      timeout: 120000,
    });
    if (p.status !== 0) throw Error(`Docker command failed at ${stage}`);
    return p.stdout;
  };
  const sql = (query: string) =>
    run(
      [
        "exec",
        "-i",
        "--env",
        "PGOPTIONS=-c timezone=UTC",
        container,
        "psql",
        "-U",
        "postgres",
        "-d",
        "operations_restored",
        "-At",
        "-v",
        "ON_ERROR_STOP=1",
      ],
      query,
    )
      .toString()
      .trim();
  const put = (file: string, bytes: string | Buffer) =>
    run(
      ["exec", "-i", container, "dd", `of=/recovery/${file}`, "status=none"],
      bytes,
    );
  const read = (file: string) =>
    run(["exec", container, "cat", `/recovery/${file}`]);
  const finish = (child: ChildProcess) =>
    new Promise<void>((resolve, reject) => {
      child.once("error", reject);
      child.once("close", (code) =>
        code === 0
          ? resolve()
          : reject(Error(`Stream command failed at ${stage}`)),
      );
    });
  const gpg = (args: string[]) => {
    const child = spawn("gpg", [
      "--homedir",
      gpgHome,
      "--batch",
      "--no-tty",
      "--pinentry-mode",
      "loopback",
      "--no-symkey-cache",
      "--passphrase-file",
      keyPath,
      ...args,
    ]);
    child.stderr.resume();
    return child;
  };
  const snapshotSql = (table: string) =>
    `SELECT count(*)::int AS rows, encode(sha256(convert_to(coalesce(jsonb_agg(row ORDER BY row::text COLLATE "C")::text,'[]'),'UTF8')),'hex') AS digest FROM (SELECT to_jsonb(t) AS row FROM public."${table.replaceAll('"', '""')}" t) data`;
  let succeeded = false;
  try {
    // Check symmetric encryption/decryption before reading a production snapshot.
    stage = "encryption self-test";
    await writeFile(keyPath, `${passphrase}\n`, { mode: 0o600, flag: "wx" });
    const fixturePath = path.join(backupDirectory, "encryption-self-test.gpg");
    const encryption = gpg([
      "--symmetric",
      "--cipher-algo",
      "AES256",
      "--compress-algo",
      "none",
      "--output",
      fixturePath,
    ]);
    const encryptionDone = finish(encryption);
    encryption.stdin.end("Wishlist recovery encryption test");
    await encryptionDone;
    const decryption = gpg(["--decrypt", fixturePath]);
    const decryptionDone = finish(decryption);
    const chunks = [];
    for await (const chunk of decryption.stdout) chunks.push(chunk);
    await decryptionDone;
    assert.equal(
      Buffer.concat(chunks).toString(),
      "Wishlist recovery encryption test",
    );
    await rm(fixturePath);
    stage = "isolated container";
    run([
      "run",
      "--detach",
      "--rm",
      "--name",
      container,
      "--network",
      "bridge",
      "--tmpfs",
      "/var/lib/postgresql:rw,size=768m,mode=700,uid=70,gid=70",
      "--tmpfs",
      "/recovery:rw,size=128m,mode=700",
      "--env",
      `POSTGRES_PASSWORD=${randomUUID()}`,
      "--env",
      "POSTGRES_DB=operations_restored",
      "postgres:18-alpine",
    ]);
    created = true;
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const p = spawnSync("docker", [
        "exec",
        container,
        "pg_isready",
        "-U",
        "postgres",
        "-d",
        "operations_restored",
      ]);
      if (p.status === 0) {
        ready = true;
        break;
      }
      await setTimeout(1000);
    }
    assert(ready, "Local PostgreSQL ready timeout");
    const localVersion = sql("SHOW server_version;");
    assert.equal(
      localVersion.split(".")[0],
      "18",
      "Unexpected local PostgreSQL version",
    );
    stage = "source snapshot";
    await client.connect();
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    snapshotOpen = true;
    await client.query("SET LOCAL statement_timeout='10s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout='5min'");
    await client.query("SET LOCAL timezone='UTC'");
    const serverVersion = (
      await client.query(
        "SELECT current_setting('server_version_num')::int AS version",
      )
    ).rows[0].version;
    assert(
      serverVersion >= 180000 && serverVersion < 190000,
      "Backup tool requires PostgreSQL 18",
    );
    const size = (
      await client.query(
        "SELECT pg_database_size(current_database())::float8 AS bytes",
      )
    ).rows[0].bytes;
    assert(size < 128 * 1024 * 1024, "Source exceeds reviewed small-beta size");
    const snapshot = (
      await client.query("SELECT pg_export_snapshot() AS snapshot")
    ).rows[0].snapshot;
    const capturedAt = new Date().toISOString();
    const tables = (
      await client.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
      )
    ).rows.map((r) => r.tablename);
    const before: { table: string; rows: number; digest: string }[] = [];
    for (const table of tables) {
      const result = (
        await client.query<{ rows: number; digest: string }>(snapshotSql(table))
      ).rows[0];
      before.push({ table, ...result });
    }
    const media = (
      await client.query<{ pathname: string; variantWidths: number[] }>(
        `SELECT pathname, "variantWidths" FROM "Media" WHERE provider='VERCEL' AND state='READY' AND ("wishlistId" IS NOT NULL OR "wishId" IS NOT NULL OR "userId" IS NOT NULL) ORDER BY pathname`,
      )
    ).rows;
    const mediaPaths = [
      ...new Set(
        media.flatMap((m) => [
          m.pathname,
          ...m.variantWidths.map((w) => `${m.pathname.slice(0, -5)}-${w}.webp`),
        ]),
      ),
    ];
    assert(mediaPaths.length <= 1000);
    assert(
      mediaPaths.every((p) =>
        /^images\/[a-f0-9-]{36}(?:-\d{2,4})?\.webp$/.test(p),
      ),
    );
    const escape = (v: string) =>
      decodeURIComponent(v).replaceAll("\\", "\\\\").replaceAll(":", "\\:");
    put(
      "source.pgpass",
      `${source.hostname}:${source.port || 5432}:${escape(source.pathname.slice(1))}:${escape(source.username)}:${escape(source.password)}\n`,
    );
    run(["exec", container, "chmod", "600", "/recovery/source.pgpass"]);
    stage = "read-only database export";
    run([
      "exec",
      "--env",
      `PGHOST=${source.hostname}`,
      "--env",
      `PGPORT=${source.port || 5432}`,
      "--env",
      `PGUSER=${decodeURIComponent(source.username)}`,
      "--env",
      `PGDATABASE=${decodeURIComponent(source.pathname.slice(1))}`,
      "--env",
      "PGPASSFILE=/recovery/source.pgpass",
      "--env",
      "PGSSLMODE=verify-full",
      "--env",
      "PGSSLROOTCERT=/etc/ssl/certs/ca-certificates.crt",
      "--env",
      "PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=30s",
      container,
      "pg_dump",
      "-Fc",
      "--no-owner",
      "--no-acl",
      "--lock-wait-timeout=10s",
      `--snapshot=${snapshot}`,
      "--file",
      "/recovery/database.dump",
    ]);
    run(["exec", container, "rm", "/recovery/source.pgpass"]);
    await client.query("ROLLBACK");
    snapshotOpen = false;
    await client.end();
    run(["exec", container, "mkdir", "-p", "/recovery/media/images"]);
    stage = "private media export";
    const mediaManifest: { pathname: string; bytes: number; sha256: string }[] =
      [];
    let mediaBytes = 0;
    for (const pathname of mediaPaths) {
      const result = await get(pathname, {
        access: "private",
        token: mediaSettings.BLOB_READ_WRITE_TOKEN,
        abortSignal: AbortSignal.timeout(15000),
      });
      assert(
        result?.statusCode === 200 && result.stream,
        "Referenced media unavailable; incomplete snapshot rejected",
      );
      const bytes = Buffer.from(
        await new Response(result.stream).arrayBuffer(),
      );
      mediaBytes += bytes.length;
      assert(mediaBytes < 64 * 1024 * 1024);
      put(`media/${pathname}`, bytes);
      mediaManifest.push({
        pathname,
        bytes: bytes.length,
        sha256: digest(bytes),
      });
    }
    const manifest = {
      capturedAt,
      postgresMajor: 18,
      sourceSnapshotExported: true,
      tables: before,
      media: mediaManifest,
    };
    put("manifest.json", JSON.stringify(manifest));
    stage = "encrypted archive creation";
    const tar = spawn(
      "docker",
      [
        "exec",
        container,
        "tar",
        "-C",
        "/recovery",
        "-cf",
        "-",
        "database.dump",
        "manifest.json",
        "media",
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    tar.stdin.end();
    tar.stderr.resume();
    const cipher = gpg([
      "--symmetric",
      "--cipher-algo",
      "AES256",
      "--compress-algo",
      "none",
    ]);
    const tarDone = finish(tar);
    const cipherDone = finish(cipher);
    await Promise.all([
      pipeline(tar.stdout, cipher.stdin),
      pipeline(
        cipher.stdout,
        createWriteStream(archivePath, { mode: 0o600, flags: "wx" }),
      ),
      tarDone,
      cipherDone,
    ]);
    const archiveSha256 = digest(await readFile(archivePath));
    // Destroy the plaintext capture, then restore only from the encrypted archive.
    run([
      "exec",
      container,
      "rm",
      "-rf",
      "/recovery/database.dump",
      "/recovery/manifest.json",
      "/recovery/media",
    ]);
    run(["network", "disconnect", "bridge", container]);
    const networks = JSON.parse(
      run([
        "inspect",
        "--format",
        "{{json .NetworkSettings.Networks}}",
        container,
      ]).toString(),
    );
    assert.equal(Object.keys(networks).length, 0);
    stage = "offline decrypt and restore";
    const restoreStarted = Date.now();
    const decipher = gpg(["--decrypt", archivePath]);
    const unpack = spawn(
      "docker",
      ["exec", "-i", container, "tar", "-C", "/recovery", "-xf", "-"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    unpack.stdout.resume();
    unpack.stderr.resume();
    const decipherDone = finish(decipher);
    const unpackDone = finish(unpack);
    await Promise.all([
      pipeline(decipher.stdout, unpack.stdin),
      decipherDone,
      unpackDone,
    ]);
    run([
      "exec",
      container,
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      "operations_restored",
      "--exit-on-error",
      "--no-owner",
      "--no-privileges",
      "/recovery/database.dump",
    ]);
    const restoredManifest = JSON.parse(read("manifest.json").toString());
    assert.deepEqual(restoredManifest, manifest);
    for (const expected of before) {
      const row = JSON.parse(
        sql(
          `SELECT row_to_json(result) FROM (${snapshotSql(expected.table)}) result;`,
        ),
      );
      assert.equal(row.rows, expected.rows);
      assert.equal(row.digest, expected.digest);
    }
    for (const item of mediaManifest) {
      const bytes = read(`media/${item.pathname}`);
      assert.equal(bytes.length, item.bytes);
      assert.equal(digest(bytes), item.sha256);
    }
    const report = {
      capturedAt,
      checkedAt: new Date().toISOString(),
      source:
        "hosted read-only direct connection and referenced private Blob objects",
      backupId: id,
      archivePath,
      keyPath,
      archiveSha256,
      encrypted: true,
      sourceWrites: false,
      hostedRestore: false,
      restoreNetworkIsolated: true,
      restoredTables: before.length,
      restoredRows: before.reduce((sum, t) => sum + t.rows, 0),
      tableDigestsMatch: true,
      mediaFiles: mediaManifest.length,
      mediaBytes,
      mediaDigestsMatch: true,
      restoreMilliseconds: Date.now() - restoreStarted,
      totalMilliseconds: Date.now() - started,
      offDeviceCopy: "owner to complete; key must be stored separately",
    };
    await writeFile(
      path.join(backupDirectory, "verification.json"),
      JSON.stringify(report, null, 2),
      { mode: 0o600 },
    );
    console.log(JSON.stringify(report, null, 2));
    succeeded = true;
  } catch (error) {
    const diagnostic = {
      ok: false,
      stage,
      code: error instanceof Error ? error.name : "Unknown",
      customerContentsSuppressed: true,
    };
    console.error(JSON.stringify(diagnostic));
    process.exitCode = 1;
  } finally {
    if (snapshotOpen) await client.query("ROLLBACK").catch(() => {});
    await client.end().catch(() => {});
    if (created)
      spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
    spawnSync("gpgconf", ["--homedir", gpgHome, "--kill", "gpg-agent"], {
      stdio: "ignore",
    });
    await rm(gpgHome, { recursive: true, force: true });
    if (!succeeded) {
      await writeFile(
        path.join(backupDirectory, "FAILED.json"),
        JSON.stringify({ failed: true, stage }),
        { mode: 0o600 },
      );
    }
  }
};
await main().catch(() => {
  console.error(
    "Backup setup failed. Confirm explicit database/store targets, private settings files, Docker and GPG. No recovery is accepted without verification.json.",
  );
  process.exitCode = 1;
});
