import { addMonthsString, daysBetween } from './dates.ts';

/**
 * カルテの計算ルール（回数券の消化・キャンセル・期限）。
 * 料金は回数券のみ（月額プランは廃止・2026-11-25 代表決定）。決定事項は 02_Engineer/顧客管理ページ設計.md。
 * 画面から切り離した純粋な関数にして、テストで確かめている。
 */

export type TicketKind = 't2' | 't4' | 't8' | 'other';
export type TicketMinutes = 30 | 60;

export type Ticket = {
  id: string;
  kind: TicketKind;
  /** 表示名（「その他」は手入力） */
  label: string;
  total: number;
  remain: number;
  /** 1回の長さ（分） */
  minutes: TicketMinutes;
  purchasedOn: string;
  /** 期限（この日まで使える）。null は期限なし（その他の券のみ） */
  expiresOn: string | null;
};

type KindInfo = { label: string; total: number; price: number; months: number; minutes: TicketMinutes };

/** HP（site.ts の ticketPlans）と同じ内容 */
export const TICKET_KINDS: Record<Exclude<TicketKind, 'other'>, KindInfo> = {
  t2: { label: '2回券（30分）', total: 2, price: 9400, months: 2, minutes: 30 },
  t4: { label: '4回券', total: 4, price: 35200, months: 3, minutes: 60 },
  t8: { label: '8回券', total: 8, price: 65600, months: 4, minutes: 60 },
};
export const TICKET_KIND_KEYS = Object.keys(TICKET_KINDS) as Exclude<TicketKind, 'other'>[];

/** 回数券を使わない料金（税込） */
export const SINGLE_PRICES = { trial: 3300, visitor: 10000 } as const;

/** 期限が近いとみなす日数 */
export const EXPIRING_DAYS = 14;

/** 購入日から、券を作る（期限は種類ごと）。「その他」は回数・期限を手入力 */
export function newTicket(
  id: string,
  kind: Exclude<TicketKind, 'other'>,
  purchasedOn: string,
): Ticket {
  const k = TICKET_KINDS[kind];
  return {
    id, kind, label: k.label, total: k.total, remain: k.total, minutes: k.minutes,
    purchasedOn, expiresOn: addMonthsString(purchasedOn, k.months),
  };
}

/** 券の追加入力から、券を作る。種類を選べば回数・期限・長さは自動、「その他」は手入力 */
export function ticketFromInput(
  id: string,
  i: Pick<Ticket, 'kind' | 'label' | 'total' | 'remain' | 'purchasedOn' | 'expiresOn'>,
): Ticket {
  if (i.kind === 'other') {
    return { id, kind: 'other', label: i.label.trim() || 'その他の券', total: i.total, remain: i.remain, minutes: 60, purchasedOn: i.purchasedOn, expiresOn: i.expiresOn };
  }
  return newTicket(id, i.kind, i.purchasedOn);
}

/** 使える券か（残りがあり、期限が切れていない） */
export function ticketUsable(t: Pick<Ticket, 'remain' | 'expiresOn'>, today: string): boolean {
  return t.remain > 0 && (!t.expiresOn || t.expiresOn >= today);
}

/** 期限が過ぎて、回数が残ったままの券（使えない） */
export function ticketExpired(t: Pick<Ticket, 'remain' | 'expiresOn'>, today: string): boolean {
  return t.remain > 0 && !!t.expiresOn && t.expiresOn < today;
}

/** 期限まで何日か（期限なし・期限切れ・残りなしは null） */
export function daysLeft(t: Pick<Ticket, 'remain' | 'expiresOn'>, today: string): number | null {
  if (!ticketUsable(t, today) || !t.expiresOn) return null;
  return daysBetween(today, t.expiresOn);
}

/** 期限が近い券（EXPIRING_DAYS 日以内） */
export function expiringSoon(tickets: Ticket[], today: string, days = EXPIRING_DAYS): Ticket[] {
  return tickets.filter((t) => {
    const d = daysLeft(t, today);
    return d !== null && d <= days;
  });
}

/** 使える残りの合計（回） */
export function usableCount(tickets: Ticket[], today: string): number {
  return tickets.filter((t) => ticketUsable(t, today)).reduce((n, t) => n + t.remain, 0);
}

/** 期限の近い順（期限なしは最後）に並べる */
function byExpiry(a: Ticket, b: Ticket): number {
  if (a.expiresOn === b.expiresOn) return a.purchasedOn < b.purchasedOn ? -1 : 1;
  if (!a.expiresOn) return 1;
  if (!b.expiresOn) return -1;
  return a.expiresOn < b.expiresOn ? -1 : 1;
}

/**
 * 使う券を選ぶ。指定があればそれ（使えるときだけ）、なければ「期限が近い券」から。
 * minutes を渡すと、その長さの券だけを対象にする。
 */
export function pickTicket(
  tickets: Ticket[],
  today: string,
  opts: { minutes?: TicketMinutes; kinds?: TicketKind[]; preferId?: string } = {},
): Ticket | null {
  const ok = tickets.filter((t) => ticketUsable(t, today)
    && (!opts.minutes || t.minutes === opts.minutes)
    && (!opts.kinds || opts.kinds.includes(t.kind)));
  const preferred = opts.preferId ? ok.find((t) => t.id === opts.preferId) : undefined;
  if (preferred) return preferred;
  return [...ok].sort(byExpiry)[0] ?? null;
}

