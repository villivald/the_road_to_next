import { randomUUID } from "node:crypto";
import { z } from "zod";
import { consumeRateLimit } from "@/features/auth/service/security";
import { prisma } from "@/lib/prisma";
import {
  queueBilling,
  requireBillingUser,
  withBillingAccount,
} from "./accounts";
import { billingConfig, BillingError, type BillingInterval } from "./config";
import {
  getTransaction,
  paddleList,
  paddleRequest,
  PaddleRequestError,
  validatePrice,
} from "./paddle";

const customerSchema = z.object({
  id: z.string().regex(/^ctm_[a-z0-9]{26}$/),
  custom_data: z
    .object({ wishlist_account: z.string() })
    .nullable()
    .catch(null),
});

export const startCheckout = async (
  userId: string,
  sessionId: string,
  input: unknown,
) => {
  const interval = z.enum(["month", "year"]).parse(input);
  await consumeRateLimit("billing-checkout", userId, 10, 3600000);
  const priceId = await validatePrice(interval);
  const claimId = randomUUID();
  const prepared = await prisma.$transaction(async (tx) => {
    const user = await requireBillingUser(tx, userId, sessionId);
    const account = await tx.billingAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { subscriptions: true },
    });
    if (account.deletedAt)
      throw new BillingError("This billing account is closing.");
    if (account.leaseUntil && account.leaseUntil > new Date())
      throw new BillingError("Billing is updating. Please try again shortly.");
    if (
      account.subscriptions.some(
        (subscription) => subscription.status !== "canceled",
      )
    ) {
      throw new BillingError(
        "You already have a subscription. Use Manage subscription.",
      );
    }
    const paid = await tx.billingPayment.count({
      where: {
        subscription: { accountId: account.id },
        refunded: false,
        expiresAt: { gt: new Date() },
      },
    });
    if (paid)
      throw new BillingError(
        "Your paid period is still active. Subscribe again after it ends.",
      );
    const pending = await tx.billingCheckout.findFirst({
      where: { accountId: account.id, closedAt: null },
    });
    if (pending && (pending.interval !== interval || pending.cancelRequested))
      throw new BillingError("Finish or discard your existing checkout first.");
    if (pending && !pending.transactionId)
      throw new BillingError(
        "We are checking your previous checkout. Refresh billing shortly; do not start another payment.",
      );
    await tx.billingAccount.update({
      where: { id: account.id },
      data: { claimId, leaseUntil: new Date(Date.now() + 60000) },
    });
    return { account, pending, email: user.email };
  });

  const { account, pending, email } = prepared;
  try {
    if (pending?.transactionId) {
      const transaction = await getTransaction(pending.transactionId);
      if (!["draft", "ready"].includes(transaction.status)) {
        await queueBilling(account.id);
        throw new BillingError(
          "This checkout is processing or finished. Refresh billing shortly.",
        );
      }
      return pending.id;
    }

    let customerId = account.customerId;
    if (!customerId) {
      const customers = await paddleList(
        `/customers?email=${encodeURIComponent(email)}`,
        customerSchema,
      );
      const existing = customers[0];
      if (
        customers.length > 1 ||
        (existing && existing.custom_data?.wishlist_account !== account.id)
      ) {
        throw new BillingError(
          "This billing email is already associated with another account. Contact support.",
        );
      }
      customerId =
        existing?.id ??
        customerSchema.parse(
          (
            await paddleRequest("/customers", "POST", {
              email,
              custom_data: { wishlist_account: account.id },
            })
          ).data,
        ).id;
    }

    const checkout = await prisma.$transaction(async (tx) => {
      await requireBillingUser(tx, userId, sessionId);
      const current = await tx.billingAccount.findUniqueOrThrow({
        where: { id: account.id },
      });
      if (current.deletedAt || current.claimId !== claimId)
        throw new BillingError("Billing changed. Please try again.");
      await tx.billingAccount.update({
        where: { id: account.id },
        data: { customerId },
      });
      // Commit dispatch intent before the non-idempotent provider POST.
      return tx.billingCheckout.create({
        data: {
          accountId: account.id,
          interval,
          priceId,
          dispatchedAt: new Date(),
        },
      });
    });
    let response: Awaited<ReturnType<typeof paddleRequest>>;
    try {
      response = await paddleRequest("/transactions", "POST", {
        items: [{ price_id: priceId, quantity: 1 }],
        customer_id: customerId,
        currency_code: "EUR",
        collection_mode: "automatic",
        custom_data: { wishlist_checkout: checkout.id },
        checkout: { url: null },
      });
    } catch (error) {
      // A definite rejection created no transaction. Unknown outcomes must
      // remain open for reconciliation rather than risk a duplicate payment.
      if (error instanceof PaddleRequestError && error.rejected) {
        await withBillingAccount(account.id, async (tx) => {
          await tx.billingCheckout.updateMany({
            where: {
              id: checkout.id,
              transactionId: null,
              closedAt: null,
            },
            data: { closedAt: new Date() },
          });
        });
      }
      throw error;
    }
    const transaction = z
      .object({ id: z.string().regex(/^txn_[a-z0-9]{26}$/) })
      .parse(response.data);
    await withBillingAccount(account.id, async (tx) => {
      await tx.billingCheckout.update({
        where: { id: checkout.id },
        data: { transactionId: transaction.id },
      });
    });
    return checkout.id;
  } finally {
    await prisma.billingAccount.updateMany({
      where: { id: account.id, claimId },
      data: { claimId: null, leaseUntil: null, nextSyncAt: new Date() },
    });
  }
};

