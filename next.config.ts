import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  distDir: process.env.LIFE_OS_BUILD_DIR || undefined,
  experimental: { webpackBuildWorker: process.env.LIFE_OS_SINGLE_PROCESS_BUILD === "1" ? false : undefined },
};

export default nextConfig;
