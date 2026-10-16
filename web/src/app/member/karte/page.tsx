'use client';

import { api } from '@/lib/member/api';
import { formatDateFullJa, formatDateJa } from '@/lib/member/dates';
import { PLAN_LABELS, SESSION_TYPE_LABELS } from '@/lib/member/karte';
import { Card, EmptyState, Loading, Notice, PageTitle, useAsync } from '@/components/member/ui';

export default function KartePage() {
  const status = useAsync(api.getMyStatus);
  const sessions = useAsync(api.listMySessions);

  if (status.loading || sessions.loading) return <Loading />;
  if (status.error || sessions.error) return <Notice tone="error">{status.error ?? sessions.error}</Notice>;

  const s = status.data;
  if (!s) {
    return (
      <>
        <PageTitle eyebrow="Karte" title="カルテ" />
        <EmptyState title="カルテは、準備ができ次第こちらに表示されます" body="初回のセッションのあとに、サロンが設定します。" />
      </>
    );
  }

  const counts: { label: string; value: string; sub?: string }[] = [
    { label: '今月の残り', value: `${s.remain}回` },
    ...(s.carry > 0 ? [{ label: '繰越', value: `${s.carry}回`, sub: s.carryExpire ? `${formatDateJa(s.carryExpire)}まで` : undefined }] : []),
    ...(s.ticketExpire ? [{ label: '回数券の期限', value: formatDateJa(s.ticketExpire) }] : []),
  ];

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Karte" title="カルテ" lead={`ご利用プラン：${PLAN_LABELS[s.plan] ?? s.plan}`} />

      <Card>
        <h2 className="mb-4 text-base">回数</h2>
        <ul className="grid grid-cols-2 gap-3">
          {counts.map((c) => (
            <li key={c.label} className="rounded-xl bg-sand/60 px-4 py-3">
              <p className="text-[11px] tracking-wider text-muted">{c.label}</p>
              <p className="tnum mt-1 text-lg">{c.value}</p>
              {c.sub ? <p className="mt-0.5 text-[11px] text-muted">{c.sub}</p> : null}
            </li>
          ))}
        </ul>
      </Card>

      {s.targetLabel || s.goal ? (
        <Card>
          <h2 className="mb-3 text-base">目標</h2>
          {s.targetLabel ? (
            <p className="text-sm leading-7">
              {s.targetLabel}
              {s.targetDate ? <span className="ml-2 text-xs text-muted">{formatDateFullJa(s.targetDate)}</span> : null}
            </p>
          ) : null}
          {s.goal ? <p className="mt-1 text-sm leading-7 whitespace-pre-wrap text-ink/90">{s.goal}</p> : null}
        </Card>
      ) : null}

      {s.homework ? (
        <Card>
          <h2 className="mb-3 text-base">ご自宅でのホームケア</h2>
          <p className="text-sm leading-7 whitespace-pre-wrap">{s.homework}</p>
          <p className="mt-3 text-[11px] leading-5 text-muted">できる範囲で大丈夫です。痛みを感じたときは、無理をせず中止してください。</p>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-4 text-base">セッションの記録</h2>
        {(sessions.data ?? []).length === 0 ? (
          <EmptyState title="まだ記録がありません" />
        ) : (
          <ul className="space-y-3">
            {(sessions.data ?? []).map((x) => (
              <li key={`${x.sessionDate}-${x.menu}`} className="rounded-2xl border border-line bg-surface p-4">
                <p className="text-[11px] tracking-wider text-muted">
                  {formatDateJa(x.sessionDate)}　{SESSION_TYPE_LABELS[x.type] ?? ''}
                </p>
                {x.menu ? <p className="mt-1.5 text-sm leading-7 whitespace-pre-wrap">{x.menu}</p> : null}
                {x.homecare ? (
                  <p className="mt-2 text-xs leading-6 whitespace-pre-wrap text-muted">
                    <span className="mr-1 text-brass">ホームケア</span>
                    {x.homecare}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {s.purpose || s.hobby || s.intakeBody ? (
        <Card>
          <h2 className="mb-3 text-base">最初にお書きいただいた内容</h2>
          <dl className="space-y-3 text-sm leading-7">
            {s.purpose ? (
              <div>
                <dt className="text-[11px] tracking-wider text-muted">ご来店の目的</dt>
                <dd className="whitespace-pre-wrap">{s.purpose}</dd>
              </div>
            ) : null}
            {s.intakeBody ? (
              <div>
                <dt className="text-[11px] tracking-wider text-muted">気になっていること</dt>
                <dd className="whitespace-pre-wrap">{s.intakeBody}</dd>
              </div>
            ) : null}
            {s.hobby ? (
              <div>
                <dt className="text-[11px] tracking-wider text-muted">趣味・競技・生活</dt>
                <dd className="whitespace-pre-wrap">{s.hobby}</dd>
              </div>
            ) : null}
          </dl>
        </Card>
      ) : null}
    </div>
  );
}
