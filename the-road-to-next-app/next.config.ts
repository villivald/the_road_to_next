import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    staleTimes: {
      dynamic: 30, // 30 seconds
    },
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
