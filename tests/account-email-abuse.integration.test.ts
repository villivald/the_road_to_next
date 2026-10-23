import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  requestPasswordRecovery,
  requestVerificationEmail,
  reserveAccountEmail,
} from "@/features/auth/service/email-requests";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/utils/crypto";
import { assertTestDatabase, testEnvironment } from "../e2e/environment";
import { accounts, resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
const start = Date.UTC(2026, 9, 23, 10, 10);
const clock = (time: number) => vi.spyOn(Date, "now").mockReturnValue(time);
const mailCount = async () => {
  const response = await fetch(
    `${testEnvironment.MAILPIT_URL}/api/v1/messages`,
  );
  return ((await response.json()) as { total: number }).total;
};
beforeEach(async () => {
  await resetFixtures();
  await fetch(`${testEnvironment.MAILPIT_URL}/api/v1/messages`, {
    method: "DELETE",
  });
});
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

it("reserves only one concurrent email per recipient and stores no plaintext identity", async () => {
  clock(start);
  const results = await Promise.all(
    Array.from({ length: 8 }, () => reserveAccountEmail(accounts.owner.email)),
  );
  expect(results.filter(Boolean)).toHaveLength(1);
  const entries = await prisma.authRateLimit.findMany();
  expect(entries).toHaveLength(3);
  expect(JSON.stringify(entries)).not.toContain(accounts.owner.email);
});

it("uses a rolling 60-second cooldown across fixed-window boundaries and email casing", async () => {
  const now = clock(start - 1);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(true);
  now.mockReturnValue(start);
  expect(
    await reserveAccountEmail(`  ${accounts.owner.email.toUpperCase()}  `),
  ).toBe(false);
  now.mockReturnValue(start + 59_998);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(false);
  now.mockReturnValue(start + 59_999);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(true);
});

it("caps combined email types at three per UTC hour without extending cooldown on rejection", async () => {
  const now = clock(start);
  for (let index = 0; index < 3; index++) {
    now.mockReturnValue(start + index * 60_000);
    expect(await reserveAccountEmail(accounts.owner.email)).toBe(true);
  }
  now.mockReturnValue(start + 180_000);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(false);
  const cooldown = await prisma.authRateLimit.findUniqueOrThrow({
    where: { key: hashToken(`account-email-cooldown:${accounts.owner.email}`) },
  });
  expect(cooldown.expiresAt.getTime()).toBe(start + 180_000);
  now.mockReturnValue(start + 3_600_000);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(true);
});

it("caps daily sends at eight and recovers in the next UTC day", async () => {
  const now = clock(start);
  for (let index = 0; index < 8; index++) {
    now.mockReturnValue(start + index * 3_600_000);
    expect(await reserveAccountEmail(accounts.owner.email)).toBe(true);
  }
  now.mockReturnValue(start + 8 * 3_600_000);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(false);
  now.mockReturnValue(start + 86_400_000);
  expect(await reserveAccountEmail(accounts.owner.email)).toBe(true);
});

it("suppresses immediate signup-to-reset and resend without invalidating the original code", async () => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: "e2e-owner" },
  });
  expect(await requestVerificationEmail(user)).toBe(true);
  const token = await prisma.emailVerificationToken.findUniqueOrThrow({
    where: { userId: user.id },
  });
  expect(await requestVerificationEmail(user)).toBe(false);
  await requestPasswordRecovery(user.email);
  expect(
    await prisma.emailVerificationToken.findUnique({
      where: { userId: user.id },
    }),
  ).toEqual(token);
  expect(await prisma.passwordResetToken.count()).toBe(0);
  expect(await mailCount()).toBe(1);
});

it("preserves existing reset links when a duplicate recovery request is throttled", async () => {
  await requestPasswordRecovery(accounts.owner.email);
  const token = await prisma.passwordResetToken.findUniqueOrThrow({
    where: { userId: "e2e-owner" },
  });
  await requestPasswordRecovery(accounts.owner.email);
  expect(
    await prisma.passwordResetToken.findUnique({
      where: { userId: "e2e-owner" },
    }),
  ).toEqual(token);
  expect(await mailCount()).toBe(1);
});

it("still sends recovery for unverified users and never sends to unknown addresses", async () => {
  await prisma.user.update({
    where: { id: "e2e-owner" },
    data: { emailVerified: false },
  });
  await requestPasswordRecovery("missing@example.test");
  expect(await mailCount()).toBe(0);
  expect(await prisma.authRateLimit.count()).toBe(0);
  await requestPasswordRecovery(accounts.owner.email);
  expect(await mailCount()).toBe(1);
  expect(await prisma.passwordResetToken.count()).toBe(1);
  expect(
    (await prisma.user.findUniqueOrThrow({ where: { id: "e2e-owner" } }))
      .emailVerified,
  ).toBe(false);
});
