import { Resend } from 'resend';
import { env, isMailConfigured } from './env';
import { site, booking as bookingPolicy } from '@/config/site';
import { formatDateTime } from './time';
import { yen } from './utils';

export type BookingMailData = {
  id: string;
  menuName: string;
  menuPrice: number;
  menuDurationMin: number;
  startsAt: string;
  customerName: string;
  phone: string;
  email: string;
  concern?: string | null;
  note?: string | null;
  cancelToken: string;
};

function cancelUrl(token: string) {
  const base = env.siteUrl || site.url;
  return `${base.replace(/\/$/, '')}/cancel/${token}`;
}

/**
 * メールを送る。未設定なら何もしない（予約自体は成立させる）。
 * 送信失敗で予約処理を落とさないよう、呼び出し側で握りつぶす前提。
 */
async function send(to: string, subject: string, text: string) {
  if (!isMailConfigured()) {
    console.warn('[mail] RESEND_API_KEY / MAIL_FROM が未設定のため送信をスキップしました:', subject);
    return;
  }
  const resend = new Resend(env.resendApiKey);
  const { error } = await resend.emails.send({ from: env.mailFrom, to, subject, text });
  if (error) throw new Error(`メール送信に失敗しました: ${error.message}`);
}

export async function sendCustomerConfirmation(data: BookingMailData) {
  const text = [
    `${data.customerName} 様`,
    '',
    `${site.name}へのご予約ありがとうございます。以下の内容で承りました。`,
    '',
    '──────────────────',
    `ご予約日時： ${formatDateTime(data.startsAt)}`,
    `メニュー　： ${data.menuName}（${data.menuDurationMin}分）`,
    `料金　　　： ${yen(data.menuPrice)}`,
    '──────────────────',
    '',
    '【場所】',
    `${site.address.prefecture}${site.address.city}${site.address.street}`,
    ...site.address.access.map((line) => line),
    '',
    '【持ち物】',
    '動きやすい服装をお持ちください（着替えスペースがございます）。',
    '',
    '【キャンセルについて】',
    ...bookingPolicy.cancelPolicy.map((line) => `・${line}`),
    '',
    'ご予約のキャンセルは、下記のURLからお手続きいただけます。',
    cancelUrl(data.cancelToken),
    '',
    'お会いできるのを楽しみにしております。',
    '',
    `${site.name}（${site.tagline}）`,
    site.url,
  ].join('\n');

  await send(data.email, `【${site.name}】ご予約を承りました（${formatDateTime(data.startsAt)}）`, text);
}

export async function sendAdminNotification(data: BookingMailData) {
  if (!env.adminEmail) return;
  const text = [
    '新しい予約が入りました。',
    '',
    `日時　　： ${formatDateTime(data.startsAt)}`,
    `メニュー： ${data.menuName}（${data.menuDurationMin}分 / ${yen(data.menuPrice)}）`,
    `お名前　： ${data.customerName}`,
    `電話　　： ${data.phone}`,
    `メール　： ${data.email}`,
    '',
    '【現在の身体のお悩み】',
    data.concern || '（記載なし）',
    '',
    '【ご要望・連絡事項】',
    data.note || '（記載なし）',
    '',
    `管理画面: ${(env.siteUrl || site.url).replace(/\/$/, '')}/admin`,
  ].join('\n');

  await send(env.adminEmail, `【予約】${formatDateTime(data.startsAt)} ${data.customerName}様`, text);
}

export async function sendCancellationNotice(data: BookingMailData) {
  const body = [
    `日時　　： ${formatDateTime(data.startsAt)}`,
    `メニュー： ${data.menuName}`,
    `お名前　： ${data.customerName}`,
  ].join('\n');

  await send(
    data.email,
    `【${site.name}】ご予約をキャンセルしました`,
    [
      `${data.customerName} 様`,
      '',
      '下記のご予約をキャンセルいたしました。',
      '',
      body,
      '',
      'またのご利用をお待ちしております。',
      '',
      site.name,
      site.url,
    ].join('\n')
  );

  if (env.adminEmail) {
    await send(env.adminEmail, `【キャンセル】${formatDateTime(data.startsAt)} ${data.customerName}様`, body);
  }
}
