import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * 完全に静的なサイトとして書き出す。
   * サーバー不要になるため、Cloudflare Pages などへ `out/` をそのまま置ける。
   */
  output: 'export',

  images: { unoptimized: true },
};

export default nextConfig;
