import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || site.url;
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 管理画面とキャンセルURLは検索結果に出さない
      disallow: ['/admin', '/auth', '/cancel', '/api'],
    },
    sitemap: `${base.replace(/\/$/, '')}/sitemap.xml`,
  };
}
