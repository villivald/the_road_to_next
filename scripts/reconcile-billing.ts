import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });
const { reconcileBilling } =
  await import("../src/features/billing/service/sync");
const { prisma } = await import("../src/lib/prisma");

try {
  if (process.argv.includes("--status")) {
    console.log({
      accountsNeedingAttention: await prisma.billingAccount.findMany({
        where: { attempts: { gt: 0 } },
        select: { id: true, deletedAt: true, attempts: true, nextSyncAt: true },
        orderBy: { nextSyncAt: "asc" },
        take: 50,
      }),
      pendingEvents: await prisma.billingEvent.count({
        where: { processedAt: null },
      }),
      unresolvedCheckouts: await prisma.billingCheckout.findMany({
        where: { closedAt: null, transactionId: null },
        select: { id: true, accountId: true, createdAt: true },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
    });
  } else {
    const result = await reconcileBilling();
    console.log(result);
    if (result.failed) process.exitCode = 1;
  }
} catch {
  console.error(
    "Billing reconciliation failed. Check Paddle configuration and service availability.",
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
