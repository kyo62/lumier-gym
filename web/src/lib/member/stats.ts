import type { BodyLog } from './types.ts';
import { parseDateString } from './dates.ts';

/** グラフに使う集計。画面から切り離してテストできるようにしてある。 */

export type BodyMetric = 'weightKg' | 'bodyFatPct' | 'muscleKg';

export const BODY_METRIC_LABELS: Record<BodyMetric, { label: string; unit: string; digits: number }> = {
  weightKg: { label: '体重', unit: 'kg', digits: 1 },
  bodyFatPct: { label: '体脂肪率', unit: '%', digits: 1 },
  muscleKg: { label: '筋肉量', unit: 'kg', digits: 1 },
};

export type SeriesPoint = { date: string; value: number };

/** 指定した項目の時系列（古い順）。同じ日に複数あれば、その日の最後の入力を採用する */
export function bodySeries(logs: BodyLog[], metric: BodyMetric): SeriesPoint[] {
  const byDate = new Map<string, SeriesPoint & { order: number }>();
  logs.forEach((log, index) => {
    const value = log[metric];
    if (value === null || value === undefined) return;
    // logs は新しい順で来る想定。同じ日は「先に出てきた＝新しい」入力を残す
    if (!byDate.has(log.loggedOn)) byDate.set(log.loggedOn, { date: log.loggedOn, value, order: index });
  });
  return [...byDate.values()]
    .sort((a, b) => parseDateString(a.date).getTime() - parseDateString(b.date).getTime())
    .map(({ date, value }) => ({ date, value }));
}

/** 最新の値と、その1つ前との差 */
export function latestChange(series: SeriesPoint[]): { latest: SeriesPoint; diff: number | null } | null {
  if (series.length === 0) return null;
  const latest = series[series.length - 1];
  const prev = series.length > 1 ? series[series.length - 2] : null;
  return { latest, diff: prev ? Math.round((latest.value - prev.value) * 100) / 100 : null };
}

/** グラフの縦軸の範囲。値が1つ・全部同じでも、線が潰れないように幅を持たせる */
export function yRange(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo === hi) return { min: lo - 1, max: hi + 1 };
  const pad = (hi - lo) * 0.15;
  return { min: lo - pad, max: hi + pad };
}

/** 日付ごとにまとめる（新しい日が先）。日付の中の並びは元の順のまま */
export function groupByDate<T extends { loggedOn: string }>(items: T[]): { date: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const list = map.get(item.loggedOn);
    if (list) list.push(item);
    else map.set(item.loggedOn, [item]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, list]) => ({ date, items: list }));
}
