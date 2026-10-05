import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { queueBilling, withBillingAccount } from "./accounts";
import { billingConfig, billingEnabled, BillingError } from "./config";
import {
  fullyRefunded,
  getSubscription,
  getTransaction,
  paddleList,
  paddleRequest,
  type PaddleSubscription,
  type PaddleTransaction,
  transactionPeriod,
  transactionSchema,
} from "./paddle";

const retryAt = (attempts: number) =>
  new Date(Date.now() + Math.min(60, 2 ** Math.min(attempts, 6)) * 60000);
const intervalFor = (priceId: string) => {
  const prices = billingConfig().prices;
  if (priceId === prices.month) return "month";
  if (priceId === prices.year) return "year";
  throw new BillingError("Unknown subscription price.");
};

const supportedTransaction = (transaction: PaddleTransaction) => {
  if (
    transaction.currency_code !== "EUR" ||
    transaction.items.length !== 1 ||
    transaction.items[0].quantity !== 1
  ) {
    throw new BillingError("Unexpected subscription items.");
  }
  intervalFor(transaction.items[0].price.id);
};

export const syncBillingAccount = async (id: string) => {
  if (!billingEnabled()) return false;
  const claimId = randomUUID();
  const claimed = await prisma.billingAccount.updateMany({
    where: {
      id,
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
    },
    data: { claimId, leaseUntil: new Date(Date.now() + 5 * 60000) },
  });
  if (!claimed.count) return false;

  try {
    const account = await prisma.billingAccount.findUniqueOrThrow({
      where: { id },
      include: {
        checkouts: { where: { closedAt: null } },
        subscriptions: true,
      },
    });
    const deleting = !!account.deletedAt || !account.userId;
    const transactions = new Map<string, PaddleTransaction>();
    const subscriptions = new Map<string, PaddleSubscription>();
    const checkoutUpdates: {
      id: string;
      transactionId: string;
      closed: boolean;
    }[] = [];

    for (const checkout of account.checkouts) {
      let transaction: PaddleTransaction | undefined;
      if (checkout.transactionId) {
        transaction = await getTransaction(checkout.transactionId);
      } else if (checkout.dispatchedAt) {
        // Paddle has no general idempotency keys. Recover a lost POST response by
        // matching our persisted opaque reference; never create another transaction.
        const query = new URLSearchParams({
          "created_at[GTE]": new Date(
            checkout.createdAt.getTime() - 60000,
          ).toISOString(),
          per_page: "30",
          order_by: "created_at[DESC]",
          customer_id: account.customerId!,
          origin: "api",
        });
        const matches = (
          await paddleList(`/transactions?${query}`, transactionSchema)
        ).filter(
          (item) =>
            item.origin === "api" &&
            item.custom_data?.wishlist_checkout === checkout.id,
        );
        if (matches.length > 1)
          throw new BillingError(
            "Duplicate checkout requires an administrator review.",
          );
        transaction = matches[0];
      }
      if (!transaction)
        throw new BillingError("Checkout creation needs reconciliation.");
      if (transaction.customer_id !== account.customerId)
        throw new BillingError("Checkout customer mismatch.");
      supportedTransaction(transaction);
      if (
        transaction.origin !== "api" ||
        transaction.custom_data?.wishlist_checkout !== checkout.id ||
        transaction.items[0].price.id !== checkout.priceId
      ) {
        throw new BillingError("Checkout identity mismatch.");
      }
      if (
        (deleting || checkout.cancelRequested) &&
        ["draft", "ready"].includes(transaction.status)
      ) {
        await paddleRequest(`/transactions/${transaction.id}`, "PATCH", {
          status: "canceled",
        });
        transaction = await getTransaction(transaction.id);
      }
      transactions.set(transaction.id, transaction);
      checkoutUpdates.push({
        id: checkout.id,
        transactionId: transaction.id,
        closed: ["completed", "canceled"].includes(transaction.status),
      });
      if (transaction.subscription_id)
        subscriptions.set(
          transaction.subscription_id,
          await getSubscription(transaction.subscription_id),
        );
    }

    for (const subscription of account.subscriptions) {
      if (!subscriptions.has(subscription.id))
        subscriptions.set(
          subscription.id,
          await getSubscription(subscription.id),
        );
    }

    for (const [subscriptionId, original] of subscriptions) {
      let subscription = original;
      if (subscription.customer_id !== account.customerId)
        throw new BillingError("Subscription customer mismatch.");
      if (deleting && subscription.status !== "canceled") {
        await paddleRequest(
          `/subscriptions/${subscription.id}/cancel`,
          "POST",
          { effective_from: "immediately" },
        );
        subscription = await getSubscription(subscription.id);
        if (subscription.status !== "canceled")
          throw new BillingError("Subscription cancellation is still pending.");
        subscriptions.set(subscriptionId, subscription);
      }
      if (deleting) continue;
      const query = new URLSearchParams({
        subscription_id: subscriptionId,
        status: "completed",
        per_page: "30",
      });
      for (const item of await paddleList(
        `/transactions?${query}`,
        transactionSchema,
      )) {
        const period = transactionPeriod(item);
        // Only currently relevant/future periods need refund reconciliation.
        if (!period || new Date(period.ends_at) > new Date()) {
          transactions.set(item.id, await getTransaction(item.id));
        }
      }
    }

    await withBillingAccount(id, async (tx) => {
      const current = await tx.billingAccount.findUniqueOrThrow({
        where: { id },
      });
      if (
        current.claimId !== claimId ||
        !!current.deletedAt !== !!account.deletedAt ||
        current.userId !== account.userId
      )
        return;

      for (const checkout of checkoutUpdates) {
        await tx.billingCheckout.update({
          where: { id: checkout.id },
          data: {
            transactionId: checkout.transactionId,
            closedAt: checkout.closed ? new Date() : null,
          },
        });
      }
      for (const subscription of subscriptions.values()) {
        if (
          subscription.items.length !== 1 ||
          subscription.items[0].quantity !== 1
        )
          throw new BillingError("Unexpected subscription items.");
        const existing = await tx.billingSubscription.findUnique({
          where: { id: subscription.id },
        });
        if (existing && existing.accountId !== id)
          throw new BillingError("Subscription identity mismatch.");
        const data = {
          accountId: id,
          customerId: subscription.customer_id,
          status: subscription.status,
          interval: intervalFor(subscription.items[0].price.id),
          nextBilledAt: subscription.next_billed_at
            ? new Date(subscription.next_billed_at)
            : null,
          cancelAt:
            subscription.scheduled_change?.action === "cancel"
              ? new Date(subscription.scheduled_change.effective_at)
              : null,
          updatedAt: new Date(subscription.updated_at),
        };
        if (!existing || existing.updatedAt <= data.updatedAt) {
          await tx.billingSubscription.upsert({
            where: { id: subscription.id },
            create: { id: subscription.id, ...data },
            update: data,
          });
        }
      }
      if (!deleting && current.userId) {
        for (const transaction of transactions.values()) {
          if (
            transaction.status !== "completed" ||
            !transaction.subscription_id
          )
            continue;
          if (
            !["api", "subscription_recurring", "subscription_update"].includes(
              transaction.origin,
            )
          )
            continue;
          supportedTransaction(transaction);
          const subscription = subscriptions.get(transaction.subscription_id);
          if (
            !subscription ||
            subscription.customer_id !== transaction.customer_id
          )
            throw new BillingError("Payment identity mismatch.");
          const period = transactionPeriod(transaction);
          if (!period)
            throw new BillingError("Payment period is not available yet.");
          const startsAt = new Date(period.starts_at);
          const expiresAt = new Date(period.ends_at);
          if (expiresAt <= startsAt)
            throw new BillingError("Invalid payment period.");
          const refunded = fullyRefunded(transaction);
          await tx.billingPayment.upsert({
            where: { id: transaction.id },
            create: {
              id: transaction.id,
              subscriptionId: subscription.id,
              startsAt,
              expiresAt,
              refunded,
            },
            update: { startsAt, expiresAt, refunded },
          });
          await tx.premiumGrant.upsert({
            where: { billingPaymentId: transaction.id },
            create: {
              billingPaymentId: transaction.id,
              userId: current.userId,
              startsAt,
              expiresAt,
              revokedAt: refunded ? new Date() : null,
            },
            update: {
              startsAt,
              expiresAt,
              revokedAt: refunded ? new Date() : null,
            },
          });
        }
      }
      await tx.billingAccount.update({
        where: { id },
        data: {
          claimId: null,
          leaseUntil: null,
          attempts: 0,
          lastSyncedAt: new Date(),
          nextSyncAt:
            current.revision !== account.revision
              ? new Date()
              : new Date(Date.now() + (deleting ? 86400000 : 15 * 60000)),
        },
      });
    });
    return true;
  } catch {
    const account = await prisma.billingAccount.findUnique({ where: { id } });
    await prisma.billingAccount.updateMany({
      where: { id, claimId },
      data: {
        claimId: null,
        leaseUntil: null,
        attempts: { increment: 1 },
        nextSyncAt: retryAt((account?.attempts ?? 0) + 1),
      },
    });
    return false;
  }
};

