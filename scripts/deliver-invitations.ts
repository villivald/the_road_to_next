import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const { deliverInvitations } =
  await import("../src/features/sharing/service/delivery");
const { prisma } = await import("../src/lib/prisma");

try {
  console.log(await deliverInvitations());
} catch {
  console.error("Invitation delivery failed. Check the configured services.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
