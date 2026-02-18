import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In dev mode, proxy API requests to the Rust server
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3000/api/:path*",
      },
      {
        source: "/images/:path*",
        destination: "http://localhost:3000/images/:path*",
      },
    ];
  },
};

export default nextConfig;
