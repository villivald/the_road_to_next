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
import { POST as POSTLive } from "@/app/api/paddle/live/webhook/route";
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
import { readBillingOverview } from "@/features/billing/service/overview";
import {
  reconcileBilling,
  syncBillingAccount,
} from "@/features/billing/service/sync";
import { acceptWebhook } from "@/features/billing/service/webhook";
import { discoverUsers } from "@/features/discovery/service/discovery";
import { readFavorites } from "@/features/favorites/service/favorites";
import { deliverAccountEmails } from "@/features/notifications/service/delivery";
import { readPremiumAccess } from "@/features/premium/service/entitlements";
import { issuePromo, redeemPromo } from "@/features/premium/service/promotions";
import { backgroundEvents } from "@/lib/background-events";
import { inngest } from "@/lib/inngest";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import {
  completePayment,
  emptyPaddleState,
  livePaddleEnvironment as liveEnvironment,
  paddleEnvironment,
  paddleFixtureResponse,
  type PaddleState,
} from "../e2e/paddle-fixture";
import { accounts, resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
const postResponse = vi.hoisted(() => ({
  callbacks: [] as (() => void | Promise<void>)[],
}));
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => void | Promise<void>) =>
    postResponse.callbacks.push(callback),
}));
let state: PaddleState;
beforeEach(async () => {
  postResponse.callbacks.length = 0;
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

const useLive = () => {
  const live = {
    ...emptyPaddleState(),
    idNamespace: "l",
    environment: liveEnvironment,
  };
  Object.entries(paddleEnvironment)
    .filter(([key]) => key !== "PADDLE_ENVIRONMENT")
    .forEach(([key, value]) =>
      vi.stubEnv(key.replace("PADDLE_", "PADDLE_SANDBOX_"), value),
    );
  Object.entries(liveEnvironment).forEach(([key, value]) =>
    vi.stubEnv(key, value),
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      const sandbox = url.origin === "https://sandbox-api.paddle.com";
      if (!sandbox && url.origin !== "https://api.paddle.com")
        throw new Error("Unexpected provider host");
      expect(new Headers(init?.headers).get("Authorization")).toBe(
        `Bearer ${sandbox ? paddleEnvironment.PADDLE_API_KEY : liveEnvironment.PADDLE_API_KEY}`,
      );
      return paddleFixtureResponse(sandbox ? state : live, url, init);
    }),
  );
  return live;
};

