'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/member/api';
import { addMonthsString, formatDateJa, todayLocal } from '@/lib/member/dates';
import { PLANS, PLAN_KEYS, SESSION_CHOICES, STRETCH_TICKET, carryValid, planInfo, stretchValid, ticketExpire } from '@/lib/member/karteRules';
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

/** 保存する項目（回数の項目は、記録のたびに変わるので、ここには含めない） */
type Draft = Omit<AdminClientInput, 'id' | 'remain' | 'carry' | 'carryExpire' | 'stretchRemain' | 'stretchExpire'>;
const draftOf = (c: AdminClient): Draft => ({
  name: c.name, kana: c.kana, gender: c.gender, phone: c.phone, email: c.email, referrer: c.referrer, hobby: c.hobby,
  plan: c.plan, ticketCount: c.ticketCount, ticketDate: c.ticketDate, targetLabel: c.targetLabel, targetDate: c.targetDate,
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
  const date = (k: 'ticketDate' | 'targetDate' | 'consentOn') => (e: React.ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: nullIfEmpty(e.target.value) }));

  /** いちばん新しい回数を読み直してから、入力した項目を保存する（記録で変わった回数を、上書きしない） */
  const saveDraft = async () => {
    const ok = await save.run(async () => {
      const fresh = (await api.adminListClients()).find((c) => c.id === client.id) ?? client;
      await api.adminSaveClient({ ...fresh, ...draft, id: client.id });
    });
    if (ok) reload();
  };
  /** 回数だけを、すぐに保存する */
  const saveCounters = async (patch: Partial<AdminClient>) => {
    const ok = await save.run(async () => {
      const fresh = (await api.adminListClients()).find((c) => c.id === client.id) ?? client;
      await api.adminSaveClient({ ...fresh, ...patch, id: client.id });
    });
    if (ok) reload();
  };

  const info = planInfo(draft.plan);
  const expire = ticketExpire(draft.ticketDate);
  const carry = carryValid(client, today);
  const stretch = stretchValid(client, today);
  const alerts: string[] = [];
  if (!client.userId) alerts.push('会員ログインに、まだひもづいていません（お客様の画面には出ません）');
  if (!client.consentOn) alerts.push('個人情報の取扱いへの同意日が、未入力です');
  if (client.carry > 0 && client.carryExpire && client.carryExpire < today) alerts.push(`繰越 ${client.carry} 回の期限（${formatDateJa(client.carryExpire)}）が過ぎています`);
  if (expire && expire < today && client.remain > 0) alerts.push(`回数券の期限（${formatDateJa(expire)}）が過ぎています`);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] tracking-[0.3em] text-brass">{client.code}</p>
        <h1 className="mt-1 text-[1.5rem]">{client.name} 様</h1>
        <p className="mt-1 text-xs text-muted">{PLANS[client.plan]?.label ?? client.plan}</p>
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
          <Field label="ご紹介者（男性のお客様は必須）" htmlFor="c-ref"><input id="c-ref" value={draft.referrer} onChange={text('referrer')} className={inputClass} /></Field>
          <Field label="趣味・競技・生活" htmlFor="c-hobby"><input id="c-hobby" value={draft.hobby} onChange={text('hobby')} className={inputClass} /></Field>
          <Field label="個人情報の取扱い 同意日" htmlFor="c-consent"><input id="c-consent" type="date" value={draft.consentOn ?? ''} onChange={date('consentOn')} className={inputClass} /></Field>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-base">プランと回数</h2>
        <div className="space-y-4">
          <Field label="プラン" htmlFor="c-plan">
            <select id="c-plan" value={draft.plan} onChange={text('plan')} className={inputClass}>
              {PLAN_KEYS.map((k) => <option key={k} value={k}>{PLANS[k].label}{PLANS[k].price ? `（${PLANS[k].price?.toLocaleString('ja-JP')}円）` : ''}</option>)}
            </select>
          </Field>
          {info.kind === 'ticket' ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="回数券の回数（1回 8,800円）" htmlFor="c-tc">
                <input id="c-tc" inputMode="numeric" value={draft.ticketCount ?? ''} onChange={(e) => setDraft((d) => ({ ...d, ticketCount: e.target.value === '' ? null : intOr0(e.target.value) }))} className={inputClass} />
              </Field>
              <Field label="購入日（2か月有効）" htmlFor="c-td" hint={expire ? `期限：${formatDateJa(expire)}` : undefined}>
                <input id="c-td" type="date" value={draft.ticketDate ?? ''} onChange={date('ticketDate')} className={inputClass} />
              </Field>
            </div>
          ) : null}

          <ul className="grid grid-cols-2 gap-3">
            <Counter label="今月の残り" value={client.remain} onChange={(n) => saveCounters({ remain: n })} busy={save.busy} />
            <Counter label={`繰越${client.carryExpire ? `（${formatDateJa(client.carryExpire)}まで）` : ''}`} value={client.carry} dim={client.carry > 0 && carry === 0} onChange={(n) => saveCounters({ carry: n, carryExpire: n > 0 ? client.carryExpire : null })} busy={save.busy} />
            <Counter label={`ストレッチ回数券${client.stretchExpire ? `（${formatDateJa(client.stretchExpire)}まで）` : ''}`} value={client.stretchRemain} dim={client.stretchRemain > 0 && stretch === 0} onChange={(n) => saveCounters({ stretchRemain: n })} busy={save.busy} />
          </ul>

          <div className="flex flex-wrap gap-2">
            {info.kind === 'monthly' ? (
              <ConfirmButton
                label="月次の締め（月初に1回）"
                confirmLabel={info.shared ? '残りはなくなります。締める' : '残りを繰越にして締める'}
                variant="outline"
                onConfirm={async () => {
                  const ok = await save.run(async () => void (await api.adminRollMonth(client.id)));
                  if (ok) reload();
                }}
              />
            ) : null}
            <ConfirmButton
              label={`ストレッチ回数券を追加（${STRETCH_TICKET.count}回 ${STRETCH_TICKET.price.toLocaleString('ja-JP')}円）`}
              confirmLabel="追加する"
              variant="outline"
              onConfirm={() => saveCounters({ stretchRemain: client.stretchRemain + STRETCH_TICKET.count, stretchExpire: addMonthsString(today, STRETCH_TICKET.months) })}
            />
          </div>
          {info.shared ? <p className="text-[11px] leading-5 text-muted">家族割は、ご家族で回数をシェアします。繰越はありません。</p> : null}
          {save.error ? <Notice tone="error">{save.error}</Notice> : null}
        </div>
      </Card>

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

