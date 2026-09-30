'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 会員ページの共通部品。
 * 入力欄の文字は 16px 以上にしてある（iOS は 16px 未満だと、入力時に画面が勝手に拡大されるため）。
 */

export const inputClass =
  'w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-brass focus:ring-2 focus:ring-brass/20 disabled:opacity-50';

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={cn('rounded-2xl border border-line bg-surface p-5', className)}>{children}</section>;
}

export function PageTitle({ eyebrow, title, lead }: { eyebrow?: string; title: string; lead?: string }) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="mb-2 text-[11px] tracking-[0.3em] text-brass uppercase">{eyebrow}</p> : null}
      <h1 className="text-[1.5rem] leading-snug">{title}</h1>
      {lead ? <p className="mt-3 text-sm leading-7 text-muted">{lead}</p> : null}
    </header>
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs tracking-wider text-muted">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[11px] leading-5 text-muted">{hint}</p> : null}
    </div>
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'quiet' | 'danger';
};
export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  const styles = {
    primary: 'bg-ink text-canvas hover:bg-brass disabled:hover:bg-ink',
    outline: 'border border-line bg-surface text-ink hover:border-brass hover:text-brass',
    quiet: 'text-muted hover:text-ink',
    danger: 'border border-line bg-surface text-red-800 hover:border-red-800',
  }[variant];
  return (
    <button
      type={type}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 text-sm tracking-wider transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className
      )}
      {...props}
    />
  );
}

export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'warn' | 'error' | 'success';
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-line bg-sand/60 text-muted',
    warn: 'border-brass/40 bg-brass-soft/60 text-ink',
    error: 'border-red-800/30 bg-red-50 text-red-900',
    success: 'border-brass/40 bg-brass-soft/60 text-ink',
  }[tone];
  return (
    <p
      role={tone === 'error' ? 'alert' : undefined}
      className={cn('rounded-xl border px-4 py-3 text-xs leading-6', styles, className)}
    >
      {children}
    </p>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
      <p className="text-sm text-ink">{title}</p>
      {body ? <p className="mt-2 text-xs leading-6 text-muted">{body}</p> : null}
    </div>
  );
}

export function Loading({ label = '読み込み中…' }: { label?: string }) {
  return (
    <p className="py-16 text-center text-xs tracking-[0.2em] text-muted" role="status">
      {label}
    </p>
  );
}

/** 2回押しで実行する（うっかり削除の防止）。1回目は「本当に？」に変わり、数秒で元に戻る */
export function ConfirmButton({
  label,
  confirmLabel = '本当に削除する',
  onConfirm,
  className,
  variant = 'quiet',
}: {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
  variant?: ButtonProps['variant'];
}) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  return (
    <Button
      variant={armed ? 'danger' : variant}
      className={cn('min-h-9 px-4 text-xs', className)}
      onClick={() => {
        if (!armed) {
          setArmed(true);
          timer.current = setTimeout(() => setArmed(false), 4000);
          return;
        }
        if (timer.current) clearTimeout(timer.current);
        setArmed(false);
        void onConfirm();
      }}
    >
      {armed ? confirmLabel : label}
    </Button>
  );
}

/* -------------------------------------------------------------------------- */

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
};

/**
 * 非同期の読み込み。読み込み中／失敗／成功を返し、reload() で再取得する。
 * `load` は、変化しない関数を渡すこと（api のメソッド、または useCallback で包んだもの）。
 */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ tick: number; data: T | null; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setResult({ tick, data, error: null });
      },
      (e: unknown) => {
        if (!cancelled) setResult({ tick, data: null, error: e instanceof Error ? e.message : '読み込めませんでした。' });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [load, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  // 直前の結果は、再取得のあいだも表示し続ける（画面がちらつかない）
  return {
    data: result?.data ?? null,
    error: result?.error ?? null,
    loading: result === null,
    reload,
  };
}

/** 保存中・エラー・完了メッセージの管理 */
export function useSubmit() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const run = useCallback(async (task: () => Promise<void>, doneMessage = '保存しました') => {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await task();
      setDone(doneMessage);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(null), 3000);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存できませんでした。');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, done, run, setError };
}
