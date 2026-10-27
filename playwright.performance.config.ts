import { defineConfig } from "@playwright/test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { testOrigin } from "./e2e/environment";
import {
  assertPerformanceDatabase,
  performanceEnvironment,
} from "./e2e/performance-environment";

assertPerformanceDatabase(process.env);

// Match the existing macOS isolation used by the cross-browser suite.
const firefoxEnvironment =
  process.platform === "darwin"
    ? {
        ...process.env,
        CFFIXED_USER_HOME: mkdtempSync(
          join(tmpdir(), "wishlist-performance-firefox-"),
        ),
      }
    : undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["performance.lab.ts", "performance.monitoring.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [["list"]],
  use: { baseURL: testOrigin, trace: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    {
      name: "firefox",
      testMatch: "performance.monitoring.ts",
      use: {
        browserName: "firefox",
        launchOptions: { env: firefoxEnvironment },
      },
    },
    {
      name: "webkit",
      testMatch: "performance.monitoring.ts",
      use: { browserName: "webkit" },
    },
  ],
  webServer: {
    command:
      "npm run build && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3017",
    url: `${testOrigin}/en`,
    env: {
      ...performanceEnvironment,
      PERFORMANCE_MONITORING: "1",
      PERFORMANCE_SAMPLE_RATE: "1",
    },
    reuseExistingServer: false,
    stdout: "pipe",
    timeout: 120_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
});
