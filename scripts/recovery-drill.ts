import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout } from "node:timers/promises";
import { imageVariantPath } from "../src/features/media/variants";

// Own disposable container, no inherited database URLs and no application workers.
const started = Date.now();
// Match the hosted database major verified during Step 6; pg_dump must not be older.
const postgresImage = "postgres:18-alpine";
const name = `wishlist-recovery-${randomUUID()}`;
const password = randomUUID();
const run = (command: string, args: string[], input?: string | Buffer) => {
  const result = spawnSync(command, args, {
    input,
    env: process.env,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.status !== 0)
    throw new Error(
      `${command} ${args[0]} failed: ${result.stderr.toString().replaceAll(password, "[redacted]").slice(-1500)}`,
    );
  return result.stdout;
};
const sql = (database: string, query: string) =>
  run(
    "docker",
    [
      "exec",
      "-i",
      name,
      "psql",
      "-U",
      "postgres",
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-At",
    ],
    query,
  )
    .toString()
    .trim();
const hash = (value: Buffer | string) =>
  createHash("sha256").update(value).digest("hex");
const root = path.resolve(".local/operations");
await mkdir(root, { recursive: true, mode: 0o700 });
const directory = await mkdtemp(path.join(root, "recovery-"));
let created = false;
try {
  run("docker", [
    "run",
    "--detach",
    "--rm",
    "--name",
    name,
    "--publish",
    "127.0.0.1::5432",
    "--env",
    `POSTGRES_PASSWORD=${password}`,
    "--env",
    "POSTGRES_DB=operations_source",
    postgresImage,
  ]);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    const probe = spawnSync("docker", [
      "exec",
      name,
      "pg_isready",
      "-U",
      "postgres",
      "-d",
      "operations_source",
    ]);
    if (probe.status === 0) {
      ready = true;
      break;
    }
    await setTimeout(1_000);
  }
  assert(ready, "Isolated PostgreSQL did not become ready.");
  const serverVersion = sql("operations_source", "SHOW server_version;");
  assert.equal(serverVersion.split(".")[0], "18");
  const port = run("docker", ["port", name, "5432/tcp"])
    .toString()
    .trim()
    .split(":")
    .at(-1);
  assert(port && /^\d+$/.test(port));
  const url = `postgresql://postgres:${password}@127.0.0.1:${port}/operations_source`;
  const migrate = spawnSync(
    process.execPath,
    ["node_modules/prisma/build/index.js", "migrate", "deploy"],
    {
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
      maxBuffer: 4 * 1024 * 1024,
    },
  );
  assert.equal(migrate.status, 0, "Isolated migration deployment failed.");
  sql(
    "operations_source",
    `
    BEGIN;
    INSERT INTO "User" (id, username, email, "passwordHash") VALUES
      ('recovery-owner', 'recovery-owner', 'owner@example.test', 'not-a-login'),
      ('recovery-member', 'recovery-member', 'member@example.test', 'not-a-login');
    INSERT INTO "Wishlist" (id, title, "updatedAt", "ownerId", publication, visibility, "reservationsEnabled")
      VALUES ('recovery-list', 'Recovery fixture', now(), 'recovery-owner', 'PUBLISHED', 'PRIVATE', true);
    INSERT INTO "Membership" (id, "wishlistId", "userId", role)
      VALUES ('recovery-admin', 'recovery-list', 'recovery-owner', 'ADMIN');
    INSERT INTO "Wish" (id, title, "updatedAt", "wishlistId", "authorId")
      VALUES ('recovery-wish', 'A private wish', now(), 'recovery-list', 'recovery-owner');
    INSERT INTO "Reservation" (id, "wishId", "userId")
      VALUES ('recovery-reservation', 'recovery-wish', 'recovery-member');
    COMMIT;
  `,
  );
  const mediaPath = `images/${randomUUID()}.webp`;
  const { default: sharp } = await import("sharp");
  const bytes = await sharp({
    create: {
      width: 256,
      height: 192,
      channels: 3,
      background: "#36513b",
    },
  })
    .webp()
    .toBuffer();
  await mkdir(path.join(directory, "source-media/images"), { recursive: true });
  await writeFile(path.join(directory, "source-media", mediaPath), bytes, {
    mode: 0o600,
  });
  const variantPath = imageVariantPath(mediaPath, 200);
  const variantBytes = await sharp(bytes)
    .resize({ width: 200 })
    .webp()
    .toBuffer();
  await writeFile(
    path.join(directory, "source-media", variantPath),
    variantBytes,
    {
      mode: 0o600,
    },
  );
  sql(
    "operations_source",
    `INSERT INTO "Media"
    (id, pathname, provider, state, alt, width, height, bytes, "variantWidths", "cleanupAfter", "wishId")
    VALUES ('recovery-media', '${mediaPath}', 'LOCAL', 'READY', 'Recovery fixture', 256, 192, ${bytes.length}, ARRAY[200], now(), 'recovery-wish');`,
  );
  const snapshot = (database: string) => {
    const tables = sql(
      database,
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`,
    ).split("\n");
    return tables.map((table) => {
      const quoted = `"${table.replaceAll('"', '""')}"`;
      return [
        table,
        hash(
          sql(
            database,
            `SELECT COALESCE(jsonb_agg(row ORDER BY row::text), '[]'::jsonb) FROM (SELECT to_jsonb(t) AS row FROM ${quoted} t) rows;`,
          ),
        ),
      ];
    });
  };
  const before = snapshot("operations_source");
  run("docker", [
    "exec",
    name,
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "operations_source",
    "-Fc",
    "-f",
    "/tmp/recovery.dump",
  ]);
  run("docker", [
    "cp",
    `${name}:/tmp/recovery.dump`,
    path.join(directory, "database.dump"),
  ]);
  await cp(
    path.join(directory, "source-media"),
    path.join(directory, "backup-media"),
    { recursive: true },
  );
  // Prove the archive restores the original state, rather than inspecting the source.
  sql(
    "operations_source",
    `UPDATE "Wish" SET title = 'Changed after backup' WHERE id = 'recovery-wish';`,
  );
  sql("postgres", "CREATE DATABASE operations_restored;");
  const restoreStarted = Date.now();
  run("docker", [
    "exec",
    name,
    "pg_restore",
    "-U",
    "postgres",
    "-d",
    "operations_restored",
    "--exit-on-error",
    "--no-owner",
    "--no-privileges",
    "/tmp/recovery.dump",
  ]);
  assert.deepEqual(snapshot("operations_restored"), before);
  const constraints = (database: string) =>
    sql(
      database,
      `SELECT conname, contype, condeferrable, condeferred, convalidated
       FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY conname;`,
    );
  assert.equal(
    constraints("operations_restored"),
    constraints("operations_source"),
  );
  sql(
    "operations_restored",
    `DO $$ BEGIN
    BEGIN
      INSERT INTO "Reservation" (id, "wishId", "userId")
        VALUES ('duplicate', 'recovery-wish', 'recovery-member');
    EXCEPTION WHEN unique_violation THEN RETURN;
    END;
    RAISE EXCEPTION 'Restored reservation uniqueness was not enforced';
  END $$;
  DO $$ BEGIN
    BEGIN
      UPDATE "Wishlist" SET theme = 'invalid-theme' WHERE id = 'recovery-list';
    EXCEPTION WHEN check_violation THEN RETURN;
    END;
    RAISE EXCEPTION 'Restored theme constraint was not enforced';
  END $$;`,
  );
  await cp(
    path.join(directory, "backup-media"),
    path.join(directory, "restored-media"),
    { recursive: true },
  );
  assert.equal(
    hash(await readFile(path.join(directory, "restored-media", mediaPath))),
    hash(bytes),
  );
  assert.equal(
    hash(await readFile(path.join(directory, "restored-media", variantPath))),
    hash(variantBytes),
  );
  assert.equal(
    sql(
      "operations_restored",
      `SELECT w.visibility || ':' || m.role || ':' || (r."endedAt" IS NULL)::text
    FROM "Wishlist" w JOIN "Membership" m ON m."wishlistId" = w.id
    JOIN "Wish" i ON i."wishlistId" = w.id JOIN "Reservation" r ON r."wishId" = i.id;`,
    ),
    "PRIVATE:ADMIN:true",
  );
  const result = {
    checkedAt: new Date().toISOString(),
    postgresImage,
    serverVersion,
    scope:
      "fictional local fixture; not hosted backup or Blob recovery acceptance",
    restoredTables: before.length,
    dataAndMigrationChecksumsMatch: true,
    constraintMetadataMatches: true,
    restoredConstraintChecksPass: true,
    privateMembershipAndReservationMatch: true,
    mediaChecksumMatch: true,
    mediaFilesRestored: 2,
    databaseArchiveSha256: hash(
      await readFile(path.join(directory, "database.dump")),
    ),
    restoreMilliseconds: Date.now() - restoreStarted,
    totalMilliseconds: Date.now() - started,
  };
  await writeFile(
    path.join(directory, "verification.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify({ directory, ...result }, null, 2));
} catch (error) {
  console.error(
    "Isolated recovery drill failed. No existing database was targeted.",
  );
  console.error(
    error instanceof Error ? error.message : "Verification failed.",
  );
  process.exitCode = 1;
} finally {
  if (created) run("docker", ["rm", "--force", name]);
}
