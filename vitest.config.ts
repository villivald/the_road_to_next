import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
const integration = process.env.INTEGRATION_TESTS === "1";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    server: { deps: { inline: [/next-intl/] } },
    setupFiles: ["./tests/i18n-setup.ts"],
    include: integration
      ? ["tests/**/*.integration.test.ts"]
      : ["tests/**/*.test.ts"],
    exclude: integration ? [] : ["tests/**/*.integration.test.ts"],
    fileParallelism: !integration,
    clearMocks: true,
  },
});
