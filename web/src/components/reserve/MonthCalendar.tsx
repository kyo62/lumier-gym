'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthGrid, dayOfMonth, formatMonthLabel, shiftMonth } from '@/lib/calendar';
import { WEEKDAY_LABELS } from '@/config/site';
import { cn } from '@/lib/utils';

export function MonthCalendar({
  monthKey,
  onMonthChange,
  slotsByDate,
  selectedDate,
  onSelectDate,
  minMonthKey,
  maxMonthKey,
  loading,
}: {
  monthKey: string;
  onMonthChange: (monthKey: string) => void;
  slotsByDate: Record<string, string[]>;
  selectedDate: string | null;
  onSelectDate: (dateKey: string) => void;
  minMonthKey: string;
  maxMonthKey: string;
  loading: boolean;
}) {
  const cells = buildMonthGrid(monthKey);
  const canGoBack = monthKey > minMonthKey;
  const canGoForward = monthKey < maxMonthKey;

  return (
    <div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, -1))}
          disabled={!canGoBack}
          className="flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30"
          aria-label="前の月"
        >
          <ChevronLeft size={17} />
        </button>

        <p className="font-serif text-lg tnum" aria-live="polite">
          {formatMonthLabel(monthKey)}
        </p>

        <button
          type="button"
          onClick={() => onMonthChange(shiftMonth(monthKey, 1))}
          disabled={!canGoForward}
          className="flex size-10 items-center justify-center rounded-full border border-line text-ink transition-colors enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30"
          aria-label="次の月"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'pb-2 text-[11px] tracking-widest',
              i === 0 ? 'text-danger/70' : i === 6 ? 'text-accent' : 'text-muted'
            )}
          >
            {label}
          </div>
        ))}

        {cells.map((cell) => {
          const count = slotsByDate[cell.dateKey]?.length ?? 0;
          const selectable = cell.inMonth && count > 0;
          const selected = selectedDate === cell.dateKey;

          return (
            <button
              key={cell.dateKey}
              type="button"
              disabled={!selectable}
              onClick={() => onSelectDate(cell.dateKey)}
              aria-label={`${cell.dateKey} ${count > 0 ? `空き${count}枠` : '空きなし'}`}
              aria-pressed={selected}
              className={cn(
                'flex aspect-square flex-col items-center justify-center rounded-md border text-sm transition-colors tnum',
                !cell.inMonth && 'invisible',
                selected
                  ? 'border-ink bg-ink text-canvas'
                  : selectable
                    ? 'border-line bg-surface text-ink hover:border-accent hover:text-accent'
                    : 'cursor-not-allowed border-transparent bg-transparent text-muted/35'
              )}
            >
              <span>{dayOfMonth(cell.dateKey)}</span>
              {/* 空き枠がある日にだけ点を打つ。数字だけでは空きの有無が伝わらない */}
              <span
                aria-hidden
                className={cn(
                  'mt-1 block size-1 rounded-full',
                  selectable ? (selected ? 'bg-canvas' : 'bg-accent') : 'bg-transparent'
                )}
              />
            </button>
          );
        })}
      </div>

      <p className="mt-4 flex items-center gap-2 text-[11px] text-muted">
        <span aria-hidden className="inline-block size-1 rounded-full bg-accent" />
        空きあり
        {loading ? <span className="ml-auto animate-pulse">空き状況を読み込んでいます…</span> : null}
      </p>
    </div>
  );
}
