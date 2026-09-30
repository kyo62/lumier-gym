import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

/** 静的書き出し（output: 'export'）で robots.txt を生成するために必要 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || site.url;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 会員ページは検索結果に出さない
      disallow: ['/member'],
    },
    sitemap: `${base.replace(/\/$/, '')}/sitemap.xml`,
  };
}
