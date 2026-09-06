import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.TRADER_API_URL ?? "http://127.0.0.1:8787"}/api/:path*` }];
  },
};

export default nextConfig;