const resolveEventAccount = async (type: string, resourceId: string) => {
  let checkoutId: string | undefined;
  let subscriptionId: string | null = null;
  if (type.startsWith("subscription.")) {
    const subscription = await getSubscription(resourceId);
    checkoutId = subscription.custom_data?.wishlist_checkout;
    subscriptionId = subscription.id;
  } else {
    let transactionId = resourceId;
    if (type.startsWith("adjustment.")) {
      transactionId = z
        .object({ transaction_id: z.string().regex(/^txn_[a-z0-9]{26}$/) })
        .parse(
          (await paddleRequest(`/adjustments/${resourceId}`)).data,
        ).transaction_id;
    }
    const transaction = await getTransaction(transactionId);
    const known = await prisma.billingCheckout.findUnique({
      where: { transactionId },
    });
    if (known) return known.accountId;
    checkoutId = transaction.custom_data?.wishlist_checkout;
    subscriptionId = transaction.subscription_id;
  }
  if (subscriptionId) {
    const subscription = await prisma.billingSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (subscription) return subscription.accountId;
  }
  // Custom data only requests a reconciliation. It never grants access itself.
  const checkout = checkoutId
    ? await prisma.billingCheckout.findUnique({ where: { id: checkoutId } })
    : null;
  return checkout?.accountId ?? null;
};

