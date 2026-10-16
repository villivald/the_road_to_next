import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const { deliverAccountEmails } =
  await import("../src/features/notifications/service/delivery");
const { prisma } = await import("../src/lib/prisma");
try {
  console.log(await deliverAccountEmails());
} catch {
  console.error(
    "Account email delivery failed. Check the configured services.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
