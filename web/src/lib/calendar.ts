import { addDaysToKey, getJstWeekday, jstToDate, toDateKey } from './time';

/** 'yyyy-MM' → その月の1日の日付キー */
export function monthStartKey(monthKey: string): string {
  return `${monthKey}-01`;
}

/** 日付キー → 'yyyy-MM' */
export function toMonthKey(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** その月の末日の日付キー */
export function monthEndKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  // 翌月0日 = 当月末日
  const last = new Date(Date.UTC(year, month, 0));
  return toDateKey(new Date(last.getTime() + 12 * 60 * 60 * 1000));
}

/** 月を前後に移動する */
export function shiftMonth(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type CalendarCell = { dateKey: string; inMonth: boolean };

/**
 * 日曜始まりの月カレンダー（6週ぶんの42セル）を作る。
 * 前後の月の日付も含めることで、グリッドの行数が月によって変わらない。
 */
export function buildMonthGrid(monthKey: string): CalendarCell[] {
  const start = monthStartKey(monthKey);
  const end = monthEndKey(monthKey);
  const leading = getJstWeekday(start);

  const cells: CalendarCell[] = [];
  let cursor = addDaysToKey(start, -leading);
  for (let i = 0; i < 42; i++) {
    cells.push({ dateKey: cursor, inMonth: cursor >= start && cursor <= end });
    cursor = addDaysToKey(cursor, 1);
  }
  return cells;
}

/** 日付キーの「日」の部分（1〜31） */
export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

/** 表示用: 2026年4月 */
export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  return `${year}年${Number(month)}月`;
}

export { jstToDate };
