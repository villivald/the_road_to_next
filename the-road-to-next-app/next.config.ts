import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // 30 seconds
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
