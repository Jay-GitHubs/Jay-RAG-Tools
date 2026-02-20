import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Match the Rust server's 50 MB upload limit (default is 10 MB)
    proxyClientMaxBodySize: "50mb",
  },
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
