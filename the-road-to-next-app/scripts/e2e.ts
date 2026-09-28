import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertTestDatabase, testEnvironment } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

const directory = fileURLToPath(new URL("../", import.meta.url));
Object.assign(process.env, testEnvironment);
assertTestDatabase(process.env);

const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: directory,
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

console.log("Browser tests use only wishlist_test on 127.0.0.1:55433.");
run("docker", [
  "compose",
  "-f",
  "compose.rebuild.yaml",
  "up",
  "-d",
  "--wait",
  "test-db",
]);
run(process.execPath, ["node_modules/prisma/build/index.js", "db", "push"]);
await resetFixtures();
run(process.execPath, [
  "node_modules/@playwright/test/cli.js",
  "test",
  ...process.argv.slice(2),
]);
