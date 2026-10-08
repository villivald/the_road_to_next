import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
const nextConfig: NextConfig = {
  agentRules: false,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default createNextIntlPlugin()(nextConfig);
