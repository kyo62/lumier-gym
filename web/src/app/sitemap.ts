import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

/** 静的書き出し（output: 'export'）で sitemap.xml を生成するために必要 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, '');
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/reserve`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
