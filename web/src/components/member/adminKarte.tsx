'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/member/api';
import { formatDateJa, todayLocal } from '@/lib/member/dates';
import { SESSION_CHOICES, TICKET_KINDS, TICKET_KIND_KEYS, EXPIRING_DAYS, daysLeft, pickTicket, usableCount, ticketExpired, ticketUsable, type Ticket, type TicketKind } from '@/lib/member/karteRules';
import type { AdminClient, AdminClientInput, AdminSession } from '@/lib/member/types';
import { SESSION_TYPE_LABELS } from '@/lib/member/karte';
import { Button, Card, ConfirmButton, EmptyState, Field, Loading, Notice, inputClass, useAsync, useSubmit } from './ui';

/** 表現チェック：会員に見える欄（メニュー・ホームケア）に入れてはいけない言い方 */
export const NG_WORDS = ['治る', '治ります', '治療', '矯正', '改善します', '完治', '診断', '必ず', 'マッサージ', '指圧'];
const hits = (...texts: string[]) => NG_WORDS.filter((w) => texts.some((t) => t.includes(w)));

const nullIfEmpty = (v: string) => (v === '' ? null : v);
const intOr0 = (v: string) => {
  const n = Number(v.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)));
  return Number.isInteger(n) && n >= 0 && n <= 99 ? n : 0;
};

/** 保存する項目（券の回数は、記録のたびに変わるので、ここには含めない） */
type Draft = Omit<AdminClientInput, 'id'>;
const draftOf = (c: AdminClient): Draft => ({
  name: c.name, kana: c.kana, gender: c.gender, phone: c.phone, email: c.email, referrer: c.referrer, hobby: c.hobby,
  targetLabel: c.targetLabel, targetDate: c.targetDate,
  consentOn: c.consentOn, purpose: c.purpose, goal: c.goal, intakeBody: c.intakeBody, posture: c.posture,
  homework: c.homework, internalNote: c.internalNote,
});

export function ClientDetail({ id }: { id: string }) {
  const load = useCallback(async () => {
    const [clients, sessions] = await Promise.all([api.adminListClients(), api.adminListSessions(id)]);
    return { client: clients.find((c) => c.id === id) ?? null, sessions };
  }, [id]);
  const { data, error, loading, reload } = useAsync(load);

  if (loading) return <Loading />;
  if (error || !data) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;
  if (!data.client) return <EmptyState title="カルテが見つかりません" />;
  // 入力欄の内容が保存で変わったときだけ作り直す（回数の変化では作り直さない。記録のひとことを残すため）
  return <Editor key={JSON.stringify(draftOf(data.client))} client={data.client} sessions={data.sessions} reload={reload} />;
}