describe("Paddle live environment isolation", () => {
  it.each(["sandbox", "live"])(
    "delivers the Premium guide for a payment in the active %s environment",
    async (environment) => {
      const provider = environment === "live" ? useLive() : state;
      const { checkout } = await begin();
      completePayment(provider, checkout.transactionId!);
      expect(await syncBillingAccount(checkout.accountId)).toBe(true);
      const email = await prisma.accountEmail.findFirstOrThrow();
      const transport = vi.fn<typeof fetch>(async () => new Response(null));
      vi.stubGlobal("fetch", transport);
      expect(await deliverAccountEmails(email.id)).toEqual({
        sent: 1,
        failed: 0,
        canceled: 0,
      });
      expect(transport).toHaveBeenCalledOnce();
      expect(String(transport.mock.calls[0][0])).toBe(
        `${process.env.MAILPIT_URL}/api/v1/send`,
      );
    },
  );

  it("keeps discovery and favorite-person badges aligned with active-environment access", async () => {
    const { user } = await paid();
    await prisma.user.update({
      where: { id: user.id },
      data: { showPremiumBadge: true },
    });
    await prisma.wishlist.create({
      data: {
        id: "e2e-billing-public-list",
        title: "Public fixture list",
        ownerId: user.id,
        publication: "PUBLISHED",
        visibility: "PUBLIC",
        memberships: { create: { userId: user.id, role: "ADMIN" } },
      },
    });
    await prisma.favoritePerson.create({
      data: { userId: "e2e-member", personId: user.id },
    });
    const badges = async () => [
      (await discoverUsers({})).users.find(
        (person) => person.username === user.username,
      )?.showPremiumBadge,
      (await readFavorites("e2e-member", { view: "people" })).people?.find(
        (person) => person.username === user.username,
      )?.showPremiumBadge,
    ];
    expect(await badges()).toEqual([true, true]);
    useLive();
    expect((await readPremiumAccess(user.id)).plan).toBe("FREE");
    expect(await badges()).toEqual([false, false]);
    await prisma.premiumGrant.create({
      data: {
        userId: user.id,
        startsAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
    expect(await badges()).toEqual([true, true]);
  });

  it.each(["live", ""])(
    "cancels a queued sandbox Premium guide when the active environment becomes %s",
    async (environment) => {
      await paid();
      const email = await prisma.accountEmail.findFirstOrThrow();
      vi.stubEnv("PADDLE_ENVIRONMENT", environment);
      const transport = vi.fn<typeof fetch>();
      vi.stubGlobal("fetch", transport);
      expect(await deliverAccountEmails(email.id)).toEqual({
        sent: 0,
        failed: 0,
        canceled: 1,
      });
      expect(transport).not.toHaveBeenCalled();
      expect(
        await prisma.accountEmail.findUniqueOrThrow({
          where: { id: email.id },
        }),
      ).toMatchObject({
        sentAt: null,
        canceledAt: expect.any(Date),
        html: "",
        text: "",
      });
    },
  );

  it("restricts starting and resuming live checkout to configured testers", async () => {
    useLive();
    const { user, session } = await login();
    vi.stubEnv("PADDLE_CHECKOUT_TESTER_IDS", "other-tester");
    await expect(startCheckout(user.id, session.id, "month")).rejects.toThrow(
      "temporarily unavailable",
    );
    expect(await prisma.billingAccount.count()).toBe(0);
    vi.stubEnv("PADDLE_CHECKOUT_TESTER_IDS", ` other-tester, ${user.id} `);
    const checkoutId = await startCheckout(user.id, session.id, "month");
    expect(await checkoutDetails(user.id, checkoutId)).not.toBeNull();
    vi.stubEnv("PADDLE_CHECKOUT_TESTER_IDS", "other-tester");
    await expect(checkoutDetails(user.id, checkoutId)).rejects.toThrow(
      "temporarily unavailable",
    );
  });

  it("accepts a live HTTP webhook only from an allowed edge source with the live signature", async () => {
    useLive();
    vi.stubEnv("VERCEL", "1");
    const providerFetch = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL, init?: RequestInit) =>
        String(input) === "https://api.paddle.com/ips"
          ? Response.json({ data: { ipv4_cidrs: ["192.0.2.50/32"] } })
          : providerFetch(input, init),
      ),
    );
    const id = `evt_${"l".repeat(26)}`;
    const body = JSON.stringify({
      event_id: id,
      event_type: "transaction.completed",
      data: { id: `txn_${"l".repeat(26)}` },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const request = (address: string, secret: string) =>
      new Request(`${process.env.APP_URL}/api/paddle/live/webhook`, {
        method: "POST",
        body,
        headers: {
          "x-vercel-forwarded-for": address,
          "paddle-signature": `ts=${timestamp};h1=${createHmac("sha256", secret).update(`${timestamp}:${body}`).digest("hex")}`,
        },
      });
    expect(
      (
        await POSTLive(
          request("192.0.2.51", liveEnvironment.PADDLE_WEBHOOK_SECRET),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POSTLive(
          request("192.0.2.50", paddleEnvironment.PADDLE_WEBHOOK_SECRET),
        )
      ).status,
    ).toBe(401);
    expect(await prisma.billingEvent.count()).toBe(0);
    expect(
      (
        await POSTLive(
          request("192.0.2.50", liveEnvironment.PADDLE_WEBHOOK_SECRET),
        )
      ).status,
    ).toBe(200);
    expect(
      await prisma.billingEvent.findUniqueOrThrow({ where: { id } }),
    ).toMatchObject({ environment: "live", processedAt: null });
    expect(postResponse.callbacks).toHaveLength(1);
  });

  it("fails closed when a live provider resource collides with sandbox history", async () => {
    const sandbox = await paid();
    const sourceSubscription = state.subscriptions[0].id;
    const live = useLive();
    const current = await begin();
    completePayment(live, current.checkout.transactionId!);
    live.subscriptions[0].id = sourceSubscription;
    live.transactions[0].subscription_id = sourceSubscription;
    expect(await syncBillingAccount(current.checkout.accountId)).toBe(false);
    expect((await readPremiumAccess(current.user.id)).plan).toBe("FREE");
    expect(await prisma.billingPayment.count()).toBe(1);
    expect(
      await prisma.billingSubscription.findUniqueOrThrow({
        where: { id: sourceSubscription },
      }),
    ).toMatchObject({ accountId: sandbox.checkout.accountId });
  });

  it("preserves sandbox history while separating live checkout, portal, access and refunds", async () => {
    const sandbox = await paid();
    const live = useLive();
    expect((await readPremiumAccess(sandbox.user.id)).plan).toBe("FREE");
    expect((await readBillingOverview(sandbox.user.id)).account).toBeNull();
    expect(
      await checkoutDetails(sandbox.user.id, sandbox.checkout.id),
    ).toBeNull();
    await expect(
      portalLink(
        sandbox.user.id,
        sandbox.session.id,
        state.subscriptions[0].id,
      ),
    ).rejects.toThrow();
    const result = await begin();
    expect(
      await prisma.billingAccount.count({ where: { userId: result.user.id } }),
    ).toBe(2);
    expect(
      await checkoutDetails(result.user.id, result.checkout.id),
    ).toMatchObject({
      environment: "live",
      customerId: live.customers[0].id,
    });
    completePayment(live, result.checkout.transactionId!);
    expect(await syncBillingAccount(result.checkout.accountId)).toBe(true);
    expect((await readPremiumAccess(result.user.id)).plan).toBe("PREMIUM");
    expect(
      new URL(
        await portalLink(
          result.user.id,
          result.session.id,
          live.subscriptions[0].id,
        ),
      ).hostname,
    ).toBe("customer-portal.paddle.com");
    live.transactions[0].adjustments = [
      { action: "refund", status: "approved", totals: { total: "200" } },
    ];
    expect(await syncBillingAccount(result.checkout.accountId)).toBe(true);
    expect((await readPremiumAccess(result.user.id)).plan).toBe("FREE");
    expect(await prisma.billingPayment.count()).toBe(2);
    expect(
      (
        await prisma.billingAccount.findUniqueOrThrow({
          where: { id: sandbox.checkout.accountId },
        })
      ).environment,
    ).toBe("sandbox");
  });

  it("keeps active non-billing Premium grants when the active billing environment changes", async () => {
    const { user } = await login();
    await prisma.premiumGrant.create({
      data: {
        userId: user.id,
        startsAt: new Date(Date.now() - 1000),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    useLive();
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
    vi.stubEnv("PADDLE_ENVIRONMENT", "");
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
  });

  it("pauses new live checkouts while preserving paid access, recovery and customer management", async () => {
    const live = useLive();
    const result = await begin();
    completePayment(live, result.checkout.transactionId!);
    expect(await syncBillingAccount(result.checkout.accountId)).toBe(true);
    vi.stubEnv("PADDLE_CHECKOUT_ENABLED", "0");
    await expect(
      startCheckout(result.user.id, result.session.id, "year"),
    ).rejects.toThrow("temporarily unavailable");
    expect((await readPremiumAccess(result.user.id)).plan).toBe("PREMIUM");
    expect(await syncBillingAccount(result.checkout.accountId)).toBe(true);
    expect(
      await portalLink(
        result.user.id,
        result.session.id,
        live.subscriptions[0].id,
      ),
    ).toContain("https://customer-portal.paddle.com/");
  });

  it("recovers a saved sandbox event with sandbox credentials after the UI switches to live", async () => {
    const sandbox = await begin();
    completePayment(state, sandbox.checkout.transactionId!);
    await event(sandbox.checkout.transactionId!);
    useLive();
    expect((await reconcileBilling()).failed).toBe(0);
    expect(
      (await prisma.billingEvent.findFirstOrThrow()).processedAt,
    ).not.toBeNull();
    expect(await prisma.billingPayment.count()).toBe(1);
    expect((await readPremiumAccess(sandbox.user.id)).plan).toBe("FREE");
    expect(
      await prisma.billingAccount.count({ where: { environment: "live" } }),
    ).toBe(0);
  });

  it("does not process a legacy environment when its own credentials are missing", async () => {
    const sandbox = await begin();
    completePayment(state, sandbox.checkout.transactionId!);
    await event(sandbox.checkout.transactionId!);
    useLive();
    vi.stubEnv("PADDLE_SANDBOX_API_KEY", "");
    expect(await syncBillingAccount(sandbox.checkout.accountId)).toBe(false);
    await reconcileBilling();
    expect(
      (await prisma.billingEvent.findFirstOrThrow()).processedAt,
    ).toBeNull();
    expect(await prisma.billingPayment.count()).toBe(0);
  });

  it("cancels both environments after account deletion without mixing credentials", async () => {
    await paid();
    const live = useLive();
    const result = await begin();
    completePayment(live, result.checkout.transactionId!);
    expect(await syncBillingAccount(result.checkout.accountId)).toBe(true);
    const impact = await readDeletionImpact(result.user.id);
    expect(impact.subscriptionCount).toBe(2);
    await deleteAccount(result.user.id, result.session.id, {
      password: accounts.owner.password,
      confirmation: "DELETE",
      impactToken: impact.impactToken,
    });
    expect(state.subscriptions[0].status).toBe("canceled");
    expect(live.subscriptions[0].status).toBe("canceled");
    expect(
      await prisma.billingAccount.count({
        where: { userId: null, deletedAt: { not: null } },
      }),
    ).toBe(2);
  });

  it("rejects live simulator events and sandbox signatures on the live receiver", async () => {
    useLive();
    const signed = (prefix: string, secret: string) => {
      const body = Buffer.from(
        JSON.stringify({
          event_id: `${prefix}_${"1".repeat(26)}`,
          event_type: "transaction.completed",
          data: { id: `txn_${"1".repeat(26)}` },
        }),
      );
      const ts = Math.floor(Date.now() / 1000);
      return {
        body,
        signature: `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:`).update(body).digest("hex")}`,
      };
    };
    const wrong = signed("evt", paddleEnvironment.PADDLE_WEBHOOK_SECRET);
    expect(
      await acceptWebhook(wrong.body, wrong.signature, () => {}, "live"),
    ).toBe(401);
    const simulated = signed(
      "ntfsimevt",
      liveEnvironment.PADDLE_WEBHOOK_SECRET,
    );
    expect(
      await acceptWebhook(
        simulated.body,
        simulated.signature,
        () => {},
        "live",
      ),
    ).toBe(400);
    expect(await prisma.billingEvent.count()).toBe(0);
  });
});
const event = async (
  resourceId: string,
  type = "transaction.completed",
  suffix = "1",
  throughRoute = false,
  prefix = "evt",
) => {
  const body = Buffer.from(
    JSON.stringify({
      event_id: `${prefix}_${suffix.padStart(26, "0")}`,
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
  const header = `ts=${timestamp};h1=${signature}`;
  if (throughRoute)
    return (
      await POST(
        new Request(`${process.env.APP_URL}/api/paddle/webhook`, {
          method: "POST",
          headers: { "paddle-signature": header },
          body: body.toString("utf8"),
        }),
      )
    ).status;
  return acceptWebhook(body, header);
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
    expect(await prisma.accountEmail.count()).toBe(0);
  });
  it.each(["month", "year"])(
    "queues a %s Premium guide only after a confirmed first payment",
    async (interval) => {
      await prisma.user.update({
        where: { id: "e2e-owner" },
        data: { locale: "fi" },
      });
      const { checkout, user } = await begin(interval);
      expect(await prisma.accountEmail.count()).toBe(0);
      completePayment(state, checkout.transactionId!);
      await syncBillingAccount(checkout.accountId);
      await syncBillingAccount(checkout.accountId);
      const emails = await prisma.accountEmail.findMany({
        where: { userId: user.id },
      });
      expect(emails).toHaveLength(1);
      expect(emails[0]).toMatchObject({
        recipient: accounts.owner.email,
        subject: "Tervetuloa Premiumin käyttäjäksi",
        sentAt: null,
      });
      expect(emails[0].text).toContain(
        interval === "year" ? "Vuositilaus" : "Kuukausitilaus",
      );
      expect(emails[0].html).toContain('lang="fi"');
      expect(inngest.send).toHaveBeenCalledExactlyOnceWith([
        {
          name: backgroundEvents.accountEmail,
          id: `${backgroundEvents.accountEmail}/${emails[0].id}`,
          data: { id: emails[0].id },
        },
      ]);
    },
  );
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
  it.each(["completed", "canceled"])(
    "returns an owned %s checkout to billing status without starting another payment",
    async (status) => {
      const { user, checkout } = await begin();
      if (status === "completed")
        completePayment(state, checkout.transactionId!);
      else state.transactions[0].status = "canceled";
      expect(await checkoutDetails(user.id, checkout.id)).toEqual({
        state: "return",
      });
      expect(await syncBillingAccount(checkout.accountId)).toBe(true);
      expect(await checkoutDetails(user.id, checkout.id)).toEqual({
        state: "return",
      });
      expect(await checkoutDetails("e2e-member", checkout.id)).toBeNull();
      expect(await checkoutDetails(user.id, "missing")).toBeNull();
      expect(state.createCount).toBe(1);
      expect(await prisma.premiumGrant.count()).toBe(
        status === "completed" ? 1 : 0,
      );
    },
  );
  it.each([400, 403, 422])(
    "closes a checkout rejected with HTTP %s so the user can retry after fixing configuration",
    async (status) => {
      const { user, session } = await login();
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL, init?: RequestInit) => {
          const url = new URL(String(input));
          if (url.pathname === "/transactions" && init?.method === "POST") {
            return Response.json(
              { error: { code: "invalid_request" } },
              { status },
            );
          }
          return paddleFixtureResponse(state, url, init);
        }),
      );
      await expect(startCheckout(user.id, session.id, "month")).rejects.toThrow(
        "Paddle",
      );
      const rejected = await prisma.billingCheckout.findFirstOrThrow();
      expect(rejected.closedAt).not.toBeNull();
      expect(rejected.transactionId).toBeNull();
      expect(state.transactions).toHaveLength(0);

      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string | URL, init?: RequestInit) =>
          paddleFixtureResponse(state, new URL(String(input)), init),
        ),
      );
      const checkoutId = await startCheckout(user.id, session.id, "month");
      expect(checkoutId).not.toBe(rejected.id);
      expect(state.createCount).toBe(1);
      expect(await readPremiumAccess(user.id)).toMatchObject({ plan: "FREE" });
    },
  );
  it("uses Paddle's default payment link instead of an unapproved app URL", async () => {
    vi.stubEnv("APP_URL", "https://unapproved.example.test");
    const transport = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.pathname === "/transactions" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        if (body.checkout?.url !== null) {
          return Response.json(
            {
              error: {
                code: "transaction_checkout_url_domain_is_not_approved",
              },
            },
            { status: 400 },
          );
        }
      }
      return paddleFixtureResponse(state, url, init);
    });
    vi.stubGlobal("fetch", transport);
    const { checkout } = await begin();
    expect(checkout.transactionId).not.toBeNull();
    expect(state.createCount).toBe(1);
    const request = transport.mock.calls.find(
      ([input, init]) =>
        new URL(String(input)).pathname === "/transactions" &&
        init?.method === "POST",
    );
    expect(JSON.parse(String(request?.[1]?.body)).checkout).toEqual({
      url: null,
    });
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
    expect(await prisma.accountEmail.count()).toBe(1);
    expect(await prisma.accountEmail.findFirstOrThrow()).toMatchObject({
      key: `premium-subscription/${state.subscriptions[0].id}`,
      subject: "Welcome to Premium",
    });
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
      new Request(`${process.env.APP_URL}/api/paddle/webhook`, {
        method: "POST",
        body,
      });
    expect((await POST(request("{}"))).status).toBe(401);
    expect((await POST(request("x".repeat(262145)))).status).toBe(413);
    expect(await prisma.billingEvent.count()).toBe(0);
    expect(inngest.send).not.toHaveBeenCalled();
    expect(postResponse.callbacks).toHaveLength(0);
  });

  it("processes signed Paddle sandbox simulator events once using provider truth", async () => {
    const { checkout, user } = await begin();
    const id = `ntfsimevt_${"1".padStart(26, "0")}`;
    expect(
      await event(
        checkout.transactionId!,
        "transaction.completed",
        "1",
        true,
        "ntfsimevt",
      ),
    ).toBe(200);
    expect(inngest.send).not.toHaveBeenCalled();
    expect(postResponse.callbacks).toHaveLength(1);
    await postResponse.callbacks[0]();
    expect(inngest.send).toHaveBeenCalledExactlyOnceWith([
      {
        name: backgroundEvents.billing,
        id: `${backgroundEvents.billing}/${id}`,
        data: { id },
      },
    ]);
    expect(await reconcileBilling(id)).toMatchObject({ failed: 0 });
    expect(
      (await prisma.billingEvent.findUniqueOrThrow({ where: { id } }))
        .processedAt,
    ).not.toBeNull();
    // The simulation claims completion; Paddle still has an unpaid checkout.
    expect((await readPremiumAccess(user.id)).plan).toBe("FREE");
    expect(await prisma.billingPayment.count()).toBe(0);
    expect(await prisma.accountEmail.count()).toBe(0);
    expect(
      await event(
        checkout.transactionId!,
        "transaction.completed",
        "1",
        true,
        "ntfsimevt",
      ),
    ).toBe(200);
    expect(await prisma.billingEvent.count()).toBe(1);
    expect(postResponse.callbacks).toHaveLength(1);
    expect(inngest.send).toHaveBeenCalledOnce();
  });

  it.each([
    ["ntfsim", "1"],
    ["ntfsimevt", "!"],
    ["ntfsimevt", "1".repeat(27)],
  ])(
    "rejects a signed malformed simulator ID (%s, %s)",
    async (prefix, suffix) => {
      expect(
        await event(
          `txn_${"1".repeat(26)}`,
          "transaction.completed",
          suffix,
          true,
          prefix,
        ),
      ).toBe(400);
      expect(await prisma.billingEvent.count()).toBe(0);
      expect(postResponse.callbacks).toHaveLength(0);
      expect(inngest.send).not.toHaveBeenCalled();
    },
  );

  it("rejects an unsigned simulator event", async () => {
    expect(
      (
        await POST(
          new Request(`${process.env.APP_URL}/api/paddle/webhook`, {
            method: "POST",
            body: JSON.stringify({
              event_id: `ntfsimevt_${"1".repeat(26)}`,
              event_type: "transaction.completed",
              data: { id: `txn_${"1".repeat(26)}` },
            }),
          }),
        )
      ).status,
    ).toBe(401);
    expect(await prisma.billingEvent.count()).toBe(0);
    expect(postResponse.callbacks).toHaveLength(0);
  });

  it("acknowledges durable webhook receipt before publishing and survives a post-response trigger failure", async () => {
    const { checkout, user } = await begin();
    completePayment(state, checkout.transactionId!);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(inngest.send).mockRejectedValue(
      new Error("event service unavailable"),
    );
    expect(
      await event(checkout.transactionId!, "transaction.completed", "1", true),
    ).toBe(200);
    expect(
      await prisma.billingEvent.count({ where: { processedAt: null } }),
    ).toBe(1);
    expect(inngest.send).not.toHaveBeenCalled();
    expect(postResponse.callbacks).toHaveLength(1);
    await postResponse.callbacks[0]();
    expect(inngest.send).toHaveBeenCalledOnce();
    expect((await reconcileBilling()).failed).toBe(0);
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
  });

  it("processes a committed webhook immediately without waiting behind unrelated accounts", async () => {
    const { checkout, user } = await begin();
    completePayment(state, checkout.transactionId!);
    await prisma.billingAccount.createMany({
      data: Array.from({ length: 6 }, (_, index) => ({
        id: `older-account-${index}`,
        nextSyncAt: new Date(0),
      })),
    });
    vi.mocked(inngest.send).mockImplementation(async (payload) => {
      for (const item of Array.isArray(payload) ? payload : [payload]) {
        if (item.name !== backgroundEvents.billing) continue;
        const id = item.data?.id as string;
        expect(
          await prisma.billingEvent.findUnique({ where: { id } }),
        ).not.toBeNull();
        expect(await reconcileBilling(id)).toMatchObject({
          processed: 1,
          failed: 0,
        });
      }
      return { ids: [] };
    });
    expect(await event(checkout.transactionId!)).toBe(200);
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
    expect(
      await prisma.billingAccount.count({
        where: { id: { startsWith: "older-account-" }, lastSyncedAt: null },
      }),
    ).toBe(6);
    const sends = vi.mocked(inngest.send).mock.calls.length;
    expect(await event(checkout.transactionId!)).toBe(200);
    expect(inngest.send).toHaveBeenCalledTimes(sends);
    expect(await prisma.billingPayment.count()).toBe(1);
    expect(await prisma.accountEmail.count()).toBe(1);
  });

  it("acknowledges a durable webhook during an event outage and recovers on the scheduled sweep", async () => {
    const { checkout, user } = await begin();
    completePayment(state, checkout.transactionId!);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(inngest.send).mockRejectedValue(
      new Error("event service unavailable"),
    );
    expect(await event(checkout.transactionId!)).toBe(200);
    expect((await readPremiumAccess(user.id)).plan).toBe("FREE");
    expect(
      (await prisma.billingEvent.findFirstOrThrow()).processedAt,
    ).toBeNull();
    expect((await reconcileBilling()).failed).toBe(0);
    expect((await readPremiumAccess(user.id)).plan).toBe("PREMIUM");
    expect(await prisma.accountEmail.count({ where: { sentAt: null } })).toBe(
      1,
    );
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
