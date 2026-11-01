import { randomUUID } from "node:crypto";
import { z } from "zod";
import { consumeRateLimit } from "@/features/auth/service/security";
import { prisma } from "@/lib/prisma";
import {
  activeBillingAccountWhere,
  requireBillingUser,
  withBillingAccount,
} from "./accounts";
import { billingCheckoutEnabled, billingConfig, BillingError } from "./config";
import { fullyRefunded, paddleClient, transactionSchema } from "./paddle";

const unavailable = () =>
  new BillingError(
    "Starting again requires canceled renewal and a full refund of all remaining paid time. Refresh billing and try again.",
  );

// Ends only the explicitly selected, refunded subscription. Creating and paying
// for its replacement remain separate checkout actions with recurring consent.
export const prepareResubscription = async (
  userId: string,
  sessionId: string,
  subscriptionId: string,
) => {
  z.string()
    .regex(/^sub_[a-z0-9]{26}$/)
    .parse(subscriptionId);
  if (!billingCheckoutEnabled(userId))
    throw new BillingError(
      "New subscriptions are temporarily unavailable. Existing subscriptions can still be managed.",
    );
  await consumeRateLimit("billing-resubscribe", userId, 10, 3600000);
  const claimId = randomUUID();
  const account = await prisma.$transaction(async (tx) => {
    await requireBillingUser(tx, userId, sessionId);
    const account = await tx.billingAccount.findFirst({
      where: activeBillingAccountWhere(userId),
      include: { subscriptions: true },
    });
    const subscription = account?.subscriptions.find(
      (item) => item.id === subscriptionId,
    );
    if (
      !account?.customerId ||
      account.deletedAt ||
      !subscription ||
      (subscription.status !== "canceled" &&
        (!subscription.cancelAt || subscription.nextBilledAt)) ||
      account.subscriptions.some(
        (item) => item.id !== subscriptionId && item.status !== "canceled",
      )
    )
      throw unavailable();
    if (account.leaseUntil && account.leaseUntil > new Date())
      throw new BillingError("Billing is updating. Please try again shortly.");
    const [paid, refunded, pending] = await Promise.all([
      tx.billingPayment.count({
        where: {
          subscription: { accountId: account.id },
          refunded: false,
          expiresAt: { gt: new Date() },
        },
      }),
      tx.billingPayment.count({
        where: {
          subscriptionId,
          refunded: true,
          expiresAt: { gt: new Date() },
        },
      }),
      tx.billingCheckout.count({
        where: { accountId: account.id, closedAt: null },
      }),
    ]);
    if (paid || !refunded || pending) throw unavailable();
    const claimed = await tx.billingAccount.updateMany({
      where: {
        id: account.id,
        OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
      },
      data: { claimId, leaseUntil: new Date(Date.now() + 5 * 60000) },
    });
    if (!claimed.count)
      throw new BillingError("Billing is updating. Please try again shortly.");
    return account;
  });

  try {
    const config = billingConfig(account.environment);
    const api = paddleClient(account.environment);
    let subscription = await api.getSubscription(subscriptionId);
    if (
      subscription.customer_id !== account.customerId ||
      (subscription.status !== "canceled" &&
        (subscription.scheduled_change?.action !== "cancel" ||
          subscription.next_billed_at !== null))
    )
      throw unavailable();
    const transactions = await api.paddleList(
      `/transactions?${new URLSearchParams({ subscription_id: subscriptionId, status: "completed", per_page: "30" })}`,
      transactionSchema,
    );
    let refundedPeriods = 0;
    for (const item of transactions) {
      if (!item.billing_period) throw unavailable();
      if (new Date(item.billing_period.ends_at) <= new Date()) continue;
      const transaction = await api.getTransaction(item.id);
      if (
        transaction.status !== "completed" ||
        transaction.customer_id !== account.customerId ||
        transaction.subscription_id !== subscriptionId ||
        transaction.currency_code !== "EUR" ||
        transaction.items.length !== 1 ||
        transaction.items[0].quantity !== 1 ||
        !Object.values(config.prices).includes(transaction.items[0].price.id) ||
        !transaction.billing_period ||
        !fullyRefunded(transaction)
      )
        throw unavailable();
      refundedPeriods++;
    }
    if (!refundedPeriods) throw unavailable();

    // Recheck session and lease after provider reads, before ending the contract.
    await withBillingAccount(account.id, async (tx) => {
      await requireBillingUser(tx, userId, sessionId);
      const current = await tx.billingAccount.findUniqueOrThrow({
        where: { id: account.id },
      });
      if (
        current.deletedAt ||
        current.claimId !== claimId ||
        current.revision !== account.revision ||
        !current.leaseUntil ||
        current.leaseUntil <= new Date()
      )
        throw unavailable();
    });
    subscription = await api.getSubscription(subscriptionId);
    if (
      subscription.customer_id !== account.customerId ||
      (subscription.status !== "canceled" &&
        (subscription.scheduled_change?.action !== "cancel" ||
          subscription.next_billed_at !== null))
    )
      throw unavailable();
    if (subscription.status !== "canceled") {
      await api.paddleRequest(
        `/subscriptions/${subscriptionId}/cancel`,
        "POST",
        {
          effective_from: "immediately",
        },
      );
      subscription = await api.getSubscription(subscriptionId);
    }
    if (
      subscription.status !== "canceled" ||
      subscription.customer_id !== account.customerId
    )
      throw new BillingError("Subscription cancellation is still pending.");

    await withBillingAccount(account.id, async (tx) => {
      const current = await tx.billingAccount.findUniqueOrThrow({
        where: { id: account.id },
      });
      if (current.deletedAt || current.claimId !== claimId) throw unavailable();
      await tx.billingSubscription.update({
        where: { id: subscriptionId, accountId: account.id },
        data: {
          status: "canceled",
          nextBilledAt: null,
          cancelAt: null,
          updatedAt: new Date(subscription.updated_at),
        },
      });
    });
  } finally {
    // Also recovers an ambiguous cancel response via normal reconciliation.
    await prisma.billingAccount.updateMany({
      where: { id: account.id, claimId },
      data: { claimId: null, leaseUntil: null, nextSyncAt: new Date() },
    });
  }
};
