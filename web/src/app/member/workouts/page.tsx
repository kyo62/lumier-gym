'use client';

import { useState } from 'react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseWorkoutForm } from '@/lib/member/inputs';
import { RecordTabs, WorkoutList } from '@/components/member/logs';
import { ConsentGate } from '@/components/member/ConsentGate';
import { Button, Card, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

export default function WorkoutsPage() {
  return (
    <>
      <PageTitle eyebrow="Record" title="トレーニングの記録" />
      <RecordTabs />
      <ConsentGate>
        <WorkoutsContent />
      </ConsentGate>
    </>
  );
}

const empty = () => ({ loggedOn: todayLocal(), exercise: '', weightKg: '', reps: '', sets: '', note: '' });

function WorkoutsContent() {
  const { data: logs, error, loading, reload } = useAsync(api.listWorkouts);
  const [form, setForm] = useState(empty);
  const submit = useSubmit();

  if (loading) return <Loading />;
  if (error || !logs) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseWorkoutForm(form);
    if (!parsed.ok) {
      submit.setError(parsed.error);
      return;
    }
    const ok = await submit.run(async () => {
      await api.addWorkout(parsed.value);
    });
    if (ok) {
      // 同じ種目を続けて入れやすいよう、日付は残して、ほかを空にする
      setForm((f) => ({ ...empty(), loggedOn: f.loggedOn }));
      reload();
    }
  };

  return (
    <div className="space-y-8">
      <Notice>痛みを感じたときは、無理をせず中止してください。通院中の方は、医療機関にご相談のうえ行ってください。</Notice>

      <Card>
        <h2 className="mb-4 text-base">記録する</h2>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="日付" htmlFor="wo-date">
            <input id="wo-date" type="date" required max={todayLocal()} value={form.loggedOn} onChange={set('loggedOn')} className={inputClass} />
          </Field>
          <Field label="種目" htmlFor="wo-exercise">
            <input id="wo-exercise" autoComplete="off" value={form.exercise} onChange={set('exercise')} className={inputClass} placeholder="例：スクワット" />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="重さ（kg）" htmlFor="wo-weight">
              <input id="wo-weight" inputMode="decimal" autoComplete="off" value={form.weightKg} onChange={set('weightKg')} className={inputClass} placeholder="20" />
            </Field>
            <Field label="回数" htmlFor="wo-reps">
              <input id="wo-reps" inputMode="numeric" autoComplete="off" value={form.reps} onChange={set('reps')} className={inputClass} placeholder="10" />
            </Field>
            <Field label="セット数" htmlFor="wo-sets">
              <input id="wo-sets" inputMode="numeric" autoComplete="off" value={form.sets} onChange={set('sets')} className={inputClass} placeholder="3" />
            </Field>
          </div>
          <p className="-mt-1 text-[11px] leading-5 text-muted">重さ・回数・セット数は、当てはまるものだけで大丈夫です（自重の種目は重さを空欄に）。</p>
          <Field label="メモ（任意）" htmlFor="wo-note">
            <textarea id="wo-note" rows={2} value={form.note} onChange={set('note')} className={inputClass} placeholder="やってみた感覚、気になったことなど" />
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
        <WorkoutList
          logs={logs}
          onDelete={async (id) => {
            await api.deleteWorkout(id);
            reload();
          }}
        />
      </section>
    </div>
  );
}
