'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/member/api';
import { PLANS, PLAN_KEYS, carryValid, ticketExpire } from '@/lib/member/karteRules';
import { todayLocal } from '@/lib/member/dates';
import type { AdminClient } from '@/lib/member/types';
import { AdminGate, BackLink } from '@/components/member/AdminGate';
import { ClientDetail } from '@/components/member/adminKarte';
import { Button, Card, EmptyState, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

/**
 * カルテ（施術者だけ）。カルテごとのURLは事前に作れないため、
 * /member/admin/clients?id=… のように、URL の後ろで指定する。
 */
export default function AdminClientsPage() {
  return (
    <AdminGate>
      <Suspense fallback={<Loading />}>
        <Switch />
      </Suspense>
    </AdminGate>
  );
}

function Switch() {
  const id = useSearchParams().get('id');
  return id ? (
    <>
      <BackLink href="/member/admin/clients">カルテの一覧</BackLink>
      <ClientDetail id={id} />
    </>
  ) : (
    <ClientList />
  );
}

function alertCount(c: AdminClient): number {
  const today = todayLocal();
  const expire = ticketExpire(c.ticketDate);
  let n = 0;
  if (!c.consentOn) n++;
  if (c.carry > 0 && carryValid(c, today) === 0) n++;
  if (PLANS[c.plan]?.kind === 'ticket' && expire && expire < today && c.remain > 0) n++;
  return n;
}

function ClientList() {
  const { data: clients, error, loading, reload } = useAsync(api.adminListClients);
  const [q, setQ] = useState('');
  const [name, setName] = useState('');
  const [plan, setPlan] = useState('trial');
  const create = useSubmit();
  const router = useRouter();

  const shown = (clients ?? []).filter((c) => !q.trim() || `${c.code}${c.name}${c.kana}${c.hobby}${c.purpose}`.includes(q.trim()));

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    let createdId = '';
    const ok = await create.run(async () => {
      const c = await api.adminSaveClient({
        name, kana: '', gender: '女性', phone: '', email: '', referrer: '', hobby: '', plan,
        ticketCount: null, ticketDate: null, remain: PLANS[plan]?.sessions ?? 0, carry: 0, carryExpire: null,
        stretchRemain: 0, stretchExpire: null, targetLabel: '', targetDate: null, consentOn: null,
        purpose: '', goal: '', intakeBody: '', posture: '', homework: '', internalNote: '',
      });
      createdId = c.id;
    });
    if (ok && createdId) router.push(`/member/admin/clients?id=${encodeURIComponent(createdId)}`);
    else reload();
  };

  return (
    <div className="space-y-6">
      <BackLink href="/member/admin">施術者メニュー</BackLink>
      <PageTitle eyebrow="For practitioner" title="カルテ" lead="お客様のカルテを管理します。会員ログインにひもづけると、「見せる項目」だけがお客様の画面に出ます。" />

      <Card>
        <h2 className="mb-4 text-base">新しいカルテを作る</h2>
        <form onSubmit={onCreate} className="space-y-4" noValidate>
          <Field label="お名前" htmlFor="n-name"><input id="n-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
          <Field label="プラン" htmlFor="n-plan">
            <select id="n-plan" value={plan} onChange={(e) => setPlan(e.target.value)} className={inputClass}>
              {PLAN_KEYS.map((k) => <option key={k} value={k}>{PLANS[k].label}</option>)}
            </select>
          </Field>
          {create.error ? <Notice tone="error">{create.error}</Notice> : null}
          <Button type="submit" disabled={create.busy || !name.trim()} className="w-full">カルテを作る</Button>
        </form>
      </Card>

      <input aria-label="検索" value={q} onChange={(e) => setQ(e.target.value)} className={inputClass} placeholder="お名前・コード・目的で検索" />

      {loading ? (
        <Loading />
      ) : error || !clients ? (
        <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>
      ) : shown.length === 0 ? (
        <EmptyState title="該当するカルテがありません" />
      ) : (
        <ul className="space-y-3">
          {shown.map((c) => {
            const n = alertCount(c);
            return (
              <li key={c.id}>
                <Link href={`/member/admin/clients?id=${encodeURIComponent(c.id)}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brass">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] tracking-wider text-muted">{c.code}</span>
                    <span className="block truncate text-sm">{c.name}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                      <span>{PLANS[c.plan]?.label ?? c.plan}</span>
                      <span>残り {c.remain}回</span>
                      {c.userId ? <span>ログイン：ひもづけ済み</span> : <span>ログイン：未</span>}
                      {n > 0 ? <span className="rounded-full bg-brass-soft px-2 py-0.5 text-ink">要確認 {n}</span> : null}
                    </span>
                  </span>
                  <ArrowRight size={16} className="shrink-0 text-muted" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
