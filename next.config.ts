import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

if (
  process.env.VERCEL &&
  (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    !process.env.TURNSTILE_SECRET_KEY)
) {
  throw new Error(
    "Configure NEXT_PUBLIC_TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY before deploying account forms.",
  );
}

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default createNextIntlPlugin()(nextConfig);
