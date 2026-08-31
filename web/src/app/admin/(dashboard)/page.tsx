import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { canWriteBookings } from '@/lib/env';
import { formatLongDate, toTimeLabel, todayKey } from '@/lib/time';
import { yen } from '@/lib/utils';
import { BookingCard, type BookingRow } from '@/components/admin/BookingCard';

export const dynamic = 'force-dynamic';

type Filter = 'upcoming' | 'past' | 'cancelled';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'upcoming', label: 'これから' },
  { key: 'past', label: '過去' },
  { key: 'cancelled', label: 'キャンセル' },
];

const SELECT =
  'id, menu_name, menu_price, menu_duration_min, starts_at, ends_at, customer_name, customer_kana, phone, email, concern, note, status, admin_memo, created_at';

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter: Filter = FILTERS.some((f) => f.key === filterParam) ? (filterParam as Filter) : 'upcoming';

  if (!canWriteBookings()) {
    return (
      <p className="rounded-lg border border-line bg-surface p-6 text-sm leading-8 text-muted">
        Supabaseの環境変数が未設定のため、予約データを読み込めません。
        <br />
        README の手順に従って <code className="text-ink">SUPABASE_SERVICE_ROLE_KEY</code> を設定してください。
      </p>
    );
  }

  const supabase = createAdminClient();
  const now = new Date().toISOString();

  let query = supabase.from('bookings').select(SELECT);
  if (filter === 'upcoming') {
    query = query.eq('status', 'confirmed').gte('ends_at', now).order('starts_at', { ascending: true });
  } else if (filter === 'past') {
    query = query.in('status', ['confirmed', 'done']).lt('ends_at', now).order('starts_at', { ascending: false });
  } else {
    query = query.eq('status', 'cancelled').order('starts_at', { ascending: false });
  }

  const { data, error } = await query.limit(100);
  const bookings = (data ?? []) as BookingRow[];

  // 「これから」の予約を日付ごとにまとめる
  const grouped = new Map<string, BookingRow[]>();
  for (const b of bookings) {
    const key = todayKey(new Date(b.starts_at));
    const list = grouped.get(key) ?? [];
    list.push(b);
    grouped.set(key, list);
  }

  const todaysCount = bookings.filter(
    (b) => todayKey(new Date(b.starts_at)) === todayKey() && b.status === 'confirmed'
  ).length;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-xl">予約一覧</h1>
        {filter === 'upcoming' ? (
          <p className="text-xs text-muted tnum">
            本日 {todaysCount}件 / 今後 {bookings.length}件
          </p>
        ) : null}
      </div>

      <nav className="mt-6 flex gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin?filter=${f.key}`}
            className={`rounded-full border px-4 py-2 text-xs transition-colors ${
              f.key === filter ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-muted hover:border-accent'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>

      {error ? (
        <p className="mt-8 rounded-md border border-danger/30 bg-danger/5 p-4 text-sm text-danger">
          読み込みに失敗しました: {error.message}
        </p>
      ) : null}

      {bookings.length === 0 && !error ? (
        <p className="mt-10 rounded-lg border border-line bg-surface p-8 text-center text-sm text-muted">
          該当する予約はありません。
        </p>
      ) : null}

      <div className="mt-8 space-y-10">
        {[...grouped.entries()].map(([dateKey, list]) => (
          <section key={dateKey}>
            <h2 className="sticky top-14 z-10 -mx-5 bg-canvas/95 px-5 py-2 text-xs tracking-widest text-muted backdrop-blur">
              {formatLongDate(dateKey)}
              <span className="ml-3 tnum">{list.length}件</span>
            </h2>
            <ul className="mt-3 space-y-3">
              {list.map((b) => (
                <li key={b.id}>
                  <BookingCard
                    booking={b}
                    timeLabel={`${toTimeLabel(new Date(b.starts_at))}〜`}
                    priceLabel={yen(b.menu_price)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
