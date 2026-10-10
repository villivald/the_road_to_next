import { AuthError, lockUser } from "@/features/auth/service/security";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const requireBillingUser = async (
  tx: Prisma.TransactionClient,
  userId: string,
  sessionId: string,
) => {
  await lockUser(tx, userId);
  const user = await tx.user.findFirst({
    where: {
      id: userId,
      emailVerified: true,
      sessions: { some: { id: sessionId, expiresAt: { gt: new Date() } } },
    },
    select: { id: true, email: true },
  });
  if (!user) throw new AuthError("Your session expired. Please sign in again.");
  return user;
};

// Same user-before-billing lock order as checkout, grants, and account deletion.
export const withBillingAccount = async <T>(
  id: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) => {
  const account = await prisma.billingAccount.findUniqueOrThrow({
    where: { id },
  });
  return prisma.$transaction(async (tx) => {
    if (account.userId) await lockUser(tx, account.userId);
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(8112, hashtext(${id}))::text`;
    return operation(tx);
  });
};

export const queueBilling = async (id: string) => {
  await prisma.billingAccount.update({
    where: { id },
    data: { revision: { increment: 1 }, nextSyncAt: new Date() },
  });
};

export const detachBilling = async (
  tx: Prisma.TransactionClient,
  userId: string,
) => {
  const account = await tx.billingAccount.findUnique({ where: { userId } });
  if (!account) return;
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(8112, hashtext(${account.id}))::text`;
  await tx.billingAccount.update({
    where: { id: account.id },
    data: {
      deletedAt: new Date(),
      nextSyncAt: new Date(),
      revision: { increment: 1 },
      claimId: null,
      leaseUntil: null,
    },
  });
  await tx.billingCheckout.updateMany({
    where: { accountId: account.id, closedAt: null },
    data: { cancelRequested: true },
  });
};
