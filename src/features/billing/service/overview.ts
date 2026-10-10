import { prisma } from "@/lib/prisma";

export const readBillingOverview = async (userId: string) => {
  const now = new Date();
  const [account, promoCount] = await Promise.all([
    prisma.billingAccount.findUnique({
      where: { userId },
      include: {
        subscriptions: {
          orderBy: { updatedAt: "desc" },
          include: { payments: { where: { expiresAt: { gt: now } } } },
        },
        checkouts: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.premiumGrant.count({
      where: {
        userId,
        promoRedemptionId: { not: null },
        revokedAt: null,
        expiresAt: { gt: now },
      },
    }),
  ]);
  const subscriptions = account?.subscriptions ?? [];
  const paidUntil = subscriptions
    .flatMap((subscription) => subscription.payments)
    .filter((payment) => !payment.refunded)
    .reduce<Date | null>(
      (end, payment) =>
        !end || payment.expiresAt > end ? payment.expiresAt : end,
      null,
    );
  const latestCheckout = account?.checkouts[0];
  return {
    account,
    subscriptions,
    pending: latestCheckout && !latestCheckout.closedAt ? latestCheckout : null,
    active: subscriptions.some(
      (subscription) => subscription.status !== "canceled",
    ),
    paidUntil,
    hasPromo: promoCount > 0,
  };
};

export type BillingOverview = Awaited<ReturnType<typeof readBillingOverview>>;
