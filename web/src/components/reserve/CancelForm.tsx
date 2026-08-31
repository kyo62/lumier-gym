'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

export function CancelForm({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'confirming' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  const cancel = async () => {
    setState('sending');
    setError(null);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? 'キャンセル処理に失敗しました');
        setState('confirming');
        return;
      }
      setState('done');
    } catch {
      setError('通信に失敗しました。時間をおいて再度お試しください。');
      setState('confirming');
    }
  };

  if (state === 'done') {
    return (
      <p className="mt-8 rounded-lg border border-line bg-surface p-6 text-sm leading-8">
        ご予約をキャンセルしました。
        <br />
        <span className="text-muted">確認メールをお送りしています。またのご利用をお待ちしております。</span>
      </p>
    );
  }

  return (
    <div className="mt-8">
      {error ? (
        <p role="alert" className="mb-4 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {state === 'idle' ? (
        <button
          type="button"
          onClick={() => setState('confirming')}
          className="w-full rounded-full border border-danger py-4 text-sm text-danger transition-colors hover:bg-danger hover:text-canvas"
        >
          このご予約をキャンセルする
        </button>
      ) : (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-6">
          <p className="text-sm leading-7">本当にキャンセルしますか？この操作は取り消せません。</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void cancel()}
              disabled={state === 'sending'}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-danger py-3.5 text-sm text-canvas disabled:opacity-60"
            >
              {state === 'sending' ? <Loader2 size={15} className="animate-spin" aria-hidden /> : null}
              キャンセルを確定する
            </button>
            <button
              type="button"
              onClick={() => setState('idle')}
              disabled={state === 'sending'}
              className="flex-1 rounded-full border border-line bg-surface py-3.5 text-sm"
            >
              戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
