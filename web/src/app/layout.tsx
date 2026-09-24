import type { Metadata } from 'next';
import { site } from '@/config/site';
import './globals.css';

/**
 * フォントは Google Fonts からリンクで読み込む。
 *
 * next/font によるセルフホストも検討したが、日本語フォントは
 * サブセットが woff2 約490ファイルに分割されるため、静的書き出しの
 * 取り回しが悪くなる。表示速度の差はわずかなので、扱いやすさを取った。
 */
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@400;500;600&display=swap';

const title = `${site.name}｜${site.address.city}・名城公園の${site.tagline}`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || site.url),
  title: { default: title, template: `%s｜${site.name}` },
  description: site.description,
  keywords: [
    '名城公園', '名古屋市北区', '姿勢改善', 'コンディショニング',
    'パーソナル', 'ストレッチ', '肩こり', '完全個室', '完全予約制',
  ],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: site.name,
    title,
    description: site.description,
    url: site.url,
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
