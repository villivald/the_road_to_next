import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  authenticate,
  register,
  verifyEmail,
} from "@/features/auth/service/accounts";
import { generateEmailVerificationCode } from "@/features/auth/utils/generate-email-verification-code";
import { deliverAccountEmails } from "@/features/notifications/service/delivery";
import { queueAccountEmail } from "@/features/notifications/service/queue";
import { issuePromo, redeemPromo } from "@/features/premium/service/promotions";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { accounts, newAccount, resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
beforeEach(resetFixtures);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await resetFixtures();
  await prisma.$disconnect();
});

const welcome = async () => {
  const result = await register({ ...newAccount, locale: "fi" });
  const code = await generateEmailVerificationCode(
    result.user.id,
    result.user.email,
  );
  await verifyEmail(result.user.id, result.user.email, code);
  return result.user;
};
const due = (id: string) =>
  prisma.accountEmail.update({
    where: { id },
    data: { nextAttemptAt: new Date(0) },
  });

it("queues onboarding only after successful verification, once, in the account language", async () => {
  const result = await register({ ...newAccount, locale: "fi" });
  expect(await prisma.accountEmail.count()).toBe(0);
  await expect(
    verifyEmail(result.user.id, result.user.email, "INVALIDX"),
  ).rejects.toThrow();
  expect(await prisma.accountEmail.count()).toBe(0);
  const code = await generateEmailVerificationCode(
    result.user.id,
    result.user.email,
  );
  await verifyEmail(result.user.id, result.user.email, code);
  await expect(
    verifyEmail(result.user.id, result.user.email, code),
  ).rejects.toThrow();
  const emails = await prisma.accountEmail.findMany();
  expect(emails).toHaveLength(1);
  expect(emails[0]).toMatchObject({
    key: `welcome/${result.user.id}`,
    recipient: newAccount.email,
    subject: "Tervetuloa Wishlistiin",
    sentAt: null,
  });
  expect(emails[0].html).toContain('lang="fi"');
});

it("delivers to local Mailpit, records completion, and does not resend", async () => {
  await welcome();
  const response = await deliverAccountEmails();
  expect(response).toEqual({ sent: 1, failed: 0, canceled: 0 });
  expect(await deliverAccountEmails()).toEqual({
    sent: 0,
    failed: 0,
    canceled: 0,
  });
  const email = await prisma.accountEmail.findFirstOrThrow();
  expect(email).toMatchObject({
    sentAt: expect.any(Date),
    deliveryAttempts: 1,
    claimId: null,
    html: "",
    text: "",
  });
  const inbox = await fetch(
    `${process.env.MAILPIT_URL}/api/v1/search?query=subject:Tervetuloa%20to:${newAccount.email}`,
  );
  const messages = await inbox.json();
  expect(messages.messages.length).toBeGreaterThan(0);
});

it("claims concurrent workers once and retries with an identical provider request after profile and configuration changes", async () => {
  const user = await welcome();
  vi.stubEnv("MAILPIT_URL", "");
  const transport = vi
    .fn<typeof fetch>()
    .mockRejectedValue(new Error("network unavailable"));
  vi.stubGlobal("fetch", transport);
  await Promise.all([deliverAccountEmails(), deliverAccountEmails()]);
  expect(transport).toHaveBeenCalledTimes(1);
  const email = await prisma.accountEmail.findFirstOrThrow();
  expect(email).toMatchObject({
    sentAt: null,
    deliveryAttempts: 1,
    claimId: null,
  });
  expect(email.nextAttemptAt.getTime()).toBeGreaterThan(Date.now());
  expect(await deliverAccountEmails()).toEqual({
    sent: 0,
    failed: 0,
    canceled: 0,
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { name: "Changed name", locale: "en" },
  });
  vi.stubEnv("EMAIL_FROM", "changed@example.test");
  vi.stubEnv("APP_URL", "https://changed.example");
  transport.mockResolvedValue(Response.json({ id: "mock-message" }));
  await due(email.id);
  expect((await deliverAccountEmails()).sent).toBe(1);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(transport.mock.calls[1]![1]?.body).toBe(
    transport.mock.calls[0]![1]?.body,
  );
  expect(
    new Headers(transport.mock.calls[1]![1]?.headers).get("Idempotency-Key"),
  ).toBe(`wishlist-account-email/${email.id}`);
});

it.each(["age", "attempts"])(
  "stops %s-exhausted ambiguous deliveries before the provider deduplication window ends",
  async (limit) => {
    await welcome();
    const email = await prisma.accountEmail.findFirstOrThrow();
    await prisma.accountEmail.update({
      where: { id: email.id },
      data:
        limit === "age"
          ? {
              firstAttemptAt: new Date(Date.now() - 23 * 3600000),
              deliveryAttempts: 1,
            }
          : { deliveryAttempts: 8 },
    });
    const transport = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", transport);
    expect((await deliverAccountEmails()).failed).toBe(1);
    expect(transport).not.toHaveBeenCalled();
    expect(
      (await prisma.accountEmail.findUniqueOrThrow({ where: { id: email.id } }))
        .deliveryFailedAt,
    ).toBeInstanceOf(Date);
  },
);

it("queues each successful promo redemption with its dates, including extensions, and cancels a revoked guide", async () => {
  const account = await authenticate(
    accounts.owner.email,
    accounts.owner.password,
  );
  const promo = () =>
    issuePromo({
      label: "e2e-email",
      durationDays: 7,
      validForDays: 7,
      maxRedemptions: 2,
    });
  const first = await promo();
  await redeemPromo(account.user.id, account.session.id, first.code);
  await expect(
    redeemPromo(account.user.id, account.session.id, first.code),
  ).rejects.toThrow("already redeemed");
  const second = await promo();
  await redeemPromo(account.user.id, account.session.id, second.code);
  const emails = await prisma.accountEmail.findMany({
    orderBy: { createdAt: "asc" },
  });
  expect(emails).toHaveLength(2);
  expect(emails[1].text).toContain("may start later");
  expect(emails[1].text).not.toContain(second.code);
  await prisma.premiumGrant.update({
    where: { id: emails[0].grantId! },
    data: { revokedAt: new Date() },
  });
  expect(await deliverAccountEmails()).toEqual({
    sent: 1,
    failed: 0,
    canceled: 1,
  });
});

it("rolls back a delivery intent with its enclosing operation and erases queued content on account deletion", async () => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: "e2e-owner" },
  });
  await expect(
    prisma.$transaction(async (tx) => {
      await queueAccountEmail(tx, user, { key: `welcome/${user.id}` });
      throw new Error("rolled back");
    }),
  ).rejects.toThrow("rolled back");
  expect(await prisma.accountEmail.count()).toBe(0);
  await welcome();
  await prisma.user.delete({ where: { email: newAccount.email } });
  expect(await prisma.accountEmail.count()).toBe(0);
});

it("does not deliver to an old email address or an unverified account", async () => {
  const user = await welcome();
  await prisma.user.update({
    where: { id: user.id },
    data: { email: "changed@example.test", emailVerified: false },
  });
  const transport = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", transport);
  expect((await deliverAccountEmails()).canceled).toBe(1);
  expect(transport).not.toHaveBeenCalled();
});
