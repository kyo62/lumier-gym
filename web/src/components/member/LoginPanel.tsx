'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/member/api';
import { DEMO_CODE } from '@/lib/member/demoApi';
import { isPlausibleEmail, normalizeCode } from '@/lib/member/inputs';
import { site } from '@/config/site';
import { Button, Field, Notice, inputClass, useSubmit } from './ui';

const RESEND_SECONDS = 60;

/**
 * ログイン画面。メールに届く数字のコードを入力する方式。
 *
 * メールのリンクをタップする方式にしていないのは、iPhone で「ホーム画面に追加」した
 * アプリの中では、メールのリンクがアプリではなく Safari で開いてしまい、
 * ログインがアプリ側に引き継がれないため。コードなら、アプリの中で完結する。
 */
export function LoginPanel() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  const send = useSubmit();
  const verify = useSubmit();
  const codeRef = useRef<HTMLInputElement>(null);

  // 再送までの待ち時間を数える
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const requestCode = async () => {
    if (!isPlausibleEmail(email)) {
      send.setError('メールアドレスを確認してください。');
      return;
    }
    const ok = await send.run(() => api.requestCode(email), '');
    if (ok) {
      setStep('code');
      setWait(RESEND_SECONDS);
    }
  };

  const submitCode = async () => {
    const normalized = normalizeCode(code);
    if (!normalized) {
      verify.setError('メールに届いた数字のコードを入力してください。');
      return;
    }
    // 成功すると、認証状態の変化を MemberApp が受け取って画面が切り替わる
    await verify.run(() => api.verifyCode(email, normalized), '');
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-14">
      <div className="mb-10 text-center">
        <p className="font-serif text-2xl tracking-[0.24em]">{site.name}</p>
        <p className="mt-2 text-[10px] tracking-[0.3em] text-brass uppercase">Member</p>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-6">
        {step === 'email' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void requestCode();
            }}
            // ブラウザ標準の検証は英語や不統一の表示になるため、こちらの日本語の案内に統一する
            noValidate
            className="space-y-5"
          >
            <div>
              <h1 className="text-lg">会員ページにログイン</h1>
              <p className="mt-3 text-xs leading-6 text-muted">
                ご登録のメールアドレスに、ログイン用の数字のコードをお送りします。パスワードは不要です。
              </p>
            </div>
            <Field label="メールアドレス" htmlFor="email">
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </Field>
            {send.error ? <Notice tone="error">{send.error}</Notice> : null}
            <Button type="submit" disabled={send.busy} className="w-full">
              {send.busy ? '送信しています…' : 'コードを送る'}
            </Button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitCode();
            }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-lg">コードを入力</h1>
              <p className="mt-3 text-xs leading-6 text-muted">
                {email} 宛に、数字のコードをお送りしました。メールが届かないときは、迷惑メールフォルダもご確認ください。
              </p>
            </div>
            <Field label="ログイン用コード" htmlFor="code">
              <input
                ref={codeRef}
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className={`${inputClass} text-center font-mono text-xl tracking-[0.35em]`}
                placeholder="123456"
                maxLength={12}
              />
            </Field>
            {verify.error ? <Notice tone="error">{verify.error}</Notice> : null}
            <Button type="submit" disabled={verify.busy} className="w-full">
              {verify.busy ? '確認しています…' : 'ログイン'}
            </Button>
            <div className="flex items-center justify-between text-xs text-muted">
              <button
                type="button"
                className="underline underline-offset-4 hover:text-ink"
                onClick={() => {
                  setStep('email');
                  setCode('');
                  verify.setError(null);
                }}
              >
                メールアドレスを直す
              </button>
              <button
                type="button"
                disabled={wait > 0 || send.busy}
                className="underline underline-offset-4 hover:text-ink disabled:no-underline disabled:opacity-50"
                onClick={async () => {
                  if (await send.run(() => api.requestCode(email), '')) setWait(RESEND_SECONDS);
                }}
              >
                {wait > 0 ? `コードを再送（${wait}秒後）` : 'コードを再送する'}
              </button>
            </div>
            {send.error ? <Notice tone="error">{send.error}</Notice> : null}
          </form>
        )}
      </div>

      {api.mode === 'demo' ? (
        <Notice tone="warn" className="mt-5">
          <b>デモモードです。</b>
          どのメールアドレスでも、コードは <b className="font-mono">{DEMO_CODE}</b> で入れます。
          <br />
          <span className="font-mono">admin</span> で始まるメールアドレスだと、施術者メニューも確認できます。
        </Notice>
      ) : (
        <p className="mt-6 text-center text-[11px] leading-6 text-muted">
          会員ページは、ご入会中の方のためのページです。
          <br />
          ログインできないときは、サロンまでお問い合わせください。
        </p>
      )}

      <p className="mt-8 text-center text-xs text-muted">
        <Link href="/" className="underline underline-offset-4 hover:text-ink">
          {site.name} のホームページへ
        </Link>
      </p>
    </div>
  );
}