function Editor({ client, sessions, reload }: { client: AdminClient; sessions: AdminSession[]; reload: () => void }) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(client));
  const save = useSubmit();
  const router = useRouter();
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftOf(client));
  const today = todayLocal();

  const text = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));
  const date = (k: 'targetDate' | 'consentOn') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: nullIfEmpty(e.target.value) }));

  /** いちばん新しい回数を読み直してから、入力した項目を保存する（記録で変わった回数を、上書きしない） */
  const saveDraft = async () => {
    const ok = await save.run(async () => {
      const fresh = (await api.adminListClients()).find((c) => c.id === client.id) ?? client;
      await api.adminSaveClient({ ...fresh, ...draft, id: client.id });
    });
    if (ok) reload();
  };

  const expired = client.tickets.filter((t) => ticketExpired(t, today));
  const soon = client.tickets.filter((t) => { const d = daysLeft(t, today); return d !== null && d <= EXPIRING_DAYS; });
  const alerts: string[] = [];
  if (!client.userId) alerts.push('会員ログインに、まだひもづいていません（お客様の画面には出ません）');
  if (!client.consentOn) alerts.push('個人情報の取扱いへの同意日が、未入力です');
  for (const t of soon) alerts.push(`「${t.label}」（残り ${t.remain} 回）は、${formatDateJa(t.expiresOn ?? '')}までです。お声がけの目安です`);
  for (const t of expired) alerts.push(`「${t.label}」は期限（${formatDateJa(t.expiresOn ?? '')}）が過ぎて、残り ${t.remain} 回は使えません`);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.3em] text-brass">{client.code}</p>
        <h1 className="mt-1 text-[1.5rem]">{client.name} 様</h1>
        <p className="mt-1 text-xs text-muted">使える回数券：{usableCount(client.tickets, today)} 回</p>
      </header>
      {alerts.length > 0 ? (
        <ul className="space-y-2">
          {alerts.map((a) => (
            <li key={a}>
              <Notice tone="warn">{a}</Notice>
            </li>
          ))}
        </ul>
      ) : null}

      <Card>
        <h2 className="mb-4 text-base">基本情報</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="お名前" htmlFor="c-name"><input id="c-name" value={draft.name} onChange={text('name')} className={inputClass} /></Field>
            <Field label="フリガナ" htmlFor="c-kana"><input id="c-kana" value={draft.kana} onChange={text('kana')} className={inputClass} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="性別" htmlFor="c-gender">
              <select id="c-gender" value={draft.gender} onChange={text('gender')} className={inputClass}>
                {['女性', '男性', '回答しない'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="電話" htmlFor="c-phone"><input id="c-phone" inputMode="tel" value={draft.phone} onChange={text('phone')} className={inputClass} /></Field>
          </div>
          <Field label="メールアドレス" htmlFor="c-email"><input id="c-email" type="email" value={draft.email} onChange={text('email')} className={inputClass} /></Field>
          <Field label="ご紹介者（あれば）" htmlFor="c-ref"><input id="c-ref" value={draft.referrer} onChange={text('referrer')} className={inputClass} /></Field>
          <Field label="趣味・競技・生活" htmlFor="c-hobby"><input id="c-hobby" value={draft.hobby} onChange={text('hobby')} className={inputClass} /></Field>
          <Field label="個人情報の取扱い 同意日" htmlFor="c-consent"><input id="c-consent" type="date" value={draft.consentOn ?? ''} onChange={date('consentOn')} className={inputClass} /></Field>
        </div>
      </Card>

      <TicketSection client={client} reload={reload} />

      <Card>
        <h2 className="mb-1 text-base">目標・問診・ホームケア</h2>
        <p className="mb-4 text-[11px] leading-5 text-muted">ここに書いた内容は、ひもづけた会員の画面に<b>表示されます</b>（見立て・内部メモを除く）。</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="目標・大会の名前" htmlFor="c-tl"><input id="c-tl" value={draft.targetLabel} onChange={text('targetLabel')} className={inputClass} /></Field>
            <Field label="目標日" htmlFor="c-tdate"><input id="c-tdate" type="date" value={draft.targetDate ?? ''} onChange={date('targetDate')} className={inputClass} /></Field>
          </div>
          <Field label="ご来店の目的" htmlFor="c-pur"><textarea id="c-pur" rows={2} value={draft.purpose} onChange={text('purpose')} className={inputClass} /></Field>
          <Field label="目標（ご本人の言葉）" htmlFor="c-goal"><textarea id="c-goal" rows={2} value={draft.goal} onChange={text('goal')} className={inputClass} /></Field>
          <Field label="気になっていること（問診票にお客様が書いた内容）" htmlFor="c-ib"><textarea id="c-ib" rows={3} value={draft.intakeBody} onChange={text('intakeBody')} className={inputClass} /></Field>
          <Field label="ご自宅でのホームケア" htmlFor="c-hw"><textarea id="c-hw" rows={3} value={draft.homework} onChange={text('homework')} className={inputClass} /></Field>
          {hits(draft.homework).length > 0 ? <Notice tone="warn">「{hits(draft.homework).join('」「')}」が入っています。効果を断定する言い方や、資格が必要な行為を思わせる言葉は避けてください。</Notice> : null}
        </div>
      </Card>

      <Card>
        <h2 className="mb-1 text-base">見立て・内部メモ</h2>
        <p className="mb-4 text-[11px] leading-5 text-muted">施術者だけに見えます。<b>お客様の画面には出ません。</b>病名・診断名は書かないでください。</p>
        <div className="space-y-4">
          <Field label="見立て" htmlFor="c-po"><textarea id="c-po" rows={3} value={draft.posture} onChange={text('posture')} className={inputClass} /></Field>
          <Field label="内部メモ" htmlFor="c-in"><textarea id="c-in" rows={2} value={draft.internalNote} onChange={text('internalNote')} className={inputClass} /></Field>
        </div>
      </Card>

      <div className="sticky bottom-24 z-20 space-y-2">
        {save.done ? <Notice tone="success">{save.done}</Notice> : null}
        <Button onClick={saveDraft} disabled={save.busy || !dirty} className="w-full shadow-lg">
          {save.busy ? '保存しています…' : dirty ? '変更を保存する' : '保存済み'}
        </Button>
      </div>

      <SessionSection client={client} sessions={sessions} reload={reload} />
      <LinkSection client={client} reload={reload} />

      <Card>
        <h2 className="mb-3 text-base">カルテを削除する</h2>
        <p className="mb-3 text-[11px] leading-5 text-muted">セッションの記録も、すべて消えます。元に戻せません。</p>
        <ConfirmButton
          label="このカルテを削除"
          confirmLabel="本当に削除する"
          variant="outline"
          onConfirm={async () => {
            await api.adminDeleteClient(client.id);
            router.push('/member/admin/clients');
          }}
        />
      </Card>
    </div>
  );
}

