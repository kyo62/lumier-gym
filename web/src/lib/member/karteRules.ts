import { addMonthsString, endOfMonthString } from './dates.ts';

/**
 * カルテの計算ルール（回数・繰越・キャンセル）。
 * 決定事項は 01_Manager/Square_初期設定メモ.md。顧客管理ツール（web/tools/顧客管理）と同じ。
 * 画面から切り離した純粋な関数にして、テストで確かめている。
 */

export type PlanKind = 'monthly' | 'ticket' | 'single';
export type PlanInfo = {
  label: string;
  kind: PlanKind;
  /** 月額・単発の料金（税込）。回数券は null（回数×単価） */
  price: number | null;
  /** 回数券の1回あたり */
  unit?: number;
  /** 月額プランの月あたりの回数 */
  sessions?: number;
  /** 家族でシェアする（繰越なし） */
  shared?: boolean;
};

export const PLANS: Record<string, PlanInfo> = {
  m4: { label: '月4回', kind: 'monthly', price: 32000, sessions: 4 },
  m2: { label: '月2回', kind: 'monthly', price: 17000, sessions: 2 },
  pair4: { label: 'ペア 月4回', kind: 'monthly', price: 27200, sessions: 4 },
  fam6: { label: '家族割 月6回', kind: 'monthly', price: 46200, sessions: 6, shared: true },
  fam8: { label: '家族割 月8回', kind: 'monthly', price: 61600, sessions: 8, shared: true },
  ticket: { label: '回数券', kind: 'ticket', price: null, unit: 8800 },
  visitor: { label: '都度ビジター', kind: 'single', price: 12000 },
  online: { label: 'オンライン', kind: 'single', price: 10000 },
  trial: { label: '初回体験', kind: 'single', price: 3300 },
};
export const PLAN_KEYS = Object.keys(PLANS);

/** コンディショニングストレッチは回数券のみ（4回 22,000円）。ほかのプランと併用できる */
export const STRETCH_TICKET = { count: 4, price: 22000, months: 2 } as const;

/** 回数券の有効期限（購入日から2か月） */
export const TICKET_MONTHS = 2;

export type Counters = {
  plan: string;
  remain: number;
  carry: number;
  carryExpire: string | null;
  stretchRemain: number;
  stretchExpire: string | null;
};

export type ConsumedFrom = 'remain' | 'carry' | 'stretch';

/** セッションの記録の選択肢（種類と出欠をひとつにまとめたもの） */
export type SessionChoiceKey = 'regular' | 'trial' | 'visitor' | 'online' | 'stretch' | 'cancel_free' | 'cancel_same' | 'noshow';
export type SessionStatus = 'attended' | 'cancel_same_day' | 'cancel_advance' | 'noshow';
export type SessionType = 'regular' | 'trial' | 'online' | 'stretch' | 'visitor';
export const SESSION_CHOICES: { key: SessionChoiceKey; label: string; type: SessionType; status: SessionStatus }[] = [
  { key: 'regular', label: '通常セッション（60分）', type: 'regular', status: 'attended' },
  { key: 'trial', label: '初回体験（60分）', type: 'trial', status: 'attended' },
  { key: 'visitor', label: '都度ビジター（60分）', type: 'visitor', status: 'attended' },
  { key: 'online', label: 'オンライン（50分）', type: 'online', status: 'attended' },
  { key: 'stretch', label: 'コンディショニングストレッチ（45分）', type: 'stretch', status: 'attended' },
  { key: 'cancel_free', label: 'キャンセル（前日23:59まで・料金なし）', type: 'regular', status: 'cancel_advance' },
  { key: 'cancel_same', label: 'キャンセル（当日）', type: 'regular', status: 'cancel_same_day' },
  { key: 'noshow', label: '無断キャンセル', type: 'regular', status: 'noshow' },
];

export const planInfo = (plan: string): PlanInfo => PLANS[plan] ?? PLANS.trial;
const isMember = (plan: string) => planInfo(plan).kind !== 'single';

/** 有効な繰越の回数（期限が過ぎていれば 0） */
export function carryValid(c: Pick<Counters, 'carry' | 'carryExpire'>, today: string): number {
  if (!c.carry) return 0;
  return c.carryExpire && c.carryExpire < today ? 0 : c.carry;
}

export function stretchValid(c: Pick<Counters, 'stretchRemain' | 'stretchExpire'>, today: string): number {
  if (!c.stretchRemain) return 0;
  return c.stretchExpire && c.stretchExpire < today ? 0 : c.stretchRemain;
}

/** 回数券の期限 */
export function ticketExpire(ticketDate: string | null): string | null {
  return ticketDate ? addMonthsString(ticketDate, TICKET_MONTHS) : null;
}

export type SessionOutcome = {
  counters: Counters;
  consumed: number;
  consumedFrom: ConsumedFrom | null;
  /** キャンセル料（円）。次回のご来店時にいただく */
  fee: number;
  /** 単発の料金（円） */
  amount: number;
  note: string;
  message: string;
};

