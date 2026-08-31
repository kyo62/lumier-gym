'use client';

import { useActionState } from 'react';
import { Loader2 } from 'lucide-react';
import { sendMagicLink } from '../actions';

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, {});

  return (
    <form action={action} className="mt-8">
      <label className="block text-xs text-muted" htmlFor="admin-email">
        メールアドレス
      </label>
      <input
        id="admin-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="mt-2 w-full rounded-md border border-line bg-surface px-4 py-3 text-base outline-none focus:border-accent"
      />

      {state.error ? (
        <p role="alert" className="mt-4 text-xs leading-6 text-danger">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="mt-4 rounded-md border border-line bg-surface px-4 py-3 text-xs leading-6">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-sm text-canvas transition-colors hover:bg-accent disabled:opacity-60"
      >
        {pending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
        ログインリンクを送る
      </button>
    </form>
  );
}
