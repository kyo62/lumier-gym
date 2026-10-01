'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { parseDisplayName } from '@/lib/member/inputs';
import { site } from '@/config/site';
import { useMember } from '@/components/member/MemberApp';
import { InstallGuide } from '@/components/member/InstallGuide';
import { Button, Card, ConfirmButton, Field, Notice, PageTitle, inputClass, useSubmit } from '@/components/member/ui';

export default function SettingsPage() {
  const { me, refresh } = useMember();

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Settings" title="設定" />

      <NameCard />

      <InstallGuide alwaysShow />

      <Card className="space-y-5">
        <div>
          <h2 className="text-base">お預かりしている記録</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            体組成・食事・トレーニングの記録は、ご自身で書き出したり、すべて削除したりできます。
          </p>
        </div>
        <ExportButton />
        <DeleteLogs />
        {me.consentedAt ? (
          <WithdrawConsent onDone={refresh} />
        ) : (
          <Notice tone="success">
            いまは、記録の取り扱いへの同意をいただいていない状態です（記録は残っていません）。記録を再開するときは、「記録」のページで同意してください。
          </Notice>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base">退会・アカウントの削除</h2>
        <p className="text-xs leading-6 text-muted">
          退会をご希望のときは、{site.name}までご連絡ください。アカウントと、お預かりしている記録をすべて削除します。
        </p>
        <p className="text-xs">
          <a href={`mailto:${site.email}`} className="text-brass underline underline-offset-4">
            {site.email}
          </a>
        </p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-base">アカウント</h2>
        <p className="text-xs leading-6 text-muted">ログイン中：{me.email}</p>
        <Button variant="outline" className="w-full" onClick={() => void api.signOut()}>
          ログアウト
        </Button>
      </Card>

      <p className="flex justify-center gap-6 text-xs text-muted">
        <Link href="/terms" className="underline underline-offset-4 hover:text-ink">
          利用規約
        </Link>
        <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
          プライバシーポリシー
        </Link>
      </p>
    </div>
  );
}

function NameCard() {
  const { me, refresh } = useMember();
  const [name, setName] = useState(me.displayName);
  const submit = useSubmit();

  return (
    <Card>
      <h2 className="mb-4 text-base">お名前</h2>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const parsed = parseDisplayName(name);
          if (!parsed.ok) {
            submit.setError(parsed.error);
            return;
          }
          if (await submit.run(() => api.updateDisplayName(parsed.value))) await refresh();
        }}
      >
        <Field label="表示名" htmlFor="display-name" hint="ホームの挨拶に使います。ニックネームでも構いません。">
          <input id="display-name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} autoComplete="nickname" placeholder="例：みどり" />
        </Field>
        {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
        {submit.done ? <Notice tone="success">{submit.done}</Notice> : null}
        <Button type="submit" variant="outline" disabled={submit.busy} className="w-full">
          {submit.busy ? '保存しています…' : '保存する'}
        </Button>
      </form>
    </Card>
  );
}

/** 記録を JSON ファイルとして書き出す（本人が自分のデータを持ち出せるように） */
function ExportButton() {
  const submit = useSubmit();
  const { me } = useMember();

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        className="w-full"
        disabled={submit.busy}
        onClick={() =>
          void submit.run(async () => {
            const [body, meals, workouts] = await Promise.all([api.listBody(), api.listMeals(), api.listWorkouts()]);
            const payload = { exportedAt: new Date().toISOString(), account: { email: me.email, displayName: me.displayName }, body, meals, workouts };
            const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
            const a = document.createElement('a');
            a.href = url;
            a.download = `toneka-records-${todayLocal()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            // ダウンロードが始まる前に解放しないよう、少し待つ
            setTimeout(() => URL.revokeObjectURL(url), 10_000);
          }, '書き出しました')
        }
      >
        {submit.busy ? '準備しています…' : '記録を書き出す（JSON）'}
      </Button>
      {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
      {submit.done ? <Notice tone="success">{submit.done}</Notice> : null}
    </div>
  );
}

function DeleteLogs() {
  const submit = useSubmit();
  return (
    <div className="space-y-3">
      <ConfirmButton
        variant="danger"
        label="記録をすべて削除する"
        confirmLabel="本当にすべて削除する（元に戻せません）"
        className="min-h-12 w-full px-7 text-sm"
        onConfirm={() => void submit.run(() => api.deleteAllMyLogs(), 'すべての記録を削除しました')}
      />
      {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
      {submit.done ? <Notice tone="success">{submit.done}</Notice> : null}
    </div>
  );
}

/** 同意を取り消す。記録も、あわせてすべて削除する */
function WithdrawConsent({ onDone }: { onDone: () => Promise<void> }) {
  const submit = useSubmit();
  return (
    <div className="space-y-3 border-t border-line pt-5">
      <p className="text-xs leading-6 text-muted">
        記録の取り扱いへの同意を取り消すこともできます。取り消すと、記録はすべて削除され、再び同意するまで記録は書き込めなくなります。
      </p>
      <ConfirmButton
        variant="outline"
        label="同意を取り消す"
        confirmLabel="記録を削除して、同意を取り消す"
        className="min-h-12 w-full px-7 text-sm"
        onConfirm={() =>
          void submit
            .run(async () => {
              await api.deleteAllMyLogs();
              await api.withdrawConsent();
            }, '同意を取り消しました')
            .then((ok) => (ok ? onDone() : undefined))
        }
      />
      {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
    </div>
  );
}
