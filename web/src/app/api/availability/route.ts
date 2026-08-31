import { NextResponse } from 'next/server';
import { menuById, booking as policy } from '@/config/site';
import { getAvailability } from '@/lib/bookings';
import { addDaysToKey, todayKey } from '@/lib/time';

export const dynamic = 'force-dynamic';

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/availability?menuId=trial&from=2026-04-01&to=2026-04-30
 *
 * 返すのは「予約可能な開始時刻の配列」だけ。
 * 他のお客様の予約情報（誰が・いつ）はブラウザに一切渡さない。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const menuId = url.searchParams.get('menuId') ?? '';
  const menu = menuById(menuId);
  if (!menu) {
    return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 400 });
  }

  const today = todayKey();
  const from = url.searchParams.get('from') ?? today;
  const to = url.searchParams.get('to') ?? addDaysToKey(from, 31);

  if (!DATE_KEY.test(from) || !DATE_KEY.test(to) || from > to) {
    return NextResponse.json({ error: '日付の指定が不正です' }, { status: 400 });
  }
  // 一度に取得できる範囲を制限しておく（過大なリクエスト対策）
  const cappedTo = to > addDaysToKey(from, 62) ? addDaysToKey(from, 62) : to;
  const cappedFrom = from < today ? today : from;

  try {
    const { days, demo } = await getAvailability(menu, cappedFrom, cappedTo);
    return NextResponse.json(
      { days, demo, policy: { leadTimeHours: policy.leadTimeHours, maxAdvanceDays: policy.maxAdvanceDays } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[availability]', error);
    return NextResponse.json({ error: '空き状況を取得できませんでした' }, { status: 500 });
  }
}
