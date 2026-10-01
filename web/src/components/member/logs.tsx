'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { formatDateFullJa, formatDateJa, parseDateString } from '@/lib/member/dates';
import {
  BODY_METRIC_LABELS,
  bodySeries,
  groupByDate,
  latestChange,
  yRange,
  type BodyMetric,
  type SeriesPoint,
} from '@/lib/member/stats';
import { MEAL_TYPE_LABELS, type BodyLog, type MealLog, type WorkoutLog } from '@/lib/member/types';
import { Card, ConfirmButton, EmptyState } from './ui';

/** 記録ページ共通の切り替え（体組成／食事／トレーニング） */
export function RecordTabs() {
  const pathname = usePathname() ?? '';
  const items = [
    { href: '/member/body', label: '体組成' },
    { href: '/member/meals', label: '食事' },
    { href: '/member/workouts', label: 'トレーニング' },
  ];
  return (
    <div role="tablist" aria-label="記録の種類" className="mb-7 grid grid-cols-3 rounded-full border border-line bg-surface p-1">
      {items.map((item) => {
        const active = pathname.replace(/\/$/, '') === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={cn(
              'rounded-full py-2.5 text-center text-xs tracking-wider transition-colors',
              active ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

/** 数値の見た目：末尾の 0 を落とす（52.40 → 52.4） */
export const fmt = (n: number, digits = 1) => String(Number(n.toFixed(digits)));

/* -------------------------------------------------------------------------- */
/* 折れ線グラフ                                                                 */
/* -------------------------------------------------------------------------- */

const W = 320;
const H = 168;
const PAD = { top: 26, right: 14, bottom: 30, left: 14 };

export function LineChart({ points, metric }: { points: SeriesPoint[]; metric: BodyMetric }) {
  const { label, unit, digits } = BODY_METRIC_LABELS[metric];
  if (points.length === 0) return <EmptyState title={`${label}の記録はまだありません`} />;

  const times = points.map((p) => parseDateString(p.date).getTime());
  const [t0, t1] = [Math.min(...times), Math.max(...times)];
  const { min, max } = yRange(points.map((p) => p.value));

  const x = (t: number) => (t1 === t0 ? W / 2 : PAD.left + ((t - t0) / (t1 - t0)) * (W - PAD.left - PAD.right));
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * (H - PAD.top - PAD.bottom);

  const coords = points.map((p, i) => ({ ...p, cx: x(times[i]), cy: y(p.value) }));
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  const first = coords[0];

  // 端に寄った点のラベルが枠からはみ出さないよう、寄せ方を変える
  const anchor = last.cx > W - 48 ? 'end' : last.cx < 48 ? 'start' : 'middle';

  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${label}の推移。最新は${fmt(last.value, digits)}${unit}（${formatDateFullJa(last.date)}）`}
      >
        {/* 上下の目安線 */}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top} y2={PAD.top} stroke="#ddd5c8" strokeDasharray="2 4" />
        <line x1={PAD.left} x2={W - PAD.right} y1={H - PAD.bottom} y2={H - PAD.bottom} stroke="#ddd5c8" />
        {coords.length > 1 ? (
          <path d={line} fill="none" stroke="#a8894f" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {coords.map((c) => (
          <circle key={c.date} cx={c.cx} cy={c.cy} r={c === last ? 5 : 3} fill={c === last ? '#a8894f' : '#fffdfa'} stroke="#a8894f" strokeWidth={2} />
        ))}
        <text x={Math.min(Math.max(last.cx, 30), W - 30)} y={last.cy - 12} textAnchor={anchor} fontSize={12} fill="#2e2b27" className="tnum">
          {fmt(last.value, digits)}
          {unit}
        </text>
        <text x={PAD.left} y={H - 9} fontSize={10} fill="#6f6961">
          {formatDateJa(first.date).replace(/（.）/, '')}
        </text>
        {coords.length > 1 ? (
          <text x={W - PAD.right} y={H - 9} fontSize={10} fill="#6f6961" textAnchor="end">
            {formatDateJa(last.date).replace(/（.）/, '')}
          </text>
        ) : null}
      </svg>
    </figure>
  );
}

const METRICS: BodyMetric[] = ['weightKg', 'bodyFatPct', 'muscleKg'];

/** 体組成のグラフ。体重・体脂肪率・筋肉量を切り替えられる（会員の記録ページと、施術者の閲覧で共通） */
export function BodyChartCard({ logs }: { logs: BodyLog[] }) {
  const [metric, setMetric] = useState<BodyMetric>('weightKg');
  const series = Object.fromEntries(METRICS.map((m) => [m, bodySeries(logs, m)])) as Record<BodyMetric, SeriesPoint[]>;
  // 選んだ項目に記録がなければ、記録のある最初の項目に切り替える
  const available = METRICS.filter((m) => series[m].length > 0);
  const active = available.includes(metric) ? metric : (available[0] ?? 'weightKg');
  const change = latestChange(series[active]);
  const meta = BODY_METRIC_LABELS[active];

  return (
    <Card>
      <div role="tablist" aria-label="グラフの項目" className="mb-4 flex gap-2">
        {METRICS.map((m) => {
          const isActive = m === active;
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={series[m].length === 0}
              onClick={() => setMetric(m)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors disabled:opacity-40',
                isActive ? 'border-ink bg-ink text-canvas' : 'border-line text-muted hover:border-brass'
              )}
            >
              {BODY_METRIC_LABELS[m].label}
            </button>
          );
        })}
      </div>
      <LineChart points={series[active]} metric={active} />
      {change ? (
        <p className="tnum mt-3 text-xs text-muted">
          最新（{formatDateFullJa(change.latest.date)}）：
          <b className="font-medium text-ink">
            {fmt(change.latest.value, meta.digits)}
            {meta.unit}
          </b>
          {change.diff !== null ? (
            <span className="ml-2">
              前回との差 {change.diff > 0 ? '+' : change.diff < 0 ? '−' : '±'}
              {fmt(Math.abs(change.diff), 2)}
              {meta.unit}
            </span>
          ) : null}
        </p>
      ) : null}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* 記録の一覧                                                                   */
/* -------------------------------------------------------------------------- */

type Deleter = (id: string) => Promise<void> | void;

function DateHeading({ date }: { date: string }) {
  return <h3 className="mb-2 font-sans text-xs font-normal tracking-wider text-muted">{formatDateJa(date)}</h3>;
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete?: () => void | Promise<void> }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3.5">
      <div className="min-w-0 flex-1 text-sm leading-7">{children}</div>
      {onDelete ? <ConfirmButton label="削除" onConfirm={onDelete} className="-mr-2 shrink-0" /> : null}
    </li>
  );
}

const Note = ({ text }: { text: string }) =>
  text ? <p className="mt-1 text-xs leading-6 whitespace-pre-wrap text-muted">{text}</p> : null;

export function BodyList({ logs, onDelete }: { logs: BodyLog[]; onDelete?: Deleter }) {
  if (logs.length === 0) return <EmptyState title="まだ記録がありません" />;
  return (
    <div className="space-y-6">
      {groupByDate(logs).map(({ date, items }) => (
        <div key={date}>
          <DateHeading date={date} />
          <ul className="space-y-2">
            {items.map((l) => (
              <Row key={l.id} onDelete={onDelete ? () => onDelete(l.id) : undefined}>
                <p className="tnum flex flex-wrap gap-x-4">
                  {l.weightKg !== null ? <span>体重 {fmt(l.weightKg, 2)}kg</span> : null}
                  {l.bodyFatPct !== null ? <span>体脂肪率 {fmt(l.bodyFatPct)}%</span> : null}
                  {l.muscleKg !== null ? <span>筋肉量 {fmt(l.muscleKg, 2)}kg</span> : null}
                </p>
                <Note text={l.note} />
              </Row>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function MealList({ logs, onDelete }: { logs: MealLog[]; onDelete?: Deleter }) {
  if (logs.length === 0) return <EmptyState title="まだ記録がありません" />;
  return (
    <div className="space-y-6">
      {groupByDate(logs).map(({ date, items }) => (
        <div key={date}>
          <DateHeading date={date} />
          <ul className="space-y-2">
            {items.map((l) => (
              <Row key={l.id} onDelete={onDelete ? () => onDelete(l.id) : undefined}>
                <p>
                  <span className="mr-2 inline-block rounded-full bg-brass-soft px-2.5 py-0.5 text-[11px] leading-5 tracking-wider text-ink">
                    {MEAL_TYPE_LABELS[l.mealType]}
                  </span>
                  {l.content}
                </p>
                <Note text={l.note} />
              </Row>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function WorkoutList({ logs, onDelete }: { logs: WorkoutLog[]; onDelete?: Deleter }) {
  if (logs.length === 0) return <EmptyState title="まだ記録がありません" />;
  return (
    <div className="space-y-6">
      {groupByDate(logs).map(({ date, items }) => (
        <div key={date}>
          <DateHeading date={date} />
          <ul className="space-y-2">
            {items.map((l) => (
              <Row key={l.id} onDelete={onDelete ? () => onDelete(l.id) : undefined}>
                <p>
                  <span className="font-medium">{l.exercise}</span>
                  <span className="tnum ml-3 text-muted">
                    {[
                      l.weightKg !== null ? `${fmt(l.weightKg, 2)}kg` : null,
                      l.reps !== null ? `${l.reps}回` : null,
                      l.sets !== null ? `${l.sets}セット` : null,
                    ]
                      .filter(Boolean)
                      .join(' × ')}
                  </span>
                </p>
                <Note text={l.note} />
              </Row>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
