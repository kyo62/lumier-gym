import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LoginForm } from './LoginForm';
import { site } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '管理者ログイン',
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getAdminUser();
  if (user) redirect('/admin');

  const { error } = await searchParams;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-center font-serif text-xl tracking-[0.18em]">{site.name}</p>
        <h1 className="mt-2 text-center text-sm text-muted">管理画面</h1>

        {error === 'link' ? (
          <p className="mt-8 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-xs leading-6 text-danger">
            ログインリンクが無効か、有効期限が切れています。もう一度お試しください。
          </p>
        ) : null}
        {error === 'config' || !isSupabaseConfigured() ? (
          <p className="mt-8 rounded-md border border-line bg-surface px-4 py-3 text-xs leading-6 text-muted">
            Supabaseの環境変数が未設定です。README の手順に従って設定してください。
          </p>
        ) : null}

        <LoginForm />

        <p className="mt-8 text-center text-[11px] leading-6 text-muted">
          登録済みの管理者アドレスにログイン用のリンクを送ります。
          <br />
          パスワードはありません。
        </p>
      </div>
    </div>
  );
}
