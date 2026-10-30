import { prisma } from "@/lib/prisma";

// On-demand only. No provider calls, row identifiers, message bodies or writes.
export const readOperationsStatus = async (now = new Date()) => {
  const overdue = new Date(now.getTime() - 30 * 60_000);
  const mediaOverdue = new Date(now.getTime() - 2 * 60 * 60_000);
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      await tx.$executeRaw`SET LOCAL statement_timeout = '10s'`;
      const email = { sentAt: null, canceledAt: null };
      const invitation = {
        sentAt: null,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: now },
        wishlist: { archivedAt: null },
      };
      const detached = { wishlistId: null, wishId: null, userId: null };
      const attention = {
        overdueAccountEmails: await tx.accountEmail.count({
          where: {
            ...email,
            deliveryFailedAt: null,
            nextAttemptAt: { lt: overdue },
          },
        }),
        failedAccountEmails: await tx.accountEmail.count({
          where: { ...email, deliveryFailedAt: { not: null } },
        }),
        overdueInvitations: await tx.invitation.count({
          where: {
            ...invitation,
            deliveryFailedAt: null,
            nextAttemptAt: { lt: overdue },
          },
        }),
        failedInvitations: await tx.invitation.count({
          where: { ...invitation, deliveryFailedAt: { not: null } },
        }),
        overdueBillingEvents: await tx.billingEvent.count({
          where: { processedAt: null, nextAttemptAt: { lt: overdue } },
        }),
        repeatedBillingFailures: await tx.billingAccount.count({
          where: { attempts: { gte: 3 } },
        }),
        overdueDeletedAccountCancellations: await tx.billingAccount.count({
          where: {
            deletedAt: { lt: overdue },
            subscriptions: {
              some: { status: { notIn: ["canceled"] } },
            },
          },
        }),
        overdueDetachedMedia: await tx.media.count({
          where: { ...detached, cleanupAfter: { lt: mediaOverdue } },
        }),
        mediaWithRepeatedFailures: await tx.media.count({
          where: { ...detached, attempts: { gte: 3 } },
        }),
      };
      return {
        checkedAt: now.toISOString(),
        status: Object.values(attention).some((count) => count > 0)
          ? "attention"
          : "clear",
        attention,
      };
    },
    { timeout: 30_000, maxWait: 5_000, isolationLevel: "RepeatableRead" },
  );
};
