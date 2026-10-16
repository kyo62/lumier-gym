import type { AdminClient, AdminSession, SessionRecordInput } from './types.ts';
import { applySession, revertSession, rollMonth, SESSION_CHOICES, type Counters } from './karteRules.ts';

/**
 * セッションの記録と、回数の計算。保存先（デモ／Supabase）は KarteStore で差し替える。
 * 計算は karteRules.ts（テスト済み）、ここは「読む→計算→書く」の順序だけを持つ。
 */
export interface KarteStore {
  getClient(id: string): Promise<AdminClient>;
  saveCounters(id: string, counters: Counters): Promise<void>;
  insertSession(row: Omit<AdminSession, 'id'>): Promise<void>;
  getSession(id: string): Promise<AdminSession | null>;
  deleteSession(id: string): Promise<void>;
}

export const countersOf = (c: AdminClient): Counters => ({
  plan: c.plan, remain: c.remain, carry: c.carry, carryExpire: c.carryExpire,
  stretchRemain: c.stretchRemain, stretchExpire: c.stretchExpire,
});

export async function recordSession(store: KarteStore, clientId: string, input: SessionRecordInput, today: string): Promise<string> {
  const choice = SESSION_CHOICES.find((c) => c.key === input.choice);
  if (!choice) throw new Error('種類を選んでください。');
  const client = await store.getClient(clientId);
  const out = applySession(countersOf(client), choice.key, today, input.waive);
  // 先に記録を保存し、そのあとで回数を更新する（逆だと、記録が残らないまま回数だけ減る）
  await store.insertSession({
    clientId, sessionDate: input.sessionDate, type: choice.type, status: choice.status,
    consumed: out.consumed, consumedFrom: out.consumedFrom, fee: out.fee, amount: out.amount,
    condition: input.condition, menu: input.menu, homecare: input.homecare, share: input.share, note: out.note,
  });
  if (out.consumed > 0) await store.saveCounters(clientId, out.counters);
  return out.message;
}

export async function removeSession(store: KarteStore, sessionId: string): Promise<void> {
  const session = await store.getSession(sessionId);
  if (!session) return;
  const client = await store.getClient(session.clientId);
  // 先に回数を戻し、そのあと記録を消す（途中で止まっても、回数が足りなくなる側には倒さない）
  if (session.consumed > 0) await store.saveCounters(client.id, revertSession(countersOf(client), session));
  await store.deleteSession(sessionId);
}

export async function closeMonth(store: KarteStore, clientId: string, today: string): Promise<number> {
  const client = await store.getClient(clientId);
  const result = rollMonth(countersOf(client), today);
  if (!result) throw new Error('月額プランの方だけに使えます。');
  await store.saveCounters(clientId, result.counters);
  return result.lost;
}
