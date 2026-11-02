import { isIPv4 } from "node:net";
import { z } from "zod";
import type { BillingEnvironment } from "./config";

const addressNumber = (address: string) =>
  address
    .split(".")
    .reduce((value, octet) => value * 256 + Number(octet), 0) >>> 0;
const cidrSchema = z.string().refine((value) => {
  const parts = value.split("/");
  const [address, prefix] = parts;
  return (
    parts.length === 2 &&
    isIPv4(address) &&
    /^(?:[1-9]|[12][0-9]|3[0-2])$/.test(prefix ?? "")
  );
});
const responseSchema = z.object({
  data: z.object({ ipv4_cidrs: z.array(cidrSchema).min(1).max(256) }),
});
const cache = new Map<
  BillingEnvironment,
  { expiresAt: number; cidrs: string[] }
>();
const pending = new Map<BillingEnvironment, Promise<string[]>>();

export const paddleWebhookRanges = async (environment: BillingEnvironment) => {
  const previous = cache.get(environment);
  if (previous && previous.expiresAt > Date.now()) return previous.cidrs;
  const existing = pending.get(environment);
  if (existing) return existing;
  const request = (async () => {
    const origin =
      environment === "live"
        ? "https://api.paddle.com"
        : "https://sandbox-api.paddle.com";
    const response = await fetch(`${origin}/ips`, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) throw new Error("Paddle IP list unavailable");
    const cidrs = responseSchema.parse(await response.json()).data.ipv4_cidrs;
    cache.set(environment, { cidrs, expiresAt: Date.now() + 5 * 60_000 });
    return cidrs;
  })();
  pending.set(environment, request);
  try {
    return await request;
  } finally {
    pending.delete(environment);
  }
};

export const matchesPaddleRange = (address: string, cidrs: string[]) => {
  if (!isIPv4(address)) return false;
  const number = addressNumber(address);
  return cidrs.some((cidr) => {
    if (!cidrSchema.safeParse(cidr).success) return false;
    const [network, prefix] = cidr.split("/");
    const mask = (0xffffffff << (32 - Number(prefix))) >>> 0;
    return (number & mask) >>> 0 === (addressNumber(network) & mask) >>> 0;
  });
};

export const allowedPaddleWebhookSource = async (
  request: Request,
  environment: BillingEnvironment,
) => {
  if (process.env.VERCEL !== "1") {
    // Local sandbox fixtures still verify signatures. Live never trusts a
    // caller-supplied forwarding header outside the configured Vercel edge.
    const app = process.env.APP_URL ? new URL(process.env.APP_URL) : null;
    const incoming = new URL(request.url);
    const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"];
    return (
      environment === "sandbox" &&
      !!app &&
      // Next.js normalizes loopback IPs to localhost in request URLs.
      loopbackHosts.includes(app.hostname) &&
      loopbackHosts.includes(incoming.hostname) &&
      ["http:", "https:"].includes(app.protocol) &&
      incoming.protocol === app.protocol &&
      incoming.port === app.port
    );
  }
  // Vercel supplies this at its edge; never fall back to arbitrary X-Forwarded-For.
  const address = request.headers.get("x-vercel-forwarded-for")?.trim() ?? "";
  if (!isIPv4(address)) return false;
  return matchesPaddleRange(address, await paddleWebhookRanges(environment));
};
