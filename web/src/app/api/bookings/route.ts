import { NextResponse } from 'next/server';
import { bookingInputSchema } from '@/lib/validation';
import { menuById } from '@/config/site';
import { createBooking } from '@/lib/bookings';
import { verifyTurnstile } from '@/lib/turnstile';
import { sendAdminNotification, sendCustomerConfirmation } from '@/lib/mail';

export const dynamic = 'force-dynamic';

/** POST /api/bookings — 予約の確定 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 });
  }

  const parsed = bookingInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: '入力内容をご確認ください', issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for');
  if (!(await verifyTurnstile(input.turnstileToken, ip))) {
    return NextResponse.json({ error: '自動送信の確認に失敗しました。ページを再読み込みしてお試しください。' }, { status: 400 });
  }

  const menu = menuById(input.menuId);
  if (!menu) return NextResponse.json({ error: 'メニューが見つかりません' }, { status: 400 });

  const startsAt = new Date(input.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: '日時の指定が不正です' }, { status: 400 });
  }

  const result = await createBooking({
    menu,
    startsAt,
    name: input.name,
    kana: input.kana || undefined,
    phone: input.phone,
    email: input.email,
    concern: input.concern || undefined,
    note: input.note || undefined,
  });

  if (!result.ok) {
    const status = result.code === 'conflict' || result.code === 'unavailable' ? 409 : 503;
    return NextResponse.json({ error: result.message, code: result.code }, { status });
  }

  // メール送信の失敗で予約自体を失敗させない（予約はすでに確定している）
  const mailData = {
    id: result.id,
    menuName: menu.name,
    menuPrice: menu.price,
    menuDurationMin: menu.durationMin,
    startsAt: startsAt.toISOString(),
    customerName: input.name,
    phone: input.phone,
    email: input.email,
    concern: input.concern,
    note: input.note,
    cancelToken: result.cancelToken,
  };
  const mailResults = await Promise.allSettled([
    sendCustomerConfirmation(mailData),
    sendAdminNotification(mailData),
  ]);
  for (const r of mailResults) {
    if (r.status === 'rejected') console.error('[bookings] 通知メールの送信に失敗', r.reason);
  }

  return NextResponse.json({ ok: true, id: result.id, cancelToken: result.cancelToken });
}
