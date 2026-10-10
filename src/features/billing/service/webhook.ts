import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { billingConfig } from "./config";

export const validSignature = (
  body: Buffer,
  header: string,
  secret: string,
  now = Date.now(),
) => {
  const parts = header.split(";").map((part) => part.trim().split("="));
  const timestamps = parts.filter(([key]) => key === "ts");
  if (timestamps.length !== 1 || !/^\d{10}$/.test(timestamps[0][1] ?? ""))
    return false;
  const timestamp = timestamps[0][1];
  if (Math.abs(now / 1000 - Number(timestamp)) > 5) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}:`)
    .update(body)
    .digest();
  return parts.some(
    ([key, value]) =>
      key === "h1" &&
      /^[a-f0-9]{64}$/.test(value ?? "") &&
      timingSafeEqual(expected, Buffer.from(value, "hex")),
  );
};

export const acceptWebhook = async (body: Buffer, signature: string) => {
  if (!validSignature(body, signature, billingConfig().webhookSecret))
    return 401;
  const parsed = z
    .object({
      event_id: z.string().regex(/^evt_[a-z0-9]{26}$/),
      event_type: z.string(),
      data: z.object({ id: z.string() }),
    })
    .safeParse(JSON.parse(body.toString("utf8")));
  if (!parsed.success) return 400;
  const { event_id: id, event_type: type, data } = parsed.data;
  const prefix = type.startsWith("transaction.")
    ? "txn"
    : type.startsWith("subscription.")
      ? "sub"
      : type.startsWith("adjustment.")
        ? "adj"
        : null;
  if (!prefix) return 200;
  if (!new RegExp(`^${prefix}_[a-z0-9]{26}$`).test(data.id)) return 400;
  await prisma.billingEvent.upsert({
    where: { id },
    create: { id, type, resourceId: data.id },
    update: {},
  });
  return 200;
};
