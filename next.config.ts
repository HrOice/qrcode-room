import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['react-vant'],
  outputFileTracingRoot: process.cwd(),
  outputFileTracing: true,
  experimental: {
    // 允许自定义服务器
    // customServer: true,
  }
}

export default nextConfig;