function TicketSection({ client, reload }: { client: AdminClient; reload: () => void }) {
  const today = todayLocal();
  const run = useSubmit();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<{ kind: TicketKind; label: string; total: string; purchasedOn: string; expiresOn: string }>({
    kind: 't4', label: '', total: '4', purchasedOn: today, expiresOn: '',
  });
  const edit = async (t: Ticket) => {
    const ok = await run.run(() => api.adminUpdateTicket(t));
    if (ok) reload();
  };
  const sorted = [...client.tickets].sort((a, b) => Number(ticketUsable(b, today)) - Number(ticketUsable(a, today)) || ((a.expiresOn ?? '9999') < (b.expiresOn ?? '9999') ? -1 : 1));

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = intOr0(form.total);
    if (form.kind === 'other' && total < 1) {
      run.setError('回数は1以上で入れてください。');
      return;
    }
    const ok = await run.run(() =>
      api.adminAddTicket(client.id, {
        kind: form.kind, label: form.label, total: form.kind === 'other' ? total : 0, remain: form.kind === 'other' ? total : 0,
        purchasedOn: form.purchasedOn, expiresOn: form.kind === 'other' ? nullIfEmpty(form.expiresOn) : null,
      }),
    );
    if (ok) { setAdding(false); reload(); }
  };

  return (
    <Card>
      <h2 className="mb-1 text-base">回数券</h2>
      <p className="mb-4 text-[11px] leading-5 text-muted">複数持てます。回数は、期限の近い券から先に減ります。期限が切れた券は使えません（延長はしません）。</p>
      <ul className="space-y-3">
        {sorted.length === 0 ? <li><EmptyState title="回数券はありません" body="購入されたら、下の「回数券を追加」から入れてください。" /></li> : null}
        {sorted.map((t) => {
          const usableNow = ticketUsable(t, today);
          const d = daysLeft(t, today);
          return (
            <li key={t.id} className={`rounded-xl border border-line p-3.5 ${usableNow ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm">{t.label}<span className="ml-2 text-[11px] text-muted">{t.minutes}分</span></p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted">
                    購入 {formatDateJa(t.purchasedOn)}　
                    {t.expiresOn ? `期限 ${formatDateJa(t.expiresOn)}` : '期限なし'}
                    {ticketExpired(t, today) ? '（期限切れ）' : d !== null && d <= EXPIRING_DAYS ? `（あと${d}日）` : ''}
                  </p>
                </div>
                <p className="tnum shrink-0 text-xl">{t.remain}<span className="ml-1 text-xs text-muted">/ {t.total} 回</span></p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button type="button" aria-label={`${t.label}の回数を1減らす`} disabled={run.busy || t.remain <= 0} onClick={() => edit({ ...t, remain: t.remain - 1 })} className="grid size-9 place-items-center rounded-full border border-line bg-surface text-lg disabled:opacity-40">−</button>
                <button type="button" aria-label={`${t.label}の回数を1増やす`} disabled={run.busy || t.remain >= t.total} onClick={() => edit({ ...t, remain: t.remain + 1 })} className="grid size-9 place-items-center rounded-full border border-line bg-surface text-lg disabled:opacity-40">＋</button>
                <ConfirmButton label="この券を消す" confirmLabel="本当に消す" onConfirm={async () => { await api.adminDeleteTicket(t.id); reload(); }} />
              </div>
            </li>
          );
        })}
      </ul>
      {run.error ? <div className="mt-3"><Notice tone="error">{run.error}</Notice></div> : null}

      {adding ? (
        <form onSubmit={add} className="mt-4 space-y-3 rounded-xl bg-sand/60 p-3.5" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Field label="種類" htmlFor="t-kind">
              <select id="t-kind" value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as TicketKind }))} className={inputClass}>
                {TICKET_KIND_KEYS.map((k) => <option key={k} value={k}>{TICKET_KINDS[k].label}（{TICKET_KINDS[k].price.toLocaleString('ja-JP')}円）</option>)}
                <option value="other">その他の券（オンライン・ストレッチなど）</option>
              </select>
            </Field>
            <Field label="購入日" htmlFor="t-date" hint={form.kind !== 'other' ? `期限は購入日から${TICKET_KINDS[form.kind].months}か月` : undefined}>
              <input id="t-date" type="date" value={form.purchasedOn} onChange={(e) => setForm((f) => ({ ...f, purchasedOn: e.target.value }))} className={inputClass} />
            </Field>
          </div>
          {form.kind === 'other' ? (
            <div className="grid grid-cols-3 gap-3">
              <Field label="名前" htmlFor="t-label"><input id="t-label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} className={inputClass} placeholder="例：ストレッチ4回券" /></Field>
              <Field label="回数" htmlFor="t-total"><input id="t-total" inputMode="numeric" value={form.total} onChange={(e) => setForm((f) => ({ ...f, total: e.target.value }))} className={inputClass} /></Field>
              <Field label="期限" htmlFor="t-exp"><input id="t-exp" type="date" value={form.expiresOn} onChange={(e) => setForm((f) => ({ ...f, expiresOn: e.target.value }))} className={inputClass} /></Field>
            </div>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={run.busy} className="flex-1">追加する</Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>やめる</Button>
          </div>
        </form>
      ) : (
        <div className="mt-4"><Button type="button" variant="outline" onClick={() => setAdding(true)}>回数券を追加</Button></div>
      )}
    </Card>
  );
}

function SessionSection({ client, sessions, reload }: { client: AdminClient; sessions: AdminSession[]; reload: () => void }) {
  const [form, setForm] = useState({ sessionDate: todayLocal(), choice: 'regular60', ticketId: '', menu: '', homecare: '', condition: '', share: true, waive: false });
  const submit = useSubmit();
  const [result, setResult] = useState('');
  const set = (k: 'sessionDate' | 'choice' | 'ticketId' | 'menu' | 'homecare' | 'condition') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const isCancel = form.choice === 'cancel_same' || form.choice === 'noshow';
  const usesTicket = ['regular60', 'regular30', 'online', 'stretch', 'cancel_same', 'noshow'].includes(form.choice);
  const today = todayLocal();
  const auto = pickTicket(client.tickets, today, {
    minutes: form.choice === 'regular60' ? 60 : form.choice === 'regular30' ? 30 : undefined,
    kinds: form.choice === 'online' || form.choice === 'stretch' ? ['other'] : form.choice === 'regular60' || form.choice === 'regular30' ? ['t2', 't4', 't8'] : undefined,
  });
  const candidates = client.tickets.filter((t) => ticketUsable(t, today));
  const attended = SESSION_CHOICES.find((c) => c.key === form.choice)?.status === 'attended';
  const ng = hits(form.menu, form.homecare);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit.run(async () => {
      setResult(await api.adminRecordSession(client.id, { ...form, ticketId: form.ticketId || undefined }));
    });
    if (ok) {
      setForm((f) => ({ ...f, menu: '', homecare: '', condition: '', waive: false }));
      reload();
    }
  };

  return (
    <Card>
      <h2 className="mb-1 text-base">セッションの記録</h2>
      <p className="mb-4 text-[11px] leading-5 text-muted">記録すると、回数券の回数が自動で減ります（当日・無断キャンセルも1回分）。「メニュー」「ホームケア」は、お客様の画面に表示されます。</p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="日付" htmlFor="s-date"><input id="s-date" type="date" value={form.sessionDate} onChange={set('sessionDate')} className={inputClass} /></Field>
          <Field label="種類" htmlFor="s-choice">
            <select id="s-choice" value={form.choice} onChange={set('choice')} className={inputClass}>
              {SESSION_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
        </div>
        {usesTicket ? (
          <Field label="使う券" htmlFor="s-ticket" hint={auto ? `自動：「${auto.label}」（期限の近い券から）` : '使える券がありません'}>
            <select id="s-ticket" value={form.ticketId} onChange={set('ticketId')} className={inputClass}>
              <option value="">自動（期限の近い券から）</option>
              {candidates.map((t) => <option key={t.id} value={t.id}>{t.label}（残り{t.remain}回{t.expiresOn ? `・${formatDateJa(t.expiresOn)}まで` : ''}）</option>)}
            </select>
          </Field>
        ) : null}
        {attended ? (
          <>
            <Field label="今日のメニュー（お客様に表示）" htmlFor="s-menu"><textarea id="s-menu" rows={2} value={form.menu} onChange={set('menu')} className={inputClass} placeholder="例：胸まわりのストレッチ、呼吸のワーク" /></Field>
            <Field label="ホームケア（お客様に表示）" htmlFor="s-hc"><textarea id="s-hc" rows={2} value={form.homecare} onChange={set('homecare')} className={inputClass} /></Field>
            {ng.length > 0 ? <Notice tone="warn">「{ng.join('」「')}」が入っています。お客様の画面に出る欄です。効果を断定する言い方や、資格が必要な行為を思わせる言葉は避けてください。</Notice> : null}
            <Field label="状態メモ（内部のみ）" htmlFor="s-cond"><textarea id="s-cond" rows={2} value={form.condition} onChange={set('condition')} className={inputClass} /></Field>
            <label className="flex items-start gap-3 text-[13px] leading-6">
              <input type="checkbox" checked={form.share} onChange={(e) => setForm((f) => ({ ...f, share: e.target.checked }))} className="mt-1.5 size-4 accent-[var(--color-brass)]" />
              <span>このセッションを、お客様の画面に表示する</span>
            </label>
          </>
        ) : null}
        {isCancel ? (
          <label className="flex items-start gap-3 text-[13px] leading-6">
            <input type="checkbox" checked={form.waive} onChange={(e) => setForm((f) => ({ ...f, waive: e.target.checked }))} className="mt-1.5 size-4 accent-[var(--color-brass)]" />
            <span>免除する（回数を使わない）</span>
          </label>
        ) : null}
        {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
        {submit.done && result ? <Notice tone="success">{result}</Notice> : null}
        <Button type="submit" disabled={submit.busy} className="w-full">{submit.busy ? '保存しています…' : '記録する'}</Button>
      </form>

      <ul className="mt-6 space-y-3">
        {sessions.length === 0 ? <li><EmptyState title="まだ記録がありません" /></li> : null}
        {sessions.map((s) => (
          <li key={s.id} className="rounded-xl border border-line p-3.5">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] tracking-wider text-muted">
                {formatDateJa(s.sessionDate)}　{statusLabel(s)}
                {!s.share && s.status === 'attended' ? <span className="ml-2 rounded-full bg-sand px-2 py-0.5 text-[10px]">非表示</span> : null}
              </p>
              <ConfirmButton label="消す" confirmLabel={s.consumed ? '消して回数を戻す' : '消す'} onConfirm={async () => { await api.adminDeleteSession(s.id); reload(); }} />
            </div>
            {s.menu ? <p className="mt-1.5 text-sm leading-7 whitespace-pre-wrap">{s.menu}</p> : null}
            {s.homecare ? <p className="mt-1 text-xs leading-6 whitespace-pre-wrap text-muted"><span className="mr-1 text-brass">ホームケア</span>{s.homecare}</p> : null}
            {s.condition ? <p className="mt-1 text-xs leading-6 whitespace-pre-wrap text-muted"><span className="mr-1 text-brass">状態（内部）</span>{s.condition}</p> : null}
            {[s.consumed ? `回数 −${s.consumed}` : '', s.amount ? `${s.amount.toLocaleString('ja-JP')}円` : '', s.note].filter(Boolean).length > 0 ? (
              <p className="mt-1.5 text-[11px] text-muted">{[s.consumed ? `回数 −${s.consumed}` : '', s.amount ? `${s.amount.toLocaleString('ja-JP')}円` : '', s.note].filter(Boolean).join(' ／ ')}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function statusLabel(s: AdminSession): string {
  if (s.status === 'cancel_advance') return 'キャンセル（前日まで）';
  if (s.status === 'cancel_same_day') return 'キャンセル（当日）';
  if (s.status === 'noshow') return '無断キャンセル';
  return SESSION_TYPE_LABELS[s.type] ?? '';
}

function LinkSection({ client, reload }: { client: AdminClient; reload: () => void }) {
  const [email, setEmail] = useState(client.email);
  const submit = useSubmit();
  return (
    <Card>
      <h2 className="mb-1 text-base">会員ログインとのひもづけ</h2>
      <p className="mb-4 text-[11px] leading-5 text-muted">ひもづけると、お客様がログインしたときに、このカルテの「見せる項目」だけが表示されます。先に、お客様のログインアカウントを作っておいてください。</p>
      {client.userId ? (
        <Notice tone="success">ひもづけ済みです。</Notice>
      ) : (
        <form
          className="space-y-3"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await submit.run(async () => api.adminLinkClient(client.id, email));
            if (ok) reload();
          }}
        >
          <Field label="お客様のログイン用メールアドレス" htmlFor="l-email">
            <input id="l-email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
          <Button type="submit" variant="outline" disabled={submit.busy || !email.trim()} className="w-full">ひもづける</Button>
        </form>
      )}
    </Card>
  );
}
