import { defineConfig } from "@playwright/test";
import baseline from "./playwright.config";
import crossBrowser from "./playwright.cross-browser.config";

const server = baseline.webServer;
if (!server || Array.isArray(server)) {
  throw new Error("Account protection tests require one isolated app server");
}

export default defineConfig({
  ...baseline,
  testMatch: "**/auth-protection.spec.ts",
  testIgnore: [],
  projects: [...(baseline.projects ?? []), ...(crossBrowser.projects ?? [])],
  outputDir: "test-results/auth-protection",
  reporter: [
    ["list"],
    [
      "html",
      { open: "never", outputFolder: "playwright-report/auth-protection" },
    ],
  ],
  webServer: {
    ...server,
    command: server.command.replace(
      "--import ./e2e/paddle-preload.ts",
      "--import ./e2e/paddle-preload.ts --import ./e2e/turnstile-preload.ts",
    ),
    env: {
      ...server.env,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "isolated-challenge-site",
      TURNSTILE_SECRET_KEY: "isolated-challenge-secret",
    },
  },
});
