import type { Metadata } from 'next';
import { Noto_Sans_JP, Shippori_Mincho } from 'next/font/google';
import { site } from '@/config/site';
import './globals.css';

const notoSansJp = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
});

const shipporiMincho = Shippori_Mincho({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-shippori-mincho',
  display: 'swap',
});

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
    <html lang="ja" className={`${notoSansJp.variable} ${shipporiMincho.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
