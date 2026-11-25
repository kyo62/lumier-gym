import type { AdminClient, AdminSession, SessionRecordInput } from './types.ts';
import { applySession, revertSession, SESSION_CHOICES, type Ticket } from './karteRules.ts';

/**
 * セッションの記録と、回数の計算。保存先（デモ／Supabase）は KarteStore で差し替える。
 * 計算は karteRules.ts（テスト済み）、ここは「読む→計算→書く」の順序だけを持つ。
 */
export interface KarteStore {
  getClient(id: string): Promise<AdminClient>;
  /** 回数が変わった券だけを保存する */
  saveTickets(changed: Ticket[]): Promise<void>;
  insertSession(row: Omit<AdminSession, 'id'>): Promise<void>;
  getSession(id: string): Promise<AdminSession | null>;
  deleteSession(id: string): Promise<void>;
}

export async function recordSession(store: KarteStore, clientId: string, input: SessionRecordInput, today: string): Promise<string> {
  const choice = SESSION_CHOICES.find((c) => c.key === input.choice);
  if (!choice) throw new Error('種類を選んでください。');
  const client = await store.getClient(clientId);
  const out = applySession(client.tickets, choice.key, today, { waive: input.waive, ticketId: input.ticketId || undefined });
  // 先に記録を保存し、そのあとで回数を更新する（逆だと、記録が残らないまま回数だけ減る）
  await store.insertSession({
    clientId, sessionDate: input.sessionDate, type: choice.type, status: choice.status,
    consumed: out.consumed, consumedTicketId: out.ticketId, fee: 0, amount: out.amount,
    condition: input.condition, menu: input.menu, homecare: input.homecare, share: input.share, note: out.note,
  });
  if (out.changed.length > 0) await store.saveTickets(out.changed);
  return out.message;
}

export async function removeSession(store: KarteStore, sessionId: string): Promise<void> {
  const session = await store.getSession(sessionId);
  if (!session) return;
  const client = await store.getClient(session.clientId);
  // 先に回数を戻し、そのあと記録を消す（途中で止まっても、回数が足りなくなる側には倒さない）
  const restored = revertSession(client.tickets, { consumed: session.consumed, ticketId: session.consumedTicketId });
  if (restored.length > 0) await store.saveTickets(restored);
  await store.deleteSession(sessionId);
}
