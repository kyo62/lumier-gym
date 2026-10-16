'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseActivityForm } from '@/lib/member/inputs';
import { ACTIVITY_KINDS, ACTIVITY_KIND_LABELS, type ActivityLog } from '@/lib/member/types';
import { ActivityCard } from '@/components/member/activity';
import { RecordTabs } from '@/components/member/logs';
import { ConsentGate } from '@/components/member/ConsentGate';
import { Button, Card, ConfirmButton, EmptyState, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

export default function ActivityPage() {
  return (
    <>
      <PageTitle eyebrow="Record" title="自主トレの記録" />
      <RecordTabs />
      <ConsentGate>
        <ActivityContent />
      </ConsentGate>
    </>
  );
}

const empty = () => ({ loggedOn: todayLocal(), kind: 'training', minutes: '', note: '' });

function ActivityContent() {
  const { data: logs, error, loading, reload } = useAsync(api.listActivities);
  if (loading) return <Loading />;
  if (error || !logs) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;
  return <ActivityView logs={logs} reload={reload} />;
}

function ActivityView({ logs, reload }: { logs: ActivityLog[]; reload: () => void }) {
  const [form, setForm] = useState(empty);
  const submit = useSubmit();

  // 開いた時点で「新着」だったコメントに印をつけ、そのあと「読んだ」にする（印は、画面を離れるまで残る）
  const [fresh] = useState<ReadonlySet<string>>(
    () => new Set(logs.flatMap((l) => l.comments.filter((c) => !c.seenAt).map((c) => c.id)))
  );
  useEffect(() => {
    if (fresh.size > 0) void api.markCommentsSeen().catch(() => {});
  }, [fresh]);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseActivityForm(form);
    if (!parsed.ok) {
      submit.setError(parsed.error);
      return;
    }
    const ok = await submit.run(async () => {
      await api.addActivity(parsed.value);
    });
    if (ok) {
      setForm((f) => ({ ...empty(), loggedOn: f.loggedOn, kind: f.kind }));
      reload();
    }
  };

  return (
    <div className="space-y-8">
      <Notice>
        トレーニング・ストレッチ・歩いた日など、体を動かしたことを、気軽に記録してください。
        記録には、TONEKA からコメントが届くことがあります（お返事は不要です）。痛みを感じたときは、無理をせず中止してください。
      </Notice>

      <Card>
        <h2 className="mb-4 text-base">やったことを記録する</h2>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="日付" htmlFor="ac-date">
            <input id="ac-date" type="date" required max={todayLocal()} value={form.loggedOn} onChange={set('loggedOn')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="種類" htmlFor="ac-kind">
              <select id="ac-kind" value={form.kind} onChange={set('kind')} className={inputClass}>
                {ACTIVITY_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ACTIVITY_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="時間（分・任意）" htmlFor="ac-minutes">
              <input id="ac-minutes" inputMode="numeric" autoComplete="off" value={form.minutes} onChange={set('minutes')} className={inputClass} placeholder="30" />
            </Field>
          </div>
          <Field label="ひとこと（任意）" htmlFor="ac-note">
            <textarea id="ac-note" rows={3} value={form.note} onChange={set('note')} className={inputClass} placeholder="やってみた感覚、気づいたことなど" />
          </Field>

          {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
          {submit.done ? <Notice tone="success">{submit.done}</Notice> : null}
          <Button type="submit" disabled={submit.busy} className="w-full">
            {submit.busy ? '保存しています…' : '記録する'}
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-4 text-base">これまでの記録</h2>
        {logs.length === 0 ? (
          <EmptyState title="まだ記録がありません" body="今日、歩いた・伸ばした・動いた、どれでも大丈夫です。" />
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <ActivityCard
                key={log.id}
                log={log}
                freshIds={fresh}
                actions={
                  <ConfirmButton
                    label="削除"
                    onConfirm={async () => {
                      await api.deleteActivity(log.id);
                      reload();
                    }}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
