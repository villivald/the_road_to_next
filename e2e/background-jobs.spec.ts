import { expect, test } from "@playwright/test";
import { createHmac, randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { paddleEnvironment } from "./paddle-fixture";
import { resetFixtures, testPrisma } from "./seed";

test("a signed webhook is saved and publishes its opaque ID after the HTTP response", async ({
  request,
}) => {
  await resetFixtures();
  const id = `evt_${randomBytes(13).toString("hex")}`;
  const body = JSON.stringify({
    event_id: id,
    event_type: "transaction.completed",
    data: { id: `txn_${"t".repeat(26)}`, email: "private@example.test" },
  });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac(
    "sha256",
    paddleEnvironment.PADDLE_WEBHOOK_SECRET,
  )
    .update(`${timestamp}:${body}`)
    .digest("hex");
  const response = await request.post("/api/paddle/webhook", {
    headers: { "paddle-signature": `ts=${timestamp};h1=${signature}` },
    data: body,
  });
  expect(response.status()).toBe(200);
  const prisma = testPrisma();
  try {
    expect(
      await prisma.billingEvent.findUnique({ where: { id } }),
    ).toMatchObject({
      resourceId: `txn_${"t".repeat(26)}`,
      processedAt: null,
    });
    await expect
      .poll(async () => {
        const contents = await readFile(
          ".local/background-events-test.jsonl",
          "utf8",
        );
        const events = contents
          .trim()
          .split("\n")
          .filter(Boolean)
          .flatMap(
            (line) =>
              JSON.parse(line) as { name: string; id: string; data: unknown }[],
          );
        return events.find(
          (event) => event.id === `wishlist/billing-event.received/${id}`,
        )?.data;
      })
      .toEqual({ id });
    expect(
      await prisma.premiumGrant.count({
        where: { billingPaymentId: { not: null } },
      }),
    ).toBe(0);
  } finally {
    await prisma.$disconnect();
  }
});
