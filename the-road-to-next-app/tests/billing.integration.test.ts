import { createHmac } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { POST } from "@/app/api/paddle/webhook/route";
import {
  deleteAccount,
  readDeletionImpact,
} from "@/features/account/service/account";
import { authenticate } from "@/features/auth/service/accounts";
import {
  checkoutDetails,
  discardCheckout,
  portalLink,
  startCheckout,
} from "@/features/billing/service/checkout";
import {
  reconcileBilling,
  syncBillingAccount,
} from "@/features/billing/service/sync";
import { acceptWebhook } from "@/features/billing/service/webhook";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { issuePromo, redeemPromo } from "@/features/premium/service/promotions";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import {
  completePayment,
  emptyPaddleState,
  paddleEnvironment,
  paddleFixtureResponse,
  type PaddleState,
} from "../e2e/paddle-fixture";
import { accounts, resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
let state: PaddleState;
beforeEach(async () => {
  await resetFixtures();
  state = emptyPaddleState();
  Object.entries(paddleEnvironment).forEach(([key, value]) =>
    vi.stubEnv(key, value),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) =>
      paddleFixtureResponse(state, new URL(String(input)), init),
    ),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
afterAll(async () => {
  await resetFixtures();
  await prisma.$disconnect();
});
const login = () => authenticate(accounts.owner.email, accounts.owner.password);
const begin = async (interval = "month") => {
  const { user, session } = await login();
  const checkoutId = await startCheckout(user.id, session.id, interval);
  const checkout = await prisma.billingCheckout.findUniqueOrThrow({
    where: { id: checkoutId },
  });
  return { user, session, checkout };
};
const paid = async () => {
  const result = await begin();
  completePayment(state, result.checkout.transactionId!);
  expect(await syncBillingAccount(result.checkout.accountId)).toBe(true);
  return result;
};
const event = async (
  resourceId: string,
  type = "transaction.completed",
  suffix = "1",
) => {
  const body = Buffer.from(
    JSON.stringify({
      event_id: `evt_${suffix.padStart(26, "0")}`,
      event_type: type,
      data: { id: resourceId, email: "should-not-be-stored@example.test" },
    }),
  );
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac(
    "sha256",
    paddleEnvironment.PADDLE_WEBHOOK_SECRET,
  )
    .update(`${timestamp}:`)
    .update(body)
    .digest("hex");
  return acceptWebhook(body, `ts=${timestamp};h1=${signature}`);
};

describe("Paddle subscriptions", () => {
  it("binds checkout to the verified account, trusts only server prices and does not grant on return", async () => {
    const { user, session, checkout } = await begin("year");
    expect(state.customers[0].email).toBe(accounts.owner.email);
    expect(state.transactions[0].items[0].price.id).toBe(
      paddleEnvironment.PADDLE_ANNUAL_PRICE_ID,
    );
    expect((await readPremiumAccess(user.id)).plan).toBe("FREE");
    expect(await checkoutDetails("e2e-member", checkout.id)).toBeNull();
    await expect(startCheckout(user.id, "revoked", "month")).rejects.toThrow(
      "session",
    );
    await expect(startCheckout(user.id, session.id, "cheap")).rejects.toThrow();
    await expect(
      portalLink("e2e-member", session.id, "sub_forged"),
    ).rejects.toThrow();
    expect(await prisma.premiumGrant.count()).toBe(0);
  });
  it("serializes concurrent checkout requests and resumes the same transaction", async () => {
    const { user, session } = await login();
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () =>
        startCheckout(user.id, session.id, "month"),
      ),
    );
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    expect(state.createCount).toBe(1);
    expect(await prisma.billingCheckout.count()).toBe(1);
    await startCheckout(user.id, session.id, "month");
    expect(state.createCount).toBe(1);
  });
  it("recovers an ambiguous transaction creation without creating another charge", async () => {
    state.loseCreateResponse = true;
    const { user, session } = await login();
    await expect(startCheckout(user.id, session.id, "month")).rejects.toThrow(
      "Paddle",
    );
    const checkout = await prisma.billingCheckout.findFirstOrThrow();
    expect(checkout.transactionId).toBeNull();
    await expect(startCheckout(user.id, session.id, "month")).rejects.toThrow(
      "previous checkout",
    );
    state.loseCreateResponse = false;
    expect(await syncBillingAccount(checkout.accountId)).toBe(true);
    expect(await startCheckout(user.id, session.id, "month")).toBe(checkout.id);
    expect(state.createCount).toBe(1);
  });
  it("deduplicates signed events, stores no payload PII, and reconciles current provider state", async () => {
    const { user, checkout } = await begin();
    completePayment(state, checkout.transactionId!);
    expect(await event(checkout.transactionId!)).toBe(200);
    expect(await event(checkout.transactionId!)).toBe(200);
    expect(await prisma.billingEvent.count()).toBe(1);
    expect(JSON.stringify(await prisma.billingEvent.findMany())).not.toContain(
      "should-not-be-stored",
    );
    expect((await reconcileBilling()).processed).toBe(1);
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
    expect(await prisma.premiumGrant.count()).toBe(1);
    await event(checkout.transactionId!, "transaction.created", "2");
    await reconcileBilling();
    expect(await prisma.premiumGrant.count()).toBe(1);
  });
  it("keeps promo access independent, appends new promo days, and revokes only fully refunded payment access", async () => {
    const { user, session, checkout } = await paid();
    const paidUntil = (await readPremiumAccess(user.id)).expiresAt!;
    const code = await issuePromo({
      label: "e2e-billing",
      durationDays: 5,
      validForDays: 7,
      maxRedemptions: 1,
    });
    const promo = await redeemPromo(user.id, session.id, code.code);
    expect(promo.expiresAt.getTime()).toBe(paidUntil.getTime() + 5 * 86400000);
    state.transactions[0].adjustments = [
      { action: "refund", status: "approved", totals: { total: "100" } },
    ];
    await syncBillingAccount(checkout.accountId);
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
    state.transactions[0].adjustments.push({
      action: "refund",
      status: "approved",
      totals: { total: "100" },
    });
    await syncBillingAccount(checkout.accountId);
    expect(await readPremiumAccess(user.id)).toMatchObject({
      plan: "FREE",
      nextStartsAt: paidUntil,
    });
    expect(
      await prisma.premiumGrant.count({
        where: { promoRedemptionId: { not: null }, revokedAt: null },
      }),
    ).toBe(1);
  });
  it("scheduled cancellation preserves paid access; past-due renewals grant no extra period", async () => {
    const { user, checkout } = await paid();
    const until = (await readPremiumAccess(user.id)).expiresAt;
    state.subscriptions[0].scheduled_change = {
      action: "cancel",
      effective_at: until!.toISOString(),
    };
    state.subscriptions[0].updated_at = new Date(
      Date.now() + 1000,
    ).toISOString();
    await syncBillingAccount(checkout.accountId);
    expect(
      (await prisma.billingSubscription.findFirstOrThrow()).cancelAt,
    ).toEqual(until);
    state.subscriptions[0].status = "past_due";
    state.transactions.push({
      ...state.transactions[0],
      id: `txn_${"r".repeat(26)}`,
      origin: "subscription_recurring",
      status: "past_due",
    });
    await syncBillingAccount(checkout.accountId);
    expect((await readPremiumAccess(user.id)).expiresAt).toEqual(until);
    expect(await prisma.premiumGrant.count()).toBe(1);
  });
  it("a completed renewal extends access, with no duplicate grant on replay", async () => {
    const { user, checkout } = await paid();
    const until = (await readPremiumAccess(user.id)).expiresAt!;
    const end = new Date(until.getTime() + 30 * 86400000);
    state.transactions.push({
      ...state.transactions[0],
      id: `txn_${"r".repeat(26)}`,
      origin: "subscription_recurring",
      billing_period: {
        starts_at: until.toISOString(),
        ends_at: end.toISOString(),
      },
    });
    await syncBillingAccount(checkout.accountId);
    await syncBillingAccount(checkout.accountId);
    expect((await readPremiumAccess(user.id)).expiresAt).toEqual(end);
    expect(await prisma.premiumGrant.count()).toBe(2);
  });
  it("deletes the account during a provider outage and durably retries cancellation", async () => {
    const { user, session, checkout } = await paid();
    const impact = await readDeletionImpact(user.id);
    expect(impact.subscriptionCount).toBe(1);
    state.fail = true;
    await deleteAccount(user.id, session.id, {
      password: accounts.owner.password,
      confirmation: "DELETE",
      impactToken: impact.impactToken,
    });
    expect(await prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(
      await prisma.billingAccount.findUnique({
        where: { id: checkout.accountId },
      }),
    ).toMatchObject({ userId: null, attempts: 1 });
    expect(state.subscriptions[0].status).toBe("active");
    state.fail = false;
    await syncBillingAccount(checkout.accountId);
    expect(state.subscriptions[0].status).toBe("canceled");
    expect(await prisma.premiumGrant.count()).toBe(0);
  });
  it("cancels a payment completed after account deletion without recreating access", async () => {
    const { user, session, checkout } = await begin();
    state.fail = true;
    const impact = await readDeletionImpact(user.id);
    await deleteAccount(user.id, session.id, {
      password: accounts.owner.password,
      confirmation: "DELETE",
      impactToken: impact.impactToken,
    });
    completePayment(state, checkout.transactionId!);
    state.fail = false;
    await syncBillingAccount(checkout.accountId);
    expect(state.subscriptions[0].status).toBe("canceled");
    expect(await prisma.premiumGrant.count()).toBe(0);
  });
  it("rejects customer substitution and foreign customer portal ownership", async () => {
    const { user, session, checkout } = await begin();
    completePayment(state, checkout.transactionId!);
    state.transactions[0].customer_id = `ctm_${"x".repeat(26)}`;
    expect(await syncBillingAccount(checkout.accountId)).toBe(false);
    expect((await readPremiumAccess(user.id)).plan).toBe("FREE");
    await expect(
      portalLink(user.id, session.id, state.subscriptions[0].id),
    ).rejects.toThrow("unavailable");
  });
  it("discards pending checkouts before allowing another plan", async () => {
    const { user, session, checkout } = await begin();
    await expect(startCheckout(user.id, session.id, "year")).rejects.toThrow(
      "existing checkout",
    );
    await discardCheckout(user.id, session.id);
    await syncBillingAccount(checkout.accountId);
    expect(state.transactions[0].status).toBe("canceled");
    await startCheckout(user.id, session.id, "year");
    expect(state.createCount).toBe(2);
  });
  it("rejects unsigned and oversized webhook requests", async () => {
    const request = (body: string) =>
      new Request("http://localhost/api/paddle/webhook", {
        method: "POST",
        body,
      });
    expect((await POST(request("{}"))).status).toBe(401);
    expect((await POST(request("x".repeat(262145)))).status).toBe(413);
    expect(await prisma.billingEvent.count()).toBe(0);
  });
  it("retries failed webhook resolution after a provider outage", async () => {
    const { checkout } = await begin();
    completePayment(state, checkout.transactionId!);
    await event(checkout.transactionId!);
    state.fail = true;
    expect((await reconcileBilling()).failed).toBeGreaterThan(0);
    expect(
      (await prisma.billingEvent.findFirstOrThrow()).processedAt,
    ).toBeNull();
    state.fail = false;
    await prisma.billingEvent.updateMany({
      data: { nextAttemptAt: new Date(0) },
    });
    await prisma.billingAccount.updateMany({
      data: { nextSyncAt: new Date(0) },
    });
    expect((await reconcileBilling()).failed).toBe(0);
    expect((await readPremiumAccess("e2e-owner")).plan).toBe("PREMIUM");
  });

  it("revoked sessions cannot receive a portal link after an in-flight API request", async () => {
    const { user, session } = await paid();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/portal-sessions"))
          await prisma.session.deleteMany({ where: { userId: user.id } });
        return paddleFixtureResponse(state, url, init);
      }),
    );
    await expect(
      portalLink(user.id, session.id, state.subscriptions[0].id),
    ).rejects.toThrow("session");
  });

  it("account deletion invalidates a concurrent grant synchronization", async () => {
    const { user, session, checkout } = await begin();
    completePayment(state, checkout.transactionId!);
    let notify: () => void = () => {};
    let release: () => void = () => {};
    const started = new Promise<void>((resolve) => {
      notify = resolve;
    });
    const finish = new Promise<void>((resolve) => {
      release = resolve;
    });
    let first = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input));
        if (first && url.pathname.startsWith("/transactions/")) {
          first = false;
          notify();
          await finish;
        }
        return paddleFixtureResponse(state, url, init);
      }),
    );
    const syncing = syncBillingAccount(checkout.accountId);
    await started;
    const impact = await readDeletionImpact(user.id);
    await deleteAccount(user.id, session.id, {
      password: accounts.owner.password,
      confirmation: "DELETE",
      impactToken: impact.impactToken,
    });
    release();
    await syncing;
    expect(await prisma.premiumGrant.count()).toBe(0);
    expect(state.subscriptions[0].status).toBe("canceled");
  });
});
