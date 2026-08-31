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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || site.url),
  title: {
    default: `${site.name}｜${site.address.city}の${site.tagline}`,
    template: `%s｜${site.name}`,
  },
  description: site.description,
  keywords: ['姿勢改善', '整体', 'ストレッチ', site.address.city, 'パーソナルトレーナー', '完全予約制'],
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    siteName: site.name,
    title: `${site.name}｜${site.address.city}の${site.tagline}`,
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