/** セッションの記録の選択肢（種類と出欠をひとつにまとめたもの） */
export type SessionChoiceKey =
  | 'regular60' | 'regular30' | 'trial' | 'visitor' | 'online' | 'stretch'
  | 'cancel_free' | 'cancel_same' | 'noshow';
export type SessionStatus = 'attended' | 'cancel_same_day' | 'cancel_advance' | 'noshow';
export type SessionType = 'regular' | 'trial' | 'online' | 'stretch' | 'visitor';
export const SESSION_CHOICES: { key: SessionChoiceKey; label: string; type: SessionType; status: SessionStatus }[] = [
  { key: 'regular60', label: '回数券で受ける（60分）', type: 'regular', status: 'attended' },
  { key: 'regular30', label: '回数券で受ける（30分）', type: 'regular', status: 'attended' },
  { key: 'trial', label: '初回体験（60分）', type: 'trial', status: 'attended' },
  { key: 'visitor', label: '都度ビジター（60分）', type: 'visitor', status: 'attended' },
  { key: 'online', label: 'オンライン（その他の券）', type: 'online', status: 'attended' },
  { key: 'stretch', label: 'コンディショニングストレッチ（その他の券）', type: 'stretch', status: 'attended' },
  { key: 'cancel_free', label: 'キャンセル（前日23:59まで・回数は減らさない）', type: 'regular', status: 'cancel_advance' },
  { key: 'cancel_same', label: 'キャンセル（当日・1回分を消化）', type: 'regular', status: 'cancel_same_day' },
  { key: 'noshow', label: '無断キャンセル（1回分を消化）', type: 'regular', status: 'noshow' },
];

export type SessionOutcome = {
  /** 回数が変わった券（変わらなければ空） */
  changed: Ticket[];
  consumed: number;
  /** 使った券 */
  ticketId: string | null;
  /** 単発の料金（円） */
  amount: number;
  note: string;
  message: string;
};

const yen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

function decrement(tickets: Ticket[], t: Ticket): Ticket[] {
  return tickets.filter((x) => x.id === t.id).map((x) => ({ ...x, remain: x.remain - 1 }));
}

/**
 * セッションを記録したときの、回数・料金の変化。
 * 当日キャンセル・無断キャンセルは、回数券でも1回分を使う（waive で免除）。
 */
export function applySession(
  tickets: Ticket[],
  choice: SessionChoiceKey,
  today: string,
  opts: { waive?: boolean; ticketId?: string } = {},
): SessionOutcome {
  const none: SessionOutcome = { changed: [], consumed: 0, ticketId: null, amount: 0, note: '', message: '' };
  const consume = (t: Ticket, note: string, message: string): SessionOutcome =>
    ({ ...none, changed: decrement(tickets, t), consumed: 1, ticketId: t.id, note, message });

  if (choice === 'regular60' || choice === 'regular30') {
    const minutes: TicketMinutes = choice === 'regular60' ? 60 : 30;
    const t = pickTicket(tickets, today, { minutes, kinds: ['t2', 't4', 't8'], preferId: opts.ticketId });
    if (t) return consume(t, '', `「${t.label}」を1回使いました。`);
    return { ...none, note: `使える${minutes}分の回数券がありません。回数は減らしていません。`, message: `使える${minutes}分の回数券がありません（記録だけ保存）。` };
  }
  if (choice === 'trial' || choice === 'visitor') {
    const amount = SINGLE_PRICES[choice];
    return { ...none, amount, message: `料金 ${yen(amount)} を記録しました。` };
  }
  if (choice === 'online' || choice === 'stretch') {
    const t = pickTicket(tickets, today, { kinds: ['other'], preferId: opts.ticketId });
    if (t) return consume(t, '', `「${t.label}」を1回使いました。`);
    return { ...none, note: '使える「その他の券」がありません。料金は別途', message: '使える「その他の券」がありません（記録だけ保存）。' };
  }
  if (choice === 'cancel_same' || choice === 'noshow') {
    const what = choice === 'noshow' ? '無断キャンセル' : '当日キャンセル';
    if (opts.waive) return { ...none, note: '免除', message: '免除として記録しました。' };
    const t = pickTicket(tickets, today, { preferId: opts.ticketId, kinds: ['t2', 't4', 't8', 'other'] });
    if (t) return consume(t, `${what}のため、1回分を消化`, `${what}として、1回分を使いました。`);
    return { ...none, note: `${what}（使える回数券なし）`, message: '使える回数券がないため、回数は減らしていません。' };
  }
  return { ...none, message: 'キャンセル（回数は減らしません）を記録しました。' };
}

/** 記録を消したときに、使った回数を元に戻す（券がもうなければ何もしない） */
export function revertSession(tickets: Ticket[], s: { consumed: number; ticketId: string | null }): Ticket[] {
  if (!s.consumed || !s.ticketId) return [];
  return tickets
    .filter((t) => t.id === s.ticketId)
    .map((t) => ({ ...t, remain: Math.min(t.total, t.remain + s.consumed) }));
}
