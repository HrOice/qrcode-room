import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['react-vant'],
  outputFileTracingRoot: process.cwd(),
  compress: true,             // 开启 Gzip
  productionBrowserSourceMaps: false, // 关闭 Source Map
  swcMinify: true,            // 使用 SWC 压缩（比 Babel 快）
  // experimental: {
  //   optimizeCss: true,        // 自动优化 CSS
  //   esmExternals: true,       // 减小 ESM 依赖体积
  // },
}

export default nextConfig;
