import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'standalone',
  transpilePackages: ['react-vant'],
  experimental: {
    // 允许自定义服务器
    // customServer: true,
  }
}

export default nextConfig;
