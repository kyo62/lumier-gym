'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { MonthCalendar } from './MonthCalendar';
import { Turnstile } from './Turnstile';
import { menus, booking as policy, type Menu } from '@/config/site';
import { monthEndKey, monthStartKey, shiftMonth, toMonthKey } from '@/lib/calendar';
import { addDaysToKey, formatLongDate, todayKey, toTimeLabel } from '@/lib/time';
import { cn, yen } from '@/lib/utils';

type Step = 'menu' | 'datetime' | 'details' | 'done';

type FormState = {
  name: string;
  kana: string;
  phone: string;
  email: string;
  concern: string;
  note: string;
  agreed: boolean;
};

const emptyForm: FormState = { name: '', kana: '', phone: '', email: '', concern: '', note: '', agreed: false };

const STEP_LABELS: { key: Step; label: string }[] = [
  { key: 'menu', label: 'メニュー' },
  { key: 'datetime', label: '日時' },
  { key: 'details', label: 'お客様情報' },
];

export function BookingFlow({ initialMenuId, turnstileSiteKey }: { initialMenuId?: string; turnstileSiteKey: string }) {
  const today = useMemo(() => todayKey(), []);
  const minMonth = toMonthKey(today);
  const maxMonth = toMonthKey(addDaysToKey(today, policy.maxAdvanceDays));

  const [step, setStep] = useState<Step>(initialMenuId ? 'datetime' : 'menu');
  const [menuId, setMenuId] = useState<string | null>(initialMenuId ?? null);
  const [monthKey, setMonthKey] = useState(minMonth);

  /**
   * 空き枠は「どの条件で取得した結果か」をキーごと保持する。
   * こうすると、メニューや月を切り替えた瞬間に前の結果が表示されることがなく、
   * 読み込み中かどうかも state を書き足さずに導出できる。
   */
  const [result, setResult] = useState<{
    key: string;
    slots: Record<string, string[]>;
    demo: boolean;
    error?: string;
  } | null>(null);

  const requestKey = menuId ? `${menuId}|${monthKey}` : null;
  const current = result?.key === requestKey ? result : null;
  const slotsByDate = current?.slots ?? {};
  const loadError = current?.error ?? null;
  const demo = current?.demo ?? false;
  const loading = requestKey !== null && current === null;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [cancelToken, setCancelToken] = useState<string | null>(null);

  const menu = useMemo(() => menus.find((m) => m.id === menuId) ?? null, [menuId]);

  /** 表示中の月の空き枠を取得する */
  const loadAvailability = useCallback(
    async (targetMenuId: string, targetMonth: string, signal?: AbortSignal) => {
      const from = targetMonth === minMonth ? today : monthStartKey(targetMonth);
      const to = monthEndKey(targetMonth);
      const params = new URLSearchParams({ menuId: targetMenuId, from, to });

      const res = await fetch(`/api/availability?${params}`, { signal, cache: 'no-store' });
      if (!res.ok) throw new Error('空き状況を取得できませんでした');
      const json = (await res.json()) as { days: { date: string; slots: string[] }[]; demo: boolean };

      const next: Record<string, string[]> = {};
      for (const day of json.days) if (day.slots.length) next[day.date] = day.slots;
      return { next, demo: json.demo };
    },
    [minMonth, today]
  );

  useEffect(() => {
    if (!menuId || !requestKey) return;
    const controller = new AbortController();

    loadAvailability(menuId, monthKey, controller.signal)
      .then(({ next, demo: isDemo }) => setResult({ key: requestKey, slots: next, demo: isDemo }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setResult({
          key: requestKey,
          slots: {},
          demo: false,
          error: '空き状況を取得できませんでした。時間をおいて再度お試しください。',
        });
      });

    return () => controller.abort();
  }, [menuId, monthKey, requestKey, loadAvailability]);

  const selectMenu = (id: string) => {
    setMenuId(id);
    setSelectedDate(null);
    setSelectedSlot(null);
    setStep('datetime');
  };

  const daySlots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  const submit = async () => {
    if (!menu || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuId: menu.id,
          startsAt: selectedSlot,
          name: form.name,
          kana: form.kana,
          phone: form.phone,
          email: form.email,
          concern: form.concern,
          note: form.note,
          agreed: form.agreed,
          turnstileToken,
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; cancelToken?: string };

      if (!res.ok || !json.ok) {
        setSubmitError(json.error ?? '予約の登録に失敗しました');
        // 枠が埋まっていた場合は、最新の空き状況に更新して選び直してもらう
        if (res.status === 409 && menuId && requestKey) {
          const { next, demo: isDemo } = await loadAvailability(menuId, monthKey);
          setResult({ key: requestKey, slots: next, demo: isDemo });
          setSelectedSlot(null);
          setStep('datetime');
        }
        return;
      }

      setCancelToken(json.cancelToken ?? null);
      setStep('done');
    } catch {
      setSubmitError('通信に失敗しました。電波状況をご確認のうえ、再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  /* ----------------------------------------------------------------------- */

  if (step === 'done' && menu && selectedSlot) {
    return <Completed menu={menu} slot={selectedSlot} email={form.email} cancelToken={cancelToken} />;
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Stepper current={step} />

      {demo ? (
        <p className="mb-6 rounded-md border border-accent/40 bg-accent-soft/60 px-4 py-3 text-xs leading-6 text-ink">
          <strong className="font-medium">デモ表示中：</strong>
          Supabaseが未設定のため、設定ファイルの営業時間からサンプルの空き枠を表示しています。
          この状態では予約を確定できません。
        </p>
      ) : null}

      {/* ---------------- Step 1: メニュー ---------------- */}
      {step === 'menu' ? (
        <section aria-labelledby="step-menu">
          <h2 id="step-menu" className="text-xl">
            メニューをお選びください
          </h2>
          <ul className="mt-8 space-y-4">
            {menus.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => selectMenu(m.id)}
                  className="w-full rounded-lg border border-line bg-surface p-6 text-left transition-colors hover:border-accent"
                >
                  <span className="block text-base">{m.name}</span>
                  <span className="mt-2 block font-serif text-lg tnum">
                    {yen(m.price)}
                    <span className="ml-1.5 text-xs text-muted">/ {m.durationMin}分</span>
                  </span>
                  <p className="mt-2 text-xs leading-6 text-muted">{m.description}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ---------------- Step 2: 日時 ---------------- */}
      {step === 'datetime' && menu ? (
        <section aria-labelledby="step-datetime">
          <BackButton
            onClick={() => {
              setStep('menu');
              setSelectedSlot(null);
            }}
          >
            メニューを選び直す
          </BackButton>

          <h2 id="step-datetime" className="mt-6 text-xl">
            日時をお選びください
          </h2>
          <p className="mt-2 text-xs text-muted">
            {menu.name}（{menu.durationMin}分 / {yen(menu.price)}）
          </p>

          <div className="mt-8 rounded-lg border border-line bg-surface p-5 sm:p-7">
            <MonthCalendar
              monthKey={monthKey}
              onMonthChange={(next) => {
                setMonthKey(next);
                setSelectedDate(null);
                setSelectedSlot(null);
              }}
              slotsByDate={slotsByDate}
              selectedDate={selectedDate}
              onSelectDate={(dateKey) => {
                setSelectedDate(dateKey);
                setSelectedSlot(null);
              }}
              minMonthKey={minMonth}
              maxMonthKey={maxMonth}
              loading={loading}
            />
          </div>

          {loadError ? <p className="mt-4 text-sm text-danger">{loadError}</p> : null}

          {!loading && !loadError && Object.keys(slotsByDate).length === 0 ? (
            <p className="mt-6 rounded-md border border-line bg-surface px-4 py-5 text-center text-sm leading-7 text-muted">
              {monthKey === minMonth ? '今月' : 'この月'}に空き枠がありません。
              <br />
              {monthKey < maxMonth ? (
                <button
                  type="button"
                  onClick={() => setMonthKey(shiftMonth(monthKey, 1))}
                  className="mt-2 text-accent underline underline-offset-4"
                >
                  翌月の空き状況を見る
                </button>
              ) : null}
            </p>
          ) : null}

          {selectedDate ? (
            <div className="mt-8">
              <h3 className="text-sm">
                {formatLongDate(selectedDate)}
                <span className="ml-2 text-xs text-muted tnum">空き {daySlots.length}枠</span>
              </h3>
              <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {daySlots.map((slot) => (
                  <li key={slot}>
                    <button
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      aria-pressed={selectedSlot === slot}
                      className={cn(
                        'w-full rounded-md border py-3 text-sm transition-colors tnum',
                        selectedSlot === slot
                          ? 'border-ink bg-ink text-canvas'
                          : 'border-line bg-surface hover:border-accent hover:text-accent'
                      )}
                    >
                      {toTimeLabel(new Date(slot))}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {selectedSlot ? (
            <button
              type="button"
              onClick={() => setStep('details')}
              className="mt-10 w-full rounded-full bg-ink py-4 text-sm tracking-wide text-canvas transition-colors hover:bg-accent"
            >
              この日時で進む
            </button>
          ) : null}
        </section>
      ) : null}

      {/* ---------------- Step 3: お客様情報 ---------------- */}
      {step === 'details' && menu && selectedSlot ? (
        <section aria-labelledby="step-details">
          <BackButton onClick={() => setStep('datetime')}>日時を選び直す</BackButton>

          <h2 id="step-details" className="mt-6 text-xl">
            お客様情報のご入力
          </h2>

          <dl className="mt-6 rounded-lg border border-line bg-sand p-5 text-sm">
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-muted">メニュー</dt>
              <dd className="text-right">{menu.name}</dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-muted">日時</dt>
              <dd className="text-right tnum">
                {formatLongDate(selectedSlot ? new Date(selectedSlot) : new Date())} {toTimeLabel(new Date(selectedSlot))}
              </dd>
            </div>
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-muted">料金</dt>
              <dd className="text-right tnum">
                {yen(menu.price)}（{menu.durationMin}分）
              </dd>
            </div>
          </dl>

          <form
            className="mt-8 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <Field label="お名前" required>
              <input
                type="text"
                required
                maxLength={60}
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="ふりがな">
              <input
                type="text"
                maxLength={60}
                value={form.kana}
                onChange={(e) => setForm({ ...form, kana: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="電話番号" required hint="当日のご連絡に使用します">
              <input
                type="tel"
                required
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field label="メールアドレス" required hint="ご予約確認メールをお送りします">
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
              />
            </Field>

            <Field
              label="現在の身体のお悩み"
              hint="気になる部位、痛みの出る動き、通院中の有無など。分かる範囲で構いません"
            >
              <textarea
                rows={5}
                maxLength={1000}
                value={form.concern}
                onChange={(e) => setForm({ ...form, concern: e.target.value })}
                className={cn(inputClass, 'resize-y leading-7')}
              />
            </Field>

            <Field label="ご要望・連絡事項">
              <textarea
                rows={3}
                maxLength={1000}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className={cn(inputClass, 'resize-y leading-7')}
              />
            </Field>

            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface p-4 text-sm">
              <input
                type="checkbox"
                required
                checked={form.agreed}
                onChange={(e) => setForm({ ...form, agreed: e.target.checked })}
                className="mt-0.5 size-4 accent-[var(--color-ink)]"
              />
              <span className="leading-7">
                <Link href="/terms" target="_blank" className="text-accent underline underline-offset-4">
                  利用規約
                </Link>
                と
                <Link href="/privacy" target="_blank" className="text-accent underline underline-offset-4">
                  プライバシーポリシー
                </Link>
                に同意します
              </span>
            </label>

            <div className="rounded-lg border border-line bg-sand p-4 text-xs leading-7 text-muted">
              <p className="mb-1 text-ink">キャンセルについて</p>
              {policy.cancelPolicy.map((line) => (
                <p key={line}>・{line}</p>
              ))}
            </div>

            <Turnstile siteKey={turnstileSiteKey} onToken={setTurnstileToken} />

            {submitError ? (
              <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm leading-6 text-danger">
                {submitError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-ink py-4 text-sm tracking-wide text-canvas transition-colors hover:bg-accent disabled:opacity-60"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" aria-hidden /> : null}
              {submitting ? '送信しています…' : 'この内容で予約を確定する'}
            </button>
          </form>
        </section>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const inputClass =
  'w-full rounded-md border border-line bg-surface px-4 py-3 text-base outline-none transition-colors focus:border-accent';

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-sm">
        {label}
        {required ? (
          <span className="rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] tracking-wider text-accent">必須</span>
        ) : null}
      </span>
      {hint ? <span className="mb-2 block text-xs leading-6 text-muted">{hint}</span> : null}
      {children}
    </label>
  );
}

function BackButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-ink">
      <ArrowLeft size={14} aria-hidden />
      {children}
    </button>
  );
}

function Stepper({ current }: { current: Step }) {
  const index = STEP_LABELS.findIndex((s) => s.key === current);
  return (
    <ol className="mb-10 flex items-center gap-2 text-[11px] tracking-wider">
      {STEP_LABELS.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center gap-2">
          <span
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full border tnum',
              i < index
                ? 'border-accent bg-accent text-canvas'
                : i === index
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-line text-muted'
            )}
          >
            {i < index ? <Check size={12} aria-hidden /> : i + 1}
          </span>
          <span className={cn('truncate', i === index ? 'text-ink' : 'text-muted')}>{s.label}</span>
          {i < STEP_LABELS.length - 1 ? <span aria-hidden className="h-px flex-1 bg-line" /> : null}
        </li>
      ))}
    </ol>
  );
}

function Completed({
  menu,
  slot,
  email,
  cancelToken,
}: {
  menu: Menu;
  slot: string;
  email: string;
  cancelToken: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-xl text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full border border-accent text-accent">
        <Check size={24} aria-hidden />
      </span>
      <h2 className="mt-8 text-2xl">ご予約を承りました</h2>
      <p className="mt-4 text-sm leading-8 text-muted">
        {email} 宛に確認メールをお送りしました。
        <br />
        届かない場合は迷惑メールフォルダをご確認ください。
      </p>

      <dl className="mt-10 rounded-lg border border-line bg-surface p-6 text-left text-sm">
        <div className="flex justify-between gap-4 border-b border-line py-3">
          <dt className="text-muted">日時</dt>
          <dd className="tnum">
            {formatLongDate(new Date(slot))} {toTimeLabel(new Date(slot))}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-line py-3">
          <dt className="text-muted">メニュー</dt>
          <dd className="text-right">{menu.name}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted">料金</dt>
          <dd className="tnum">{yen(menu.price)}</dd>
        </div>
      </dl>

      {cancelToken ? (
        <p className="mt-6 text-xs leading-7 text-muted">
          ご都合が変わった場合は
          <Link href={`/cancel/${cancelToken}`} className="mx-1 text-accent underline underline-offset-4">
            こちらのページ
          </Link>
          からキャンセルできます（確認メールにも同じリンクを記載しています）。
        </p>
      ) : null}

      <Link
        href="/"
        className="mt-10 inline-flex items-center justify-center rounded-full border border-line bg-surface px-8 py-3.5 text-sm transition-colors hover:border-accent hover:text-accent"
      >
        トップページに戻る
      </Link>
    </div>
  );
}
