import { headers } from "next/headers";
import { consumeRateLimit } from "./security";

export const limitSourceRequest = async (scope: string) => {
  // Vercel overwrites this header. Other deployments share a conservative fallback bucket.
  const ip = process.env.VERCEL
    ? (await headers()).get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : undefined;
  await consumeRateLimit(
    `${scope}:source`,
    ip ?? "shared",
    100,
    15 * 60 * 1000,
  );
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
