import { config } from "dotenv";
import { parseArgs } from "node:util";
import { operationsTarget } from "./lib/operations-target";

config({ path: [".env.local", ".env"], quiet: true });
const { values } = parseArgs({
  options: {
    host: { type: "string" },
    port: { type: "string" },
    database: { type: "string" },
    schema: { type: "string" },
  },
});

try {
  const target = operationsTarget(process.env.DATABASE_URL, values);
  const { readOperationsStatus } =
    await import("../src/features/operations/service/status");
  const { prisma } = await import("../src/lib/prisma");
  try {
    const result = await readOperationsStatus();
    console.log(JSON.stringify({ target, ...result }, null, 2));
    if (result.status === "attention") process.exitCode = 2;
  } catch {
    console.error(
      "Operations status unavailable. Check database connectivity.",
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
} catch {
  console.error(
    "Database target not confirmed. Supply matching --host, --port, --database and --schema before connecting.",
  );
  process.exitCode = 1;
}