export const reconcileBilling = async () => {
  if (!billingEnabled()) return { enabled: false, processed: 0, failed: 0 };
  let failed = 0;
  let processed = 0;
  const events = await prisma.billingEvent.findMany({
    where: { processedAt: null, nextAttemptAt: { lte: new Date() } },
    orderBy: { createdAt: "asc" },
    take: 20,
  });
  for (const event of events) {
    try {
      const accountId = await resolveEventAccount(event.type, event.resourceId);
      if (accountId) await queueBilling(accountId);
      await prisma.billingEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    } catch {
      await prisma.billingEvent.update({
        where: { id: event.id },
        data: {
          attempts: { increment: 1 },
          nextAttemptAt: retryAt(event.attempts + 1),
        },
      });
      failed++;
    }
  }
  const accounts = await prisma.billingAccount.findMany({
    where: {
      nextSyncAt: { lte: new Date() },
      OR: [{ leaseUntil: null }, { leaseUntil: { lte: new Date() } }],
    },
    orderBy: { nextSyncAt: "asc" },
    take: 5,
    select: { id: true },
  });
  for (const account of accounts) {
    if (await syncBillingAccount(account.id)) processed++;
    else failed++;
  }
  await prisma.billingEvent.deleteMany({
    where: { processedAt: { lt: new Date(Date.now() - 30 * 86400000) } },
  });
  return { enabled: true, processed, failed };
};
