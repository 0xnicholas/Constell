import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@constell/shared"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
