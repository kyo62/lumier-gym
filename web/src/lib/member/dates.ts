/**
 * 日付の扱い。
 *
 * `new Date().toISOString()` は UTC なので、日本の朝9時前は「昨日」になってしまう。
 * 記録の日付は端末のローカル日付（＝お客様が見ているカレンダー）で扱う。
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** ローカル日付を yyyy-mm-dd で返す */
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayLocal(now: Date = new Date()): string {
  return toDateString(now);
}

/** yyyy-mm-dd として実在する日付か（2月30日などを弾く） */
export function isValidDateString(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** yyyy-mm-dd → その日のローカル 0 時（タイムゾーンずれを避けるため分解して作る） */
export function parseDateString(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 「10月3日（金）」 */
export function formatDateJa(value: string): string {
  if (!isValidDateString(value)) return value;
  const d = parseDateString(value);
  return `${d.getMonth() + 1}月${d.getDate()}日（${WEEKDAYS[d.getDay()]}）`;
}

/** 「2026年10月3日」 */
export function formatDateFullJa(value: string): string {
  if (!isValidDateString(value)) return value;
  const d = parseDateString(value);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 日数の差（b - a）。夏時間のない日本では単純だが、念のため日付だけで数える */
export function daysBetween(a: string, b: string): number {
  const ms = Date.UTC(...ymd(b)) - Date.UTC(...ymd(a));
  return Math.round(ms / 86_400_000);
}

function ymd(value: string): [number, number, number] {
  const [y, m, d] = value.split('-').map(Number);
  return [y, m - 1, d];
}
