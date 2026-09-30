import type { MetadataRoute } from 'next';
import { site } from '@/config/site';

/** 静的書き出し（output: 'export'）で manifest を生成するために必要 */
export const dynamic = 'force-static';

/**
 * 「ホーム画面に追加」したときの、アプリとしての設定。
 * 開く先は会員ページ。アイコンは仮のもの（ロゴが決まったら public/icons/ を差し替える）。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} 会員ページ`,
    short_name: site.name,
    description: `${site.name}の会員ページ。記録・復習動画・ご予約。`,
    lang: 'ja',
    start_url: '/member',
    scope: '/member',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f3ee',
    theme_color: '#f6f3ee',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
