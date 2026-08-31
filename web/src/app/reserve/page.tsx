import type { Metadata } from 'next';
import Link from 'next/link';
import { BookingFlow } from '@/components/reserve/BookingFlow';
import { Footer } from '@/components/site/Footer';
import { site, menuById } from '@/config/site';
import { env } from '@/lib/env';

export const metadata: Metadata = {
  title: 'ご予約',
  description: `${site.name}のご予約ページ。カレンダーから空いている枠をお選びください。`,
  robots: { index: true, follow: true },
};

export default async function ReservePage({
  searchParams,
}: {
  searchParams: Promise<{ menu?: string }>;
}) {
  const params = await searchParams;
  // 不正なメニューIDが渡されても落とさず、メニュー選択から始める
  const initialMenuId = params.menu && menuById(params.menu) ? params.menu : undefined;

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6 sm:h-20">
          <Link href="/" className="font-serif text-lg tracking-[0.18em]">
            {site.name}
          </Link>
          <span className="text-xs tracking-widest text-muted">ご予約</span>
        </div>
      </header>

      <main className="px-6 py-14 sm:py-20">
        <BookingFlow initialMenuId={initialMenuId} turnstileSiteKey={env.turnstileSiteKey} />
      </main>

      <Footer />
    </>
  );
}
