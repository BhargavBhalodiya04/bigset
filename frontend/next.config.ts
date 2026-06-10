import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    allowedDevOrigins: ["13.234.200.90", "13.234.200.90:3500"],
  },
};

export default nextConfig;