/** 回数を1つ使う（繰越が先、そのあと当月） */
function consumeOne(c: Counters, today: string): { counters: Counters; from: ConsumedFrom | null } {
  if (carryValid(c, today) > 0) return { counters: { ...c, carry: c.carry - 1 }, from: 'carry' };
  if (c.remain > 0) return { counters: { ...c, remain: c.remain - 1 }, from: 'remain' };
  return { counters: c, from: null };
}

const yen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

/** キャンセル料：体験 3,300円／ビジター 6,000円／会員 1,000円。決まっていないプランは null */
function sameDayFee(plan: string): number | null {
  if (plan === 'trial') return 3300;
  if (plan === 'visitor') return 6000;
  return isMember(plan) ? 1000 : null;
}

/** セッションを記録したときの、回数・料金の変化 */
export function applySession(c: Counters, choice: SessionChoiceKey, today: string, waive = false): SessionOutcome {
  const base: SessionOutcome = { counters: c, consumed: 0, consumedFrom: null, fee: 0, amount: 0, note: '', message: '' };
  const info = planInfo(c.plan);
  const member = isMember(c.plan);

  if (choice === 'regular') {
    if (member) {
      const used = consumeOne(c, today);
      if (used.from) return { ...base, counters: used.counters, consumed: 1, consumedFrom: used.from, message: '回数を1つ使いました。' };
      return { ...base, note: '残り枠がありません。回数は減らしていません。', message: '残り枠がありません（記録だけ保存）。' };
    }
    const amount = info.price ?? 0;
    return { ...base, amount, message: `単発の料金 ${yen(amount)} を記録しました。` };
  }
  if (choice === 'trial' || choice === 'visitor' || choice === 'online') {
    const amount = PLANS[choice].price ?? 0;
    return { ...base, amount, message: `料金 ${yen(amount)} を記録しました。` };
  }
  if (choice === 'stretch') {
    if (stretchValid(c, today) > 0) {
      return { ...base, counters: { ...c, stretchRemain: c.stretchRemain - 1 }, consumed: 1, consumedFrom: 'stretch', message: 'ストレッチ回数券を1回使いました。' };
    }
    return { ...base, note: 'ストレッチ回数券の残りがありません。回数は減らしていません。', message: 'ストレッチ回数券の残りがありません（記録だけ保存）。' };
  }
  if (choice === 'cancel_same') {
    if (waive) return { ...base, note: '免除', message: '免除として記録しました。' };
    const fee = sameDayFee(c.plan);
    if (fee === null) return { ...base, note: 'キャンセル料の額は未決です', message: 'このプランのキャンセル料は、まだ決まっていません。' };
    return { ...base, fee, note: '次回のご来店時にいただく', message: `キャンセル料 ${yen(fee)} を記録しました。` };
  }
  if (choice === 'noshow') {
    if (waive) return { ...base, note: '免除', message: '免除として記録しました。' };
    if (member) {
      const used = consumeOne(c, today);
      if (used.from) return { ...base, counters: used.counters, consumed: 1, consumedFrom: used.from, note: '無断キャンセルのため、1回分を消化', message: '無断キャンセルとして、1回分を使いました。' };
      return { ...base, note: '無断キャンセル（残り枠なし）', message: '残り枠がないため、回数は減らしていません。' };
    }
    const fee = sameDayFee(c.plan);
    if (fee === null) return { ...base, note: 'キャンセル料の額は未決です', message: 'このプランの額は、まだ決まっていません。' };
    return { ...base, fee, note: '無断キャンセル。次回のご来店時にいただく', message: `無断キャンセルとして ${yen(fee)} を記録しました。` };
  }
  return { ...base, message: 'キャンセル（料金なし）を記録しました。' };
}

/** 記録を消したときに、使った回数を元に戻す */
export function revertSession(c: Counters, s: { consumed: number; consumedFrom: ConsumedFrom | null }): Counters {
  if (!s.consumed || !s.consumedFrom) return c;
  if (s.consumedFrom === 'carry') return { ...c, carry: c.carry + s.consumed };
  if (s.consumedFrom === 'stretch') return { ...c, stretchRemain: c.stretchRemain + s.consumed };
  return { ...c, remain: c.remain + s.consumed };
}

/**
 * 月次の締め（月初に1回）。月額プランの方だけ。
 * 当月の残りは、翌月末までの繰越になる（これまでの繰越はなくなる）。家族割は繰越なし。
 */
export function rollMonth(c: Counters, today: string): { counters: Counters; lost: number } | null {
  const info = planInfo(c.plan);
  if (info.kind !== 'monthly' || !info.sessions) return null;
  const lost = carryValid(c, today);
  if (info.shared) return { counters: { ...c, carry: 0, carryExpire: null, remain: info.sessions }, lost: c.remain + lost };
  const expire = c.remain > 0 ? endOfMonthString(addMonthsString(today, 1)) : null;
  return { counters: { ...c, carry: c.remain, carryExpire: expire, remain: info.sessions }, lost };
}