function Counter({ label, value, onChange, busy, dim }: { label: string; value: number; onChange: (n: number) => void; busy: boolean; dim?: boolean }) {
  return (
    <li className="rounded-xl bg-sand/60 px-3 py-3">
      <p className="text-[11px] leading-4 tracking-wider text-muted">{label}</p>
      <p className={`tnum mt-1 text-xl ${dim ? 'text-muted line-through' : ''}`}>{value}<span className="ml-1 text-xs text-muted">回</span></p>
      <div className="mt-2 flex gap-2">
        <button type="button" aria-label={`${label}を1減らす`} disabled={busy || value <= 0} onClick={() => onChange(value - 1)} className="grid size-9 place-items-center rounded-full border border-line bg-surface text-lg disabled:opacity-40">−</button>
        <button type="button" aria-label={`${label}を1増やす`} disabled={busy || value >= 99} onClick={() => onChange(value + 1)} className="grid size-9 place-items-center rounded-full border border-line bg-surface text-lg disabled:opacity-40">＋</button>
      </div>
    </li>
  );
}

function SessionSection({ client, sessions, reload }: { client: AdminClient; sessions: AdminSession[]; reload: () => void }) {
  const [form, setForm] = useState({ sessionDate: todayLocal(), choice: 'regular', menu: '', homecare: '', condition: '', share: true, waive: false });
  const submit = useSubmit();
  const [result, setResult] = useState('');
  const set = (k: 'sessionDate' | 'choice' | 'menu' | 'homecare' | 'condition') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const isCancel = form.choice === 'cancel_same' || form.choice === 'noshow';
  const attended = SESSION_CHOICES.find((c) => c.key === form.choice)?.status === 'attended';
  const ng = hits(form.menu, form.homecare);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await submit.run(async () => {
      setResult(await api.adminRecordSession(client.id, form));
    });
    if (ok) {
      setForm((f) => ({ ...f, menu: '', homecare: '', condition: '', waive: false }));
      reload();
    }
  };

  return (
    <Card>
      <h2 className="mb-1 text-base">セッションの記録</h2>
      <p className="mb-4 text-[11px] leading-5 text-muted">記録すると、回数・繰越・キャンセル料が自動で計算されます。「メニュー」「ホームケア」は、お客様の画面に表示されます。</p>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="日付" htmlFor="s-date"><input id="s-date" type="date" value={form.sessionDate} onChange={set('sessionDate')} className={inputClass} /></Field>
          <Field label="種類" htmlFor="s-choice">
            <select id="s-choice" value={form.choice} onChange={set('choice')} className={inputClass}>
              {SESSION_CHOICES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
        </div>
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
            <span>免除する（キャンセル料・回数の消化をなしにする）</span>
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
            {[s.consumed ? `回数 −${s.consumed}` : '', s.amount ? `${s.amount.toLocaleString('ja-JP')}円` : '', s.fee ? `キャンセル料 ${s.fee.toLocaleString('ja-JP')}円` : '', s.note].filter(Boolean).length > 0 ? (
              <p className="mt-1.5 text-[11px] text-muted">{[s.consumed ? `回数 −${s.consumed}` : '', s.amount ? `${s.amount.toLocaleString('ja-JP')}円` : '', s.fee ? `キャンセル料 ${s.fee.toLocaleString('ja-JP')}円` : '', s.note].filter(Boolean).join(' ／ ')}</p>
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
