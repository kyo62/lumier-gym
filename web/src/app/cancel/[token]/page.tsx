import type { Metadata } from 'next';
import Link from 'next/link';
import { CancelForm } from '@/components/reserve/CancelForm';
import { Footer } from '@/components/site/Footer';
import { site } from '@/config/site';
import { canWriteBookings } from '@/lib/env';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatDateTime } from '@/lib/time';

export const metadata: Metadata = {
  title: 'ご予約のキャンセル',
  // キャンセルURLは検索結果に出てはいけない
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CancelPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let booking: { starts_at: string; menu_name: string; status: string; customer_name: string } | null = null;
  let unavailable = false;

  if (!canWriteBookings() || !UUID.test(token)) {
    unavailable = true;
  } else {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from('bookings')
      .select('starts_at, menu_name, status, customer_name')
      .eq('cancel_token', token)
      .maybeSingle();
    booking = data ?? null;
  }

  return (
    <>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-6 sm:h-20">
          <Link href="/" className="font-serif text-lg tracking-[0.18em]">
            {site.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-6 py-16 sm:py-24">
        <h1 className="text-2xl">ご予約のキャンセル</h1>

        {unavailable || !booking ? (
          <p className="mt-8 rounded-lg border border-line bg-surface p-6 text-sm leading-8 text-muted">
            対象のご予約が見つかりませんでした。
            <br />
            URLをご確認いただくか、すでにキャンセル済みの可能性があります。
          </p>
        ) : booking.status !== 'confirmed' ? (
          <p className="mt-8 rounded-lg border border-line bg-surface p-6 text-sm leading-8 text-muted">
            このご予約はすでにキャンセル済みです。
          </p>
        ) : (
          <>
            <dl className="mt-8 rounded-lg border border-line bg-surface p-6 text-sm">
              <div className="flex justify-between gap-4 border-b border-line py-3">
                <dt className="text-muted">日時</dt>
                <dd className="tnum">{formatDateTime(booking.starts_at)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-line py-3">
                <dt className="text-muted">メニュー</dt>
                <dd className="text-right">{booking.menu_name}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-muted">お名前</dt>
                <dd>{booking.customer_name} 様</dd>
              </div>
            </dl>

            <CancelForm token={token} />
          </>
        )}

        <Link href="/" className="mt-10 inline-block text-xs text-accent underline underline-offset-4">
          トップページに戻る
        </Link>
      </main>

      <Footer />
    </>
  );
}
