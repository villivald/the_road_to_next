import { afterAll, beforeEach, expect, it } from "vitest";
import { readOperationsStatus } from "@/features/operations/service/status";
import { prisma } from "@/lib/prisma";
import { assertTestDatabase } from "../e2e/environment";
import { resetFixtures } from "../e2e/seed";

assertTestDatabase(process.env);
beforeEach(async () => {
  await resetFixtures();
  // Other lifecycle suites intentionally leave detached recovery records.
  await prisma.media.deleteMany();
  await prisma.billingEvent.deleteMany();
  await prisma.billingAccount.deleteMany();
});
afterAll(() => prisma.$disconnect());

it("reports clear queues without changing application state", async () => {
  const before = await prisma.user.count();
  expect((await readOperationsStatus()).status).toBe("clear");
  expect(await prisma.user.count()).toBe(before);
});

it("reports overdue and failed work using aggregate counts without identities", async () => {
  const past = new Date(Date.now() - 3 * 60 * 60_000);
  await prisma.accountEmail.create({
    data: {
      key: "operations-private-email",
      userId: "e2e-owner",
      recipient: "private@example.test",
      sender: "support@example.test",
      subject: "Private subject",
      html: "Private content",
      text: "Private content",
      nextAttemptAt: past,
    },
  });
  await prisma.billingEvent.create({
    data: {
      id: "operations-event",
      type: "test",
      resourceId: "private-resource",
      nextAttemptAt: past,
    },
  });
  await prisma.media.create({
    data: {
      pathname: "private-object.webp",
      provider: "LOCAL",
      state: "DELETING",
      alt: "Private alt",
      width: 1,
      height: 1,
      bytes: 1,
      cleanupAfter: past,
      attempts: 3,
    },
  });
  const result = await readOperationsStatus();
  expect(result.status).toBe("attention");
  expect(result.attention).toMatchObject({
    overdueAccountEmails: 1,
    overdueBillingEvents: 1,
    overdueDetachedMedia: 1,
    mediaWithRepeatedFailures: 1,
  });
  expect(JSON.stringify(result)).not.toMatch(/private|e2e-owner/i);
  expect(await prisma.accountEmail.count()).toBe(1);
  expect(await prisma.billingEvent.count()).toBe(1);
  expect(await prisma.media.count()).toBe(1);
});

it("excludes completed, canceled and intentionally deferred work", async () => {
  const future = new Date(Date.now() + 60_000);
  await prisma.accountEmail.create({
    data: {
      key: "operations-deferred",
      userId: "e2e-owner",
      recipient: "fixture@example.test",
      sender: "support@example.test",
      subject: "Fixture",
      html: "Fixture",
      text: "Fixture",
      nextAttemptAt: future,
    },
  });
  await prisma.billingEvent.create({
    data: {
      id: "operations-complete",
      type: "test",
      resourceId: "fixture",
      nextAttemptAt: new Date(0),
      processedAt: new Date(),
    },
  });
  expect((await readOperationsStatus()).status).toBe("clear");
});
