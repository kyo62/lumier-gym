'use client';

import { useState } from 'react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseWorkoutForm } from '@/lib/member/inputs';
import type { WorkoutInput } from '@/lib/member/types';
import { cn } from '@/lib/utils';
import { RecordTabs, WorkoutList } from '@/components/member/logs';
import { ConsentGate } from '@/components/member/ConsentGate';
import { Button, Card, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

export default function WorkoutsPage() {
  return (
    <>
      <PageTitle eyebrow="Record" title="自主トレの記録" />
      <RecordTabs />
      <ConsentGate>
        <WorkoutsContent />
      </ConsentGate>
    </>
  );
}

type Row = { exercise: string; weightKg: string; reps: string; sets: string; note: string };
const emptyRow = (): Row => ({ exercise: '', weightKg: '', reps: '', sets: '', note: '' });

/** 自由記入は、メモの上限（500文字）に収まるよう、行の区切りで分けて保存する */
function chunkText(text: string, max = 480): string[] {
  const chunks: string[] = [];
  let cur = '';
  const push = () => {
    if (cur.trim() !== '') chunks.push(cur.trim());
    cur = '';
  };
  for (const line of text.split('\n')) {
    let rest = line;
    while ([...rest].length > max) {
      push();
      const head = [...rest].slice(0, max).join('');
      chunks.push(head);
      rest = rest.slice(head.length);
    }
    if ([...(cur + '\n' + rest)].length > max) push();
    cur = cur === '' ? rest : cur + '\n' + rest;
  }
  push();
  return chunks;
}

function WorkoutsContent() {
  const { data: logs, error, loading, reload } = useAsync(api.listWorkouts);
  const [loggedOn, setLoggedOn] = useState(todayLocal);
  const [mode, setMode] = useState<'rows' | 'free'>('rows');
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [free, setFree] = useState('');
  const submit = useSubmit();

  if (loading) return <Loading />;
  if (error || !logs) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const setRow = (i: number, key: keyof Row) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [key]: e.target.value } : r)));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputs: WorkoutInput[] = [];
    if (mode === 'rows') {
      const used = rows.filter((r) => Object.values(r).some((v) => v.trim() !== ''));
      if (used.length === 0) {
        submit.setError('種目を入力してください。');
        return;
      }
      for (let i = 0; i < used.length; i++) {
        const parsed = parseWorkoutForm({ loggedOn, ...used[i] });
        if (!parsed.ok) {
          submit.setError(used.length > 1 ? (i + 1) + 'つ目の種目：' + parsed.error : parsed.error);
          return;
        }
        inputs.push(parsed.value);
      }
    } else {
      if (free.trim() === '') {
        submit.setError('内容を入力してください。');
        return;
      }
      for (const chunk of chunkText(free)) {
        const parsed = parseWorkoutForm({ loggedOn, exercise: '自由記入', weightKg: '', reps: '', sets: '', note: chunk });
        if (!parsed.ok) {
          submit.setError(parsed.error);
          return;
        }
        inputs.push(parsed.value);
      }
    }
    const ok = await submit.run(async () => {
      for (const v of inputs) await api.addWorkout(v);
    });
    if (ok) {
      // 日付は残して、ほかを空にする
      setRows([emptyRow()]);
      setFree('');
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
            <input id="wo-date" type="date" required max={todayLocal()} value={loggedOn} onChange={(e) => setLoggedOn(e.target.value)} className={inputClass} />
          </Field>

          <div role="tablist" aria-label="入力のしかた" className="grid grid-cols-2 rounded-full border border-line bg-canvas p-1">
            {([
              ['rows', '種目ごとに入力'],
              ['free', '自由記入'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={mode === key}
                onClick={() => setMode(key)}
                className={cn(
                  'rounded-full py-2 text-xs tracking-wider transition-colors',
                  mode === key ? 'bg-ink text-canvas' : 'text-muted hover:text-ink'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'rows' ? (
            <>
              {rows.map((row, i) => (
                <div key={i} className="space-y-3 rounded-xl border border-line bg-canvas p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs tracking-wider text-muted">種目 {i + 1}</span>
                    {rows.length > 1 ? (
                      <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="text-xs text-muted underline underline-offset-4">
                        この種目を外す
                      </button>
                    ) : null}
                  </div>
                  <Field label="種目" htmlFor={'wo-exercise-' + i}>
                    <input id={'wo-exercise-' + i} autoComplete="off" value={row.exercise} onChange={setRow(i, 'exercise')} className={inputClass} placeholder="例：スクワット" />
                  </Field>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="重さ（kg）" htmlFor={'wo-weight-' + i}>
                      <input id={'wo-weight-' + i} inputMode="decimal" autoComplete="off" value={row.weightKg} onChange={setRow(i, 'weightKg')} className={inputClass} placeholder="20" />
                    </Field>
                    <Field label="回数" htmlFor={'wo-reps-' + i}>
                      <input id={'wo-reps-' + i} inputMode="numeric" autoComplete="off" value={row.reps} onChange={setRow(i, 'reps')} className={inputClass} placeholder="10" />
                    </Field>
                    <Field label="セット数" htmlFor={'wo-sets-' + i}>
                      <input id={'wo-sets-' + i} inputMode="numeric" autoComplete="off" value={row.sets} onChange={setRow(i, 'sets')} className={inputClass} placeholder="3" />
                    </Field>
                  </div>
                  <Field label="メモ（任意）" htmlFor={'wo-note-' + i}>
                    <textarea id={'wo-note-' + i} rows={2} value={row.note} onChange={setRow(i, 'note')} className={inputClass} placeholder="ランの距離やペース、感覚、気になったことなど" />
                  </Field>
                </div>
              ))}
              <p className="-mt-1 text-[11px] leading-5 text-muted">重さ・回数・セット数は、当てはまるものだけで大丈夫です（自重の種目は重さを空欄に）。</p>
              <button
                type="button"
                onClick={() => setRows((rs) => [...rs, emptyRow()])}
                className="w-full rounded-full border border-dashed border-brass py-3 text-sm text-ink transition-colors hover:bg-brass-soft"
              >
                ＋ 種目を追加
              </button>
            </>
          ) : (
            <Field label="その日の内容" htmlFor="wo-free">
              <textarea
                id="wo-free"
                rows={8}
                value={free}
                onChange={(e) => setFree(e.target.value)}
                className={inputClass}
                placeholder={'自由に書いてください。\n例：BP 60kg×6×1、70kg×5×2 / シーテッドロー 50kg×20×5 / Run 3km'}
              />
            </Field>
          )}

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
