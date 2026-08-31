import 'server-only';
import { createAdminClient } from './supabase/admin';
import { canWriteBookings } from './env';
import {
  computeAvailability,
  type BusinessHour,
  type BusyInterval,
  type DayAvailability,
  type ScheduleOverride,
} from './availability';
import { booking as policy, defaultBusinessHours, type Menu } from '@/config/site';
import { addDaysToKey, todayKey } from './time';

/** デモモード（Supabase未設定）で使う、設定ファイル由来の営業時間 */
function fallbackBusinessHours(): BusinessHour[] {
  return defaultBusinessHours.map((h) => ({
    weekday: h.weekday,
    start_time: h.startTime,
    end_time: h.endTime,
    is_open: true,
  }));
}

export type ScheduleData = {
  businessHours: BusinessHour[];
  overrides: ScheduleOverride[];
  busy: BusyInterval[];
  /** Supabaseが未設定でサンプル表示になっているか */
  demo: boolean;
};

/** 空き枠の計算に必要なデータを、指定期間ぶんまとめて取得する */
export async function loadScheduleData(fromKey: string, toKey: string): Promise<ScheduleData> {
  // service_role キーまで揃っていないと管理クライアントを作れないため、
  // 中途半端な設定のときも 500 ではなくデモ表示にフォールバックする
  if (!canWriteBookings()) {
    return { businessHours: fallbackBusinessHours(), overrides: [], busy: [], demo: true };
  }

  const supabase = createAdminClient();
  // 期間の前後に余裕を持たせて取得する（枠が日付をまたぐケースを取りこぼさない）
  const rangeStart = `${addDaysToKey(fromKey, -1)}T00:00:00Z`;
  const rangeEnd = `${addDaysToKey(toKey, 2)}T00:00:00Z`;

  const [hours, overrides, bookings, blocks] = await Promise.all([
    supabase.from('business_hours').select('weekday, start_time, end_time, is_open'),
    supabase
      .from('schedule_overrides')
      .select('date, kind, start_time, end_time')
      .gte('date', fromKey)
      .lte('date', toKey),
    supabase
      .from('bookings')
      .select('starts_at, ends_at')
      .eq('status', 'confirmed')
      .gte('starts_at', rangeStart)
      .lt('starts_at', rangeEnd),
    supabase
      .from('slot_blocks')
      .select('starts_at, ends_at')
      .gte('starts_at', rangeStart)
      .lt('starts_at', rangeEnd),
  ]);

  const firstError = hours.error ?? overrides.error ?? bookings.error ?? blocks.error;
  if (firstError) throw new Error(`予約データの取得に失敗しました: ${firstError.message}`);

  return {
    businessHours: (hours.data ?? []) as BusinessHour[],
    overrides: (overrides.data ?? []) as ScheduleOverride[],
    busy: [...(bookings.data ?? []), ...(blocks.data ?? [])] as BusyInterval[],
    demo: false,
  };
}

/** 指定メニューの、指定期間の空き枠を返す */
export async function getAvailability(
  menu: Menu,
  fromKey: string,
  toKey: string
): Promise<{ days: DayAvailability[]; demo: boolean }> {
  const schedule = await loadScheduleData(fromKey, toKey);
  const days = computeAvailability({
    fromKey,
    toKey,
    blockMin: menu.durationMin + menu.bufferMin,
    businessHours: schedule.businessHours,
    overrides: schedule.overrides,
    busy: schedule.busy,
    slotStepMin: policy.slotStepMin,
    leadTimeHours: policy.leadTimeHours,
    maxAdvanceDays: policy.maxAdvanceDays,
  });
  return { days, demo: schedule.demo };
}

export type CreateBookingResult =
  | { ok: true; id: string; cancelToken: string }
  | { ok: false; code: 'unavailable' | 'conflict' | 'not_configured' | 'error'; message: string };

/**
 * 予約を作成する。
 *
 * 空き枠の再検証 → INSERT の順で行うが、同時アクセスでこの間に別の予約が入る可能性がある。
 * そのため最終的な重複判定はDBの排他制約（bookings_no_overlap）に任せ、
 * 制約違反（23P01）を「満席」として扱う。
 */
export async function createBooking(params: {
  menu: Menu;
  startsAt: Date;
  name: string;
  kana?: string;
  phone: string;
  email: string;
  concern?: string;
  note?: string;
}): Promise<CreateBookingResult> {
  const { menu, startsAt } = params;

  if (!canWriteBookings()) {
    return {
      ok: false,
      code: 'not_configured',
      message:
        'Supabaseが未設定のため予約を保存できません（デモモード）。README の手順に従って環境変数を設定してください。',
    };
  }

  const dateKey = todayKey(startsAt);
  const { days } = await getAvailability(menu, dateKey, dateKey);
  const iso = startsAt.toISOString();
  const stillOpen = days.some((d) => d.slots.includes(iso));
  if (!stillOpen) {
    return { ok: false, code: 'unavailable', message: 'その時間帯は予約できません。別の枠をお選びください。' };
  }

  const endsAt = new Date(startsAt.getTime() + (menu.durationMin + menu.bufferMin) * 60 * 1000);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      menu_id: menu.id,
      menu_name: menu.name,
      menu_duration_min: menu.durationMin,
      menu_price: menu.price,
      starts_at: iso,
      ends_at: endsAt.toISOString(),
      customer_name: params.name,
      customer_kana: params.kana || null,
      phone: params.phone,
      email: params.email,
      concern: params.concern || null,
      note: params.note || null,
    })
    .select('id, cancel_token')
    .single();

  if (error) {
    // 23P01 = exclusion_violation（排他制約違反 = 同じ時間帯に別の予約が入った）
    if (error.code === '23P01') {
      return {
        ok: false,
        code: 'conflict',
        message: '申し訳ありません、たった今その枠が埋まりました。別の時間をお選びください。',
      };
    }
    console.error('[bookings] 登録に失敗しました', error);
    return { ok: false, code: 'error', message: '予約の登録に失敗しました。時間をおいて再度お試しください。' };
  }

  return { ok: true, id: data.id as string, cancelToken: data.cancel_token as string };
}
