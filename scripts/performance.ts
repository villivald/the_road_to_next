import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  assertPerformanceDatabase,
  performanceEnvironment,
} from "../e2e/performance-environment";

Object.assign(process.env, performanceEnvironment);
assertPerformanceDatabase(process.env);
const run = (command: string, args: string[]) => {
  const result = spawnSync(command, args, {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};
console.log(
  "Performance lab uses only wishlist_test, schema performance, on 127.0.0.1:55433.",
);
run("docker", [
  "compose",
  "-f",
  "compose.rebuild.yaml",
  "up",
  "-d",
  "--wait",
  "test-db",
  "test-mail",
]);
run(process.execPath, [
  "node_modules/prisma/build/index.js",
  "migrate",
  "deploy",
]);
run(process.execPath, ["node_modules/prisma/build/index.js", "generate"]);
const playwrightArguments = [
  "node_modules/@playwright/test/cli.js",
  "test",
  "--config",
  "playwright.performance.config.ts",
  ...process.argv.slice(2),
];
// An idle/suspended macOS host invalidates wall-clock and browser timings.
run(
  process.platform === "darwin" ? "/usr/bin/caffeinate" : process.execPath,
  process.platform === "darwin"
    ? ["-i", process.execPath, ...playwrightArguments]
    : playwrightArguments,
);
