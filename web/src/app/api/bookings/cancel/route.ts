import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { canWriteBookings } from '@/lib/env';
import { sendCancellationNotice } from '@/lib/mail';

export const dynamic = 'force-dynamic';

const schema = z.object({ token: z.uuid() });

/**
 * POST /api/bookings/cancel — お客様自身によるキャンセル。
 * 推測できないトークン（UUID）を知っていることを本人確認の代わりとする。
 */
export async function POST(request: Request) {
  if (!canWriteBookings()) {
    return NextResponse.json({ error: 'Supabaseが未設定です' }, { status: 503 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'リクエストが不正です' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('cancel_token', parsed.data.token)
    .eq('status', 'confirmed')
    .select('id, menu_name, menu_price, menu_duration_min, starts_at, customer_name, phone, email, cancel_token')
    .maybeSingle();

  if (error) {
    console.error('[cancel]', error);
    return NextResponse.json({ error: 'キャンセル処理に失敗しました' }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: '対象の予約が見つかりませんでした（すでにキャンセル済みの可能性があります）' }, { status: 404 });
  }

  try {
    await sendCancellationNotice({
      id: data.id,
      menuName: data.menu_name,
      menuPrice: data.menu_price,
      menuDurationMin: data.menu_duration_min,
      startsAt: data.starts_at,
      customerName: data.customer_name,
      phone: data.phone,
      email: data.email,
      cancelToken: data.cancel_token,
    });
  } catch (mailError) {
    console.error('[cancel] 通知メールの送信に失敗', mailError);
  }

  return NextResponse.json({ ok: true });
}
