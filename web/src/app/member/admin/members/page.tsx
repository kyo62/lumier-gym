'use client';

import { Suspense, useCallback, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { api } from '@/lib/member/api';
import { formatDateFullJa } from '@/lib/member/dates';
import { cn } from '@/lib/utils';
import { AdminGate, BackLink } from '@/components/member/AdminGate';
import { BodyChartCard, BodyList, MealList, WorkoutList } from '@/components/member/logs';
import { EmptyState, Loading, Notice, PageTitle, useAsync } from '@/components/member/ui';

/**
 * 会員の記録の閲覧（閲覧のみ）。会員ごとのURLは事前に作れないため、
 * /member/admin/members?id=… のように、URL の後ろで会員を指定する。
 */
export default function AdminMembersPage() {
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
  return id ? <MemberDetail id={id} /> : <MemberList />;
}

function MemberList() {
  const { data: members, error, loading } = useAsync(api.adminListMembers);
  return (
    <div className="space-y-6">
      <BackLink href="/member/admin">施術者メニュー</BackLink>
      <PageTitle eyebrow="For practitioner" title="会員の記録" lead="会員が入力した記録を閲覧できます（閲覧のみ。書き換え・削除はできません）。" />
      {loading ? (
        <Loading />
      ) : error || !members ? (
        <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>
      ) : members.length === 0 ? (
        <EmptyState title="まだ会員がいません" />
      ) : (
        <ul className="space-y-3">
          {members.map((m) => (
            <li key={m.id}>
              <Link
                href={`/member/admin/members?id=${encodeURIComponent(m.id)}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brass"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{m.displayName || m.email}</span>
                  {m.displayName ? <span className="block truncate text-[11px] text-muted">{m.email}</span> : null}
                  <span className="mt-1 block text-[11px] text-muted">
                    {m.consentedAt ? '記録への同意：済み' : '記録への同意：まだ'}
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-muted" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type Tab = 'body' | 'meals' | 'workouts';
const TAB_LABELS: Record<Tab, string> = { body: '体組成', meals: '食事', workouts: 'トレーニング' };

function MemberDetail({ id }: { id: string }) {
  const loadMember = useCallback(async () => (await api.adminListMembers()).find((m) => m.id === id) ?? null, [id]);
  const loadLogs = useCallback(() => api.adminGetMemberLogs(id), [id]);
  const { data: member, loading: memberLoading } = useAsync(loadMember);
  const { data: logs, error, loading } = useAsync(loadLogs);
  const [tab, setTab] = useState<Tab>('body');

  return (
    <div className="space-y-6">
      <BackLink href="/member/admin/members">会員の一覧へ</BackLink>

      {loading || memberLoading ? (
        <Loading />
      ) : error || !logs ? (
        <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>
      ) : !member ? (
        <EmptyState title="この会員は見つかりませんでした" />
      ) : (
        <>
          <PageTitle
            eyebrow="Member"
            title={member.displayName || member.email}
            lead={member.consentedAt ? `記録への同意：${formatDateFullJa(member.consentedAt.slice(0, 10))}` : '記録への同意は、まだです。'}
          />
          <Notice tone="warn">閲覧のみです。会員の同意のもとで、セッションの準備など目的の範囲で確認してください。</Notice>

          <div role="tablist" aria-label="記録の種類" className="grid grid-cols-3 rounded-full border border-line bg-surface p-1">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'rounded-full py-2.5 text-xs tracking-wider transition-colors',
                  tab === t ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {tab === 'body' ? (
            <div className="space-y-6">
              <BodyChartCard logs={logs.body} />
              <BodyList logs={logs.body} />
            </div>
          ) : tab === 'meals' ? (
            <MealList logs={logs.meals} />
          ) : (
            <WorkoutList logs={logs.workouts} />
          )}
        </>
      )}
    </div>
  );
}
