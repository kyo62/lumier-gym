'use client';

import { api } from '@/lib/member/api';
import { formatDateFullJa, formatDateJa } from '@/lib/member/dates';
import { SESSION_TYPE_LABELS } from '@/lib/member/karte';
import { EXPIRING_DAYS, daysLeft } from '@/lib/member/karteRules';
import { todayLocal } from '@/lib/member/dates';
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

  const today = todayLocal();

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Karte" title="カルテ" />

      <Card>
        <h2 className="mb-4 text-base">回数券</h2>
        {s.tickets.length === 0 ? (
          <p className="text-sm leading-7 text-muted">いま使える回数券はありません。ご希望の際は、LINEまたはお電話でお知らせください。</p>
        ) : (
          <ul className="space-y-3">
            {s.tickets.map((t) => {
              const d = daysLeft(t, today);
              const soon = d !== null && d <= EXPIRING_DAYS;
              return (
                <li key={t.id} className="rounded-xl bg-sand/60 px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm">{t.label}<span className="ml-2 text-[11px] text-muted">{t.minutes}分</span></p>
                    <p className="tnum text-lg">{t.remain}<span className="ml-1 text-xs text-muted">/ {t.total} 回</span></p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">{t.expiresOn ? `${formatDateJa(t.expiresOn)}まで` : '期限なし'}</p>
                  {soon ? <p className="mt-2 text-xs leading-6 text-ink">期限が近づいています（あと{d}日）。ご予約はお早めにどうぞ。</p> : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-[11px] leading-5 text-muted">期限を過ぎた回数券は、お使いいただけません。回数は、期限の近い券から使います。</p>
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
