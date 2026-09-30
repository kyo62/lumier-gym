import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

/** 静的書き出し（output: 'export'）で robots.txt を生成するために必要 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || site.url;

  // 公開前（NEXT_PUBLIC_NOINDEX=1）は、サイト全体を検索の対象外にする
  if (process.env.NEXT_PUBLIC_NOINDEX === '1') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

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
