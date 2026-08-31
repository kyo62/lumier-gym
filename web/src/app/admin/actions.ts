'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient, getAdminUser } from '@/lib/supabase/server';
import { canWriteBookings, env, isSupabaseConfigured } from '@/lib/env';
import { blockInputSchema, businessHourInputSchema, overrideInputSchema } from '@/lib/validation';
import { jstToDate } from '@/lib/time';

type ActionResult = { error?: string; message?: string };

/** すべての管理操作の入口でログイン状態を確認する */
async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');
  if (!canWriteBookings()) throw new Error('SUPABASE_SERVICE_ROLE_KEY が未設定です');
  return user;
}

/* -------------------------------------------------------------------------- */
/* ログイン                                                                    */
/* -------------------------------------------------------------------------- */

export async function sendMagicLink(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { error: 'Supabaseの環境変数が未設定です。' };

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) return { error: 'メールアドレスを入力してください。' };

  // 許可されたアドレス以外にはメールを送らない（総当たりでの送信を防ぐ）
  if (!env.adminEmail || email !== env.adminEmail.toLowerCase()) {
    return { error: 'このメールアドレスは管理者として登録されていません。' };
  }

  const host = (await headers()).get('host');
  const proto = host?.startsWith('localhost') || host?.startsWith('127.') ? 'http' : 'https';
  const origin = env.siteUrl || `${proto}://${host}`;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/admin` },
  });

  if (error) return { error: `ログインリンクを送信できませんでした: ${error.message}` };
  return { message: 'ログイン用のリンクをメールでお送りしました。メール内のリンクを開いてください。' };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}

/* -------------------------------------------------------------------------- */
/* 予約の操作                                                                  */
/* -------------------------------------------------------------------------- */

export async function updateBookingStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['confirmed', 'cancelled', 'done'].includes(status)) return;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('bookings')
    .update({ status, cancelled_at: status === 'cancelled' ? new Date().toISOString() : null })
    .eq('id', id);

  // キャンセル済みの予約を「予約済み」に戻すとき、その枠に別の予約が
  // 入っていると排他制約(23P01)に触れる。画面を落とさずログに残す。
  if (error) console.error('[admin] 予約ステータスの更新に失敗しました', error);

  revalidatePath('/admin');
  revalidatePath('/admin/schedule');
}

export async function saveBookingMemo(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const memo = String(formData.get('memo') ?? '').slice(0, 2000);
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from('bookings').update({ admin_memo: memo || null }).eq('id', id);
  revalidatePath('/admin');
}

/* -------------------------------------------------------------------------- */
/* スケジュールの操作                                                          */
/* -------------------------------------------------------------------------- */

/** 臨時休業・臨時営業を登録する */
export async function addOverride(formData: FormData): Promise<void> {
  await requireAdmin();

  const raw = {
    date: String(formData.get('date') ?? ''),
    kind: String(formData.get('kind') ?? ''),
    startTime: (formData.get('startTime') as string) || null,
    endTime: (formData.get('endTime') as string) || null,
    note: (formData.get('note') as string) || undefined,
  };
  const parsed = overrideInputSchema.safeParse(raw);
  if (!parsed.success) return;

  const supabase = createAdminClient();
  await supabase.from('schedule_overrides').insert({
    date: parsed.data.date,
    kind: parsed.data.kind,
    start_time: parsed.data.startTime ?? null,
    end_time: parsed.data.endTime ?? null,
    note: parsed.data.note ?? null,
  });

  revalidatePath('/admin/schedule');
}

export async function deleteOverride(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await createAdminClient().from('schedule_overrides').delete().eq('id', id);
  revalidatePath('/admin/schedule');
}

/** 予約枠のブロック（私用など）を登録する */
export async function addBlock(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = blockInputSchema.safeParse({
    date: String(formData.get('date') ?? ''),
    startTime: String(formData.get('startTime') ?? ''),
    endTime: String(formData.get('endTime') ?? ''),
    reason: (formData.get('reason') as string) || undefined,
  });
  if (!parsed.success) return;

  const supabase = createAdminClient();
  await supabase.from('slot_blocks').insert({
    starts_at: jstToDate(parsed.data.date, parsed.data.startTime).toISOString(),
    ends_at: jstToDate(parsed.data.date, parsed.data.endTime).toISOString(),
    reason: parsed.data.reason ?? null,
  });

  revalidatePath('/admin/schedule');
}

export async function deleteBlock(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await createAdminClient().from('slot_blocks').delete().eq('id', id);
  revalidatePath('/admin/schedule');
}

/** 定期営業日テンプレートを追加する */
export async function addBusinessHour(formData: FormData): Promise<void> {
  await requireAdmin();

  const parsed = businessHourInputSchema.safeParse({
    weekday: Number(formData.get('weekday')),
    startTime: String(formData.get('startTime') ?? ''),
    endTime: String(formData.get('endTime') ?? ''),
  });
  if (!parsed.success) return;

  await createAdminClient().from('business_hours').insert({
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
    is_open: true,
  });

  revalidatePath('/admin/schedule');
  revalidatePath('/');
}

export async function deleteBusinessHour(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  if (!id) return;
  await createAdminClient().from('business_hours').delete().eq('id', id);
  revalidatePath('/admin/schedule');
}