export const discardCheckout = async (userId: string, sessionId: string) => {
  const account = await prisma.$transaction(async (tx) => {
    await requireBillingUser(tx, userId, sessionId);
    const account = await tx.billingAccount.findUnique({ where: { userId } });
    if (account)
      await tx.billingCheckout.updateMany({
        where: { accountId: account.id, closedAt: null },
        data: { cancelRequested: true },
      });
    return account;
  });
  if (account) await queueBilling(account.id);
};

export const checkoutDetails = async (
  userId: string,
  checkoutId?: string,
  transactionId?: string,
) => {
  const checkout = await prisma.billingCheckout.findFirst({
    where: {
      ...(checkoutId
        ? { id: checkoutId }
        : { transactionId: transactionId ?? "invalid" }),
      account: { userId, deletedAt: null },
      closedAt: null,
      cancelRequested: false,
    },
  });
  if (!checkout?.transactionId) return null;
  const transaction = await getTransaction(checkout.transactionId);
  if (!["draft", "ready"].includes(transaction.status)) return null;
  const stillOpen = await prisma.billingCheckout.count({
    where: {
      id: checkout.id,
      account: { userId, deletedAt: null },
      closedAt: null,
      cancelRequested: false,
    },
  });
  if (!stillOpen) return null;
  return {
    transactionId: checkout.transactionId,
    clientToken: billingConfig().clientToken,
    interval: checkout.interval as BillingInterval,
  };
};

export const portalLink = async (
  userId: string,
  sessionId: string,
  subscriptionId: string,
) => {
  const subscription = await prisma.$transaction(async (tx) => {
    await requireBillingUser(tx, userId, sessionId);
    return tx.billingSubscription.findFirst({
      where: { id: subscriptionId, account: { userId, deletedAt: null } },
    });
  });
  if (!subscription) throw new BillingError("Subscription unavailable.");
  const result = z
    .object({ urls: z.object({ general: z.object({ overview: z.url() }) }) })
    .parse(
      (
        await paddleRequest(
          `/customers/${encodeURIComponent(subscription.customerId)}/portal-sessions`,
          "POST",
          { subscription_ids: [subscription.id] },
        )
      ).data,
    );
  const url = new URL(result.urls.general.overview);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "sandbox-customer-portal.paddle.com"
  )
    throw new BillingError("Invalid customer portal response.");
  await prisma.$transaction(async (tx) => {
    await requireBillingUser(tx, userId, sessionId);
  });
  return url.href;
};
