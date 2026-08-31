import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { canWriteBookings } from '@/lib/env';
import { loadScheduleData } from '@/lib/bookings';
import { openIntervalsFor } from '@/lib/availability';
import {
  buildMonthGrid,
  dayOfMonth,
  formatMonthLabel,
  monthEndKey,
  monthStartKey,
  shiftMonth,
  toMonthKey,
} from '@/lib/calendar';
import { addDaysToKey, formatLongDate, minutesToTime, todayKey, toTimeLabel } from '@/lib/time';
import { WEEKDAY_LABELS } from '@/config/site';
import { cn } from '@/lib/utils';
import { DayEditor } from '@/components/admin/DayEditor';
import { BusinessHoursEditor } from '@/components/admin/BusinessHoursEditor';

export const dynamic = 'force-dynamic';

const MONTH_KEY = /^\d{4}-\d{2}$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  const params = await searchParams;

  if (!canWriteBookings()) {
    return (
      <p className="rounded-lg border border-line bg-surface p-6 text-sm leading-8 text-muted">
        Supabaseの環境変数が未設定のため、営業日の設定を読み込めません。
      </p>
    );
  }

  const today = todayKey();
  const monthKey = params.month && MONTH_KEY.test(params.month) ? params.month : toMonthKey(today);
  const selectedDate = params.date && DATE_KEY.test(params.date) ? params.date : null;

  const from = monthStartKey(monthKey);
  const to = monthEndKey(monthKey);

  const supabase = createAdminClient();
  const [schedule, hoursRes, overridesRes, blocksRes, bookingsRes] = await Promise.all([
    loadScheduleData(from, to),
    supabase.from('business_hours').select('id, weekday, start_time, end_time, is_open').order('weekday'),
    supabase
      .from('schedule_overrides')
      .select('id, date, kind, start_time, end_time, note')
      .gte('date', from)
      .lte('date', to)
      .order('date'),
    supabase
      .from('slot_blocks')
      .select('id, starts_at, ends_at, reason')
      .gte('starts_at', `${from}T00:00:00Z`)
      .lt('starts_at', `${addDaysToKey(to, 2)}T00:00:00Z`)
      .order('starts_at'),
    supabase
      .from('bookings')
      .select('id, starts_at, ends_at, customer_name, menu_name')
      .eq('status', 'confirmed')
      .gte('starts_at', `${from}T00:00:00Z`)
      .lt('starts_at', `${addDaysToKey(to, 2)}T00:00:00Z`)
      .order('starts_at'),
  ]);

  const businessHourRows = hoursRes.data ?? [];
  const overrides = overridesRes.data ?? [];
  const blocks = blocksRes.data ?? [];
  const bookings = bookingsRes.data ?? [];

  // 日付ごとの表示内容を先に組み立てておく
  const cells = buildMonthGrid(monthKey).map((cell) => {
    const intervals = openIntervalsFor(cell.dateKey, schedule.businessHours, schedule.overrides);
    const dayBookings = bookings.filter((b) => todayKey(new Date(b.starts_at)) === cell.dateKey);
    const dayBlocks = blocks.filter((b) => todayKey(new Date(b.starts_at)) === cell.dateKey);
    const hasOverride = overrides.some((o) => o.date === cell.dateKey);
    return { ...cell, intervals, bookingCount: dayBookings.length, blockCount: dayBlocks.length, hasOverride };
  });

  const detail = selectedDate
    ? {
        date: selectedDate,
        intervals: openIntervalsFor(selectedDate, schedule.businessHours, schedule.overrides),
        overrides: overrides.filter((o) => o.date === selectedDate),
        blocks: blocks.filter((b) => todayKey(new Date(b.starts_at)) === selectedDate),
        bookings: bookings.filter((b) => todayKey(new Date(b.starts_at)) === selectedDate),
      }
    : null;

  const hrefFor = (month: string, date?: string | null) =>
    `/admin/schedule?month=${month}${date ? `&date=${date}` : ''}`;

  return (
    <>
      <h1 className="text-xl">営業日設定</h1>
      <p className="mt-2 text-xs leading-6 text-muted">
        日付をタップすると、その日の臨時休業・臨時営業・時間帯のブロックを設定できます。
      </p>

      <section className="mt-8 rounded-lg border border-line bg-surface p-5">
        <div className="flex items-center justify-between">
          <Link
            href={hrefFor(shiftMonth(monthKey, -1))}
            className="flex size-9 items-center justify-center rounded-full border border-line transition-colors hover:border-accent"
            aria-label="前の月"
          >
            <ChevronLeft size={16} />
          </Link>
          <p className="font-serif text-lg tnum">{formatMonthLabel(monthKey)}</p>
          <Link
            href={hrefFor(shiftMonth(monthKey, 1))}
            className="flex size-9 items-center justify-center rounded-full border border-line transition-colors hover:border-accent"
            aria-label="次の月"
          >
            <ChevronRight size={16} />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={cn('pb-1 text-[10px] tracking-widest', i === 0 ? 'text-danger/70' : i === 6 ? 'text-accent' : 'text-muted')}
            >
              {label}
            </div>
          ))}

          {cells.map((cell) => {
            const isOpen = cell.intervals.length > 0;
            const isSelected = selectedDate === cell.dateKey;
            const isToday = cell.dateKey === today;

            return (
              <Link
                key={cell.dateKey}
                href={hrefFor(monthKey, cell.dateKey)}
                scroll={false}
                className={cn(
                  'flex min-h-16 flex-col items-center rounded-md border px-0.5 py-1.5 text-xs transition-colors tnum',
                  !cell.inMonth && 'pointer-events-none opacity-25',
                  isSelected
                    ? 'border-ink bg-ink text-canvas'
                    : isOpen
                      ? 'border-line bg-canvas hover:border-accent'
                      : 'border-transparent bg-transparent text-muted/50 hover:border-line'
                )}
              >
                <span className={cn(isToday && !isSelected && 'rounded-full bg-accent px-1.5 text-canvas')}>
                  {dayOfMonth(cell.dateKey)}
                </span>

                {isOpen ? (
                  <span className={cn('mt-1 text-[9px] leading-tight', isSelected ? 'text-canvas/70' : 'text-muted')}>
                    {minutesToTime(cell.intervals[0].start)}
                  </span>
                ) : null}

                {cell.bookingCount > 0 ? (
                  <span
                    className={cn(
                      'mt-auto rounded-full px-1.5 text-[9px]',
                      isSelected ? 'bg-canvas/20 text-canvas' : 'bg-accent-soft text-accent'
                    )}
                  >
                    {cell.bookingCount}件
                  </span>
                ) : null}

                {cell.hasOverride || cell.blockCount > 0 ? (
                  <span aria-hidden className={cn('mt-0.5 block size-1 rounded-full', isSelected ? 'bg-canvas' : 'bg-danger/60')} />
                ) : null}
              </Link>
            );
          })}
        </div>

        <ul className="mt-4 flex flex-wrap gap-4 text-[10px] text-muted">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-2 rounded-sm border border-line bg-canvas" />
            営業日
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block rounded-full bg-accent-soft px-1.5 text-accent">n件</span>
            予約あり
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block size-1.5 rounded-full bg-danger/60" />
            臨時設定あり
          </li>
        </ul>
      </section>

      {detail ? (
        <DayEditor
          date={detail.date}
          dateLabel={formatLongDate(detail.date)}
          openLabel={
            detail.intervals.length > 0
              ? detail.intervals.map((iv) => `${minutesToTime(iv.start)}〜${minutesToTime(iv.end)}`).join(' / ')
              : null
          }
          overrides={detail.overrides}
          blocks={detail.blocks.map((b) => ({
            id: b.id,
            label: `${toTimeLabel(new Date(b.starts_at))}〜${toTimeLabel(new Date(b.ends_at))}`,
            reason: b.reason,
          }))}
          bookings={detail.bookings.map((b) => ({
            id: b.id,
            label: `${toTimeLabel(new Date(b.starts_at))}〜${toTimeLabel(new Date(b.ends_at))}`,
            name: b.customer_name,
            menu: b.menu_name,
          }))}
        />
      ) : null}

      <BusinessHoursEditor rows={businessHourRows} />
    </>
  );
}
