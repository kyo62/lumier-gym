import {
  addDaysToKey,
  dateKeyRange,
  getJstWeekday,
  jstToDate,
  minutesToTime,
  normalizeTime,
  timeToMinutes,
  todayKey,
} from './time';

export type BusinessHour = {
  weekday: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
};

export type ScheduleOverride = {
  date: string;
  /** 'closed' = 休業（時刻指定があればその時間帯のみ）／'open' = 臨時営業（その日の営業時間を上書き） */
  kind: 'closed' | 'open';
  start_time: string | null;
  end_time: string | null;
};

/** 予約済み・ブロック済みの時間帯 */
export type BusyInterval = { starts_at: string; ends_at: string };

export type AvailabilityInput = {
  fromKey: string;
  toKey: string;
  /** 施術時間＋前後のバッファ。1件の予約が占有する分数 */
  blockMin: number;
  businessHours: BusinessHour[];
  overrides: ScheduleOverride[];
  busy: BusyInterval[];
  now?: Date;
  slotStepMin: number;
  leadTimeHours: number;
  maxAdvanceDays: number;
};

export type DayAvailability = {
  /** 'yyyy-MM-dd' */
  date: string;
  /** 予約可能な開始時刻（ISO 8601 / UTC） */
  slots: string[];
};

type Interval = { start: number; end: number };

/** 分単位の区間リストから、別の区間を差し引く */
function subtract(intervals: Interval[], cut: Interval): Interval[] {
  const result: Interval[] = [];
  for (const iv of intervals) {
    if (cut.end <= iv.start || cut.start >= iv.end) {
      result.push(iv);
      continue;
    }
    if (cut.start > iv.start) result.push({ start: iv.start, end: cut.start });
    if (cut.end < iv.end) result.push({ start: cut.end, end: iv.end });
  }
  return result;
}

/**
 * その日の「営業している時間帯」を分単位の区間で返す。
 *
 * 優先順位:
 *   1. その日に kind='open' の上書きがあれば、曜日テンプレートの代わりにそれを使う
 *   2. kind='closed' の上書きを差し引く（時刻指定が無ければ終日休業）
 */
export function openIntervalsFor(
  dateKey: string,
  businessHours: BusinessHour[],
  overrides: ScheduleOverride[]
): Interval[] {
  const dayOverrides = overrides.filter((o) => o.date === dateKey);
  const opens = dayOverrides.filter((o) => o.kind === 'open' && o.start_time && o.end_time);

  let intervals: Interval[];
  if (opens.length > 0) {
    intervals = opens.map((o) => ({
      start: timeToMinutes(o.start_time!),
      end: timeToMinutes(o.end_time!),
    }));
  } else {
    const weekday = getJstWeekday(dateKey);
    intervals = businessHours
      .filter((h) => h.is_open && h.weekday === weekday)
      .map((h) => ({ start: timeToMinutes(h.start_time), end: timeToMinutes(h.end_time) }));
  }

  for (const closed of dayOverrides.filter((o) => o.kind === 'closed')) {
    const cut: Interval =
      closed.start_time && closed.end_time
        ? { start: timeToMinutes(closed.start_time), end: timeToMinutes(closed.end_time) }
        : { start: 0, end: 24 * 60 };
    intervals = subtract(intervals, cut);
  }

  return intervals
    .filter((iv) => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);
}

/**
 * 予約可能な枠を算出する。
 *
 * 純粋関数（DBにもネットワークにも依存しない）なので、そのままテストできる。
 */
export function computeAvailability(input: AvailabilityInput): DayAvailability[] {
  const {
    fromKey,
    toKey,
    blockMin,
    businessHours,
    overrides,
    busy,
    slotStepMin,
    leadTimeHours,
    maxAdvanceDays,
    now = new Date(),
  } = input;

  const earliest = new Date(now.getTime() + leadTimeHours * 60 * 60 * 1000);
  const lastKey = addDaysToKey(todayKey(now), maxAdvanceDays);

  // 予約済み区間をミリ秒に変換しておく（日ごとに再計算しない）
  const busyRanges = busy
    .map((b) => ({ start: new Date(b.starts_at).getTime(), end: new Date(b.ends_at).getTime() }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end))
    .sort((a, b) => a.start - b.start);

  return dateKeyRange(fromKey, toKey).map((dateKey) => {
    if (dateKey > lastKey) return { date: dateKey, slots: [] };

    const slots: string[] = [];
    for (const interval of openIntervalsFor(dateKey, businessHours, overrides)) {
      for (let m = interval.start; m + blockMin <= interval.end; m += slotStepMin) {
        const start = jstToDate(dateKey, minutesToTime(m));
        const startMs = start.getTime();
        const endMs = startMs + blockMin * 60 * 1000;

        if (startMs < earliest.getTime()) continue;
        if (busyRanges.some((b) => startMs < b.end && endMs > b.start)) continue;

        slots.push(start.toISOString());
      }
    }
    return { date: dateKey, slots };
  });
}

/** 予約1件が占有する終了時刻を求める（施術時間＋バッファ） */
export function blockEnd(startsAt: Date, durationMin: number, bufferMin: number): Date {
  return new Date(startsAt.getTime() + (durationMin + bufferMin) * 60 * 1000);
}

/** 選択された開始時刻が、その日の営業時間の枠として妥当かを検証する（サーバー側の二重チェック用） */
export function isValidSlotStart(startsAt: Date, slotStepMin: number): boolean {
  const minutes = timeToMinutes(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(startsAt)
  );
  return minutes % slotStepMin === 0 && startsAt.getUTCSeconds() === 0;
}

export { normalizeTime };
