'use client';

import { useState } from 'react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseBodyForm } from '@/lib/member/inputs';
import { BodyChartCard, BodyList, RecordTabs } from '@/components/member/logs';
import { ConsentGate } from '@/components/member/ConsentGate';
import { Button, Card, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

export default function BodyPage() {
  return (
    <>
      <PageTitle eyebrow="Record" title="からだの記録" />
      <RecordTabs />
      <ConsentGate>
        <BodyContent />
      </ConsentGate>
    </>
  );
}

function BodyContent() {
  const { data: logs, error, loading, reload } = useAsync(api.listBody);
  const [form, setForm] = useState(() => ({ loggedOn: todayLocal(), weightKg: '', bodyFatPct: '', muscleKg: '', note: '' }));
  const submit = useSubmit();

  if (loading) return <Loading />;
  if (error || !logs) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseBodyForm(form);
    if (!parsed.ok) {
      submit.setError(parsed.error);
      return;
    }
    const ok = await submit.run(async () => {
      await api.addBody(parsed.value);
    });
    if (ok) {
      setForm((f) => ({ ...f, weightKg: '', bodyFatPct: '', muscleKg: '', note: '' }));
      reload();
    }
  };

  return (
    <div className="space-y-8">
      <Notice>数字はあくまで目安です。気になるときは、無理に入力しなくても大丈夫です。</Notice>

      <BodyChartCard logs={logs} />

      <Card>
        <h2 className="mb-4 text-base">記録する</h2>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="日付" htmlFor="body-date">
            <input id="body-date" type="date" required max={todayLocal()} value={form.loggedOn} onChange={set('loggedOn')} className={inputClass} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="体重（kg）" htmlFor="body-weight">
              <input id="body-weight" inputMode="decimal" autoComplete="off" value={form.weightKg} onChange={set('weightKg')} className={inputClass} placeholder="52.4" />
            </Field>
            <Field label="体脂肪率（%）" htmlFor="body-fat">
              <input id="body-fat" inputMode="decimal" autoComplete="off" value={form.bodyFatPct} onChange={set('bodyFatPct')} className={inputClass} placeholder="24.1" />
            </Field>
            <Field label="筋肉量（kg）" htmlFor="body-muscle">
              <input id="body-muscle" inputMode="decimal" autoComplete="off" value={form.muscleKg} onChange={set('muscleKg')} className={inputClass} placeholder="37.5" />
            </Field>
          </div>
          <p className="-mt-1 text-[11px] leading-5 text-muted">測ったものだけで大丈夫です。どれか1つは入力してください。</p>
          <Field label="メモ（任意）" htmlFor="body-note">
            <textarea id="body-note" rows={2} value={form.note} onChange={set('note')} className={inputClass} placeholder="測った時間帯、体調など" />
          </Field>

          {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
          {submit.done ? <Notice tone="success">{submit.done}</Notice> : null}
          <Button type="submit" disabled={submit.busy} className="w-full">
            {submit.busy ? '保存しています…' : '保存する'}
          </Button>
        </form>
      </Card>

      <section>
        <h2 className="mb-4 text-base">これまでの記録</h2>
        <BodyList
          logs={logs}
          onDelete={async (id) => {
            await api.deleteBody(id);
            reload();
          }}
        />
      </section>
    </div>
  );
}
