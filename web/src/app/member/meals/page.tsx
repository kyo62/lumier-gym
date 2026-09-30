'use client';

import { useState } from 'react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseMealForm } from '@/lib/member/inputs';
import { MEAL_TYPES, MEAL_TYPE_LABELS, type MealType } from '@/lib/member/types';
import { cn } from '@/lib/utils';
import { MealList, RecordTabs } from '@/components/member/logs';
import { ConsentGate } from '@/components/member/ConsentGate';
import { Button, Card, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

export default function MealsPage() {
  return (
    <>
      <PageTitle eyebrow="Record" title="食事の記録" />
      <RecordTabs />
      <ConsentGate>
        <MealsContent />
      </ConsentGate>
    </>
  );
}

/** 開いた時間帯に合わせて、食事の種類の初期値を決める */
function defaultMealType(now = new Date()): MealType {
  const h = now.getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

function MealsContent() {
  const { data: logs, error, loading, reload } = useAsync(api.listMeals);
  const [form, setForm] = useState(() => ({ loggedOn: todayLocal(), mealType: defaultMealType() as string, content: '', note: '' }));
  const submit = useSubmit();

  if (loading) return <Loading />;
  if (error || !logs) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseMealForm(form);
    if (!parsed.ok) {
      submit.setError(parsed.error);
      return;
    }
    const ok = await submit.run(async () => {
      await api.addMeal(parsed.value);
    });
    if (ok) {
      setForm((f) => ({ ...f, content: '', note: '' }));
      reload();
    }
  };

  return (
    <div className="space-y-8">
      <Notice>
        食事の内容について、良い・悪いの判断はしません。気づいたことのメモとして使ってください。
        病名やアレルギーなど、医療に関わることは書かないでください。
      </Notice>

      <Card>
        <h2 className="mb-4 text-base">記録する</h2>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="日付" htmlFor="meal-date">
            <input
              id="meal-date"
              type="date"
              required
              max={todayLocal()}
              value={form.loggedOn}
              onChange={(e) => setForm((f) => ({ ...f, loggedOn: e.target.value }))}
              className={inputClass}
            />
          </Field>

          <div>
            <p className="mb-1.5 text-xs tracking-wider text-muted" id="meal-type-label">
              食事の種類
            </p>
            <div role="radiogroup" aria-labelledby="meal-type-label" className="grid grid-cols-4 gap-2">
              {MEAL_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={form.mealType === t}
                  onClick={() => setForm((f) => ({ ...f, mealType: t }))}
                  className={cn(
                    'min-h-12 rounded-xl border text-sm tracking-wider transition-colors',
                    form.mealType === t ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-muted hover:border-brass'
                  )}
                >
                  {MEAL_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <Field label="食べたもの" htmlFor="meal-content">
            <textarea
              id="meal-content"
              rows={2}
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              className={inputClass}
              placeholder="ごはん、味噌汁、焼き魚"
            />
          </Field>
          <Field label="メモ（任意）" htmlFor="meal-note">
            <textarea
              id="meal-note"
              rows={2}
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className={inputClass}
              placeholder="食べたときの気分、量の感覚など"
            />
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
        <MealList
          logs={logs}
          onDelete={async (id) => {
            await api.deleteMeal(id);
            reload();
          }}
        />
      </section>
    </div>
  );
}
