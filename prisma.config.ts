import dotenv from "dotenv";
import { defineConfig } from "prisma/config";
import { withExplicitNeonTls } from "./src/lib/database-url";
dotenv.config({ path: [".env.local", ".env"], quiet: true });
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: withExplicitNeonTls(
      process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    ),
  },
});
