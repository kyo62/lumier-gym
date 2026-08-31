/**
 * 日時ユーティリティ。
 *
 * 方針:
 *  - DBには常に UTC（timestamptz）で保存する。
 *  - 画面表示と営業時間の計算は常に日本時間（Asia/Tokyo）で行う。
 *  - 日本標準時はサマータイムが無く固定 +09:00 のため、オフセットを直接扱える。
 */

export const JST_OFFSET = '+09:00';
export const TIME_ZONE = 'Asia/Tokyo';

/** 'yyyy-MM-dd' + 'HH:mm'（JST）→ UTCのDate */
export function jstToDate(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${normalizeTime(time)}:00${JST_OFFSET}`);
}

/** 'HH:mm' / 'HH:mm:ss' を 'HH:mm' に揃える */
export function normalizeTime(time: string): string {
  return time.slice(0, 5);
}

const jstDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Date → JSTの日付キー 'yyyy-MM-dd' */
export function toDateKey(date: Date): string {
  return jstDateFormatter.format(date);
}

const jstTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Date → JSTの時刻 'HH:mm' */
export function toTimeLabel(date: Date): string {
  return jstTimeFormatter.format(date);
}

/** JSTでの曜日 (0=日) */
export function getJstWeekday(dateKey: string): number {
  return jstToDate(dateKey, '12:00').getUTCDay();
}

/** 日付キーに日数を加算した日付キーを返す */
export function addDaysToKey(dateKey: string, days: number): string {
  const base = jstToDate(dateKey, '12:00');
  base.setUTCDate(base.getUTCDate() + days);
  return toDateKey(base);
}

/** from〜to（両端含む）の日付キーの配列 */
export function dateKeyRange(from: string, to: string): string[] {
  const keys: string[] = [];
  let cursor = from;
  // 上限を設けて、引数が壊れていた場合の無限ループを防ぐ
  for (let i = 0; cursor <= to && i < 400; i++) {
    keys.push(cursor);
    cursor = addDaysToKey(cursor, 1);
  }
  return keys;
}

/** 'HH:mm' → 0時からの経過分 */
export function timeToMinutes(time: string): number {
  const [h, m] = normalizeTime(time).split(':').map(Number);
  return h * 60 + m;
}

/** 0時からの経過分 → 'HH:mm' */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

const longDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
});

/** 例: 2026年4月20日(月) */
export function formatLongDate(value: Date | string): string {
  const date = typeof value === 'string' ? jstToDate(value, '12:00') : value;
  return longDateFormatter.format(date).replace(/\s/g, '');
}

/** 例: 2026年4月20日(月) 14:00 */
export function formatDateTime(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${formatLongDate(date)} ${toTimeLabel(date)}`;
}

/** 現在時刻のJST日付キー */
export function todayKey(now: Date = new Date()): string {
  return toDateKey(now);
}
