'use client';

import { useState } from 'react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseWorkoutForm } from '@/lib/member/inputs';
import type { WorkoutLog } from '@/lib/member/types';
import { RecordTabs, WorkoutList, fmt } from '@/components/member/logs';
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

const SUGGESTIONS = ['スクワット', 'ヒップリフト', 'ランジ', 'プランク', 'ラットプルダウン', 'ウォーキング', 'ストレッチ'];

/** 最近やった種目（新しい順に重複を除く）。押すと、前回の重さ・回数・セット数が入る */
function recentExercises(logs: WorkoutLog[], limit = 6): WorkoutLog[] {
  const seen = new Set<string>();
  const out: WorkoutLog[] = [];
  for (const l of logs) {
    if (seen.has(l.exercise)) continue;
    seen.add(l.exercise);
    out.push(l);
    if (out.length >= limit) break;
  }
  return out;
}

const empty = () => ({ loggedOn: todayLocal(), exercise: '', weightKg: '', reps: '', sets: '', note: '' });

function WorkoutsContent() {
  const { data: logs, error, loading, reload } = useAsync(api.listWorkouts);
  const [form, setForm] = useState(empty);
  const submit = useSubmit();

  if (loading) return <Loading />;
  if (error || !logs) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const recent = recentExercises(logs);
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

        {recent.length > 0 ? (
          <div className="mb-5">
            <p className="mb-2 text-[11px] tracking-wider text-muted">最近の種目（タップで前回の内容が入ります）</p>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => (
                <button
                  key={r.exercise}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      exercise: r.exercise,
                      weightKg: r.weightKg !== null ? fmt(r.weightKg, 2) : '',
                      reps: r.reps !== null ? String(r.reps) : '',
                      sets: r.sets !== null ? String(r.sets) : '',
                    }))
                  }
                  className="rounded-full border border-line bg-canvas px-3.5 py-1.5 text-xs text-ink transition-colors hover:border-brass"
                >
                  {r.exercise}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="日付" htmlFor="wo-date">
            <input id="wo-date" type="date" required max={todayLocal()} value={form.loggedOn} onChange={set('loggedOn')} className={inputClass} />
          </Field>
          <Field label="種目" htmlFor="wo-exercise">
            <input id="wo-exercise" list="wo-suggestions" autoComplete="off" value={form.exercise} onChange={set('exercise')} className={inputClass} placeholder="スクワット" />
            <datalist id="wo-suggestions">
              {SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
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
