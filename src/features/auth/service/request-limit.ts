import { headers } from "next/headers";
import { consumeRateLimit } from "./security";

export const limitSourceRequest = async (
  scope: string,
  limit = 100,
  windowMs = 15 * 60 * 1000,
) => {
  // Vercel overwrites this header. Other deployments share a conservative fallback bucket.
  const ip = process.env.VERCEL
    ? (await headers()).get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : undefined;
  await consumeRateLimit(`${scope}:source`, ip ?? "shared", limit, windowMs);
};

export const limitAccountEmailSource = async (signingUp = false) => {
  await limitSourceRequest("account-email", 20);
  if (signingUp) {
    await limitSourceRequest("registration", 5);
    await limitSourceRequest("sign-up-day", 20, 86_400_000);
  }
};

export const limitAuthRequest = async (
  scope: string,
  identity: string,
  limit = 10,
  windowMs = 15 * 60 * 1000,
) => {
  await limitSourceRequest(scope);
  await consumeRateLimit(scope, identity, limit, windowMs);
};
