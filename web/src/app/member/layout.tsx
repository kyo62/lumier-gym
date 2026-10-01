import type { Metadata, Viewport } from 'next';
import { MemberApp } from '@/components/member/MemberApp';

/**
 * 会員ページ全体の入口。
 * ・検索結果には出さない（robots / noindex）
 * ・ホーム画面に追加したときに、アプリらしく全画面で開く（appleWebApp）
 * ・中身はすべてブラウザ側で動く。ログインしていなければログイン画面になる
 */
export const metadata: Metadata = {
  title: '会員ページ',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: 'TONEKA', statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  // iOS のホーム画面から開いたときに、Safari の枠を外して全画面にする
  other: { 'apple-mobile-web-app-capable': 'yes' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // ノッチのある端末で、画面の端まで背景を伸ばす（余白は env(safe-area-inset-*) で確保している）
  viewportFit: 'cover',
  themeColor: '#f6f3ee',
};

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <MemberApp>{children}</MemberApp>;
}
