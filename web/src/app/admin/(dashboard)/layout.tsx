import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminUser } from '@/lib/supabase/server';
import { signOut } from '../actions';
import { site } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: '管理画面',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-5">
          <Link href="/admin" className="font-serif text-sm tracking-[0.16em]">
            {site.name}
          </Link>
          <nav className="flex gap-4 text-xs">
            <Link href="/admin" className="text-muted transition-colors hover:text-ink">
              予約一覧
            </Link>
            <Link href="/admin/schedule" className="text-muted transition-colors hover:text-ink">
              営業日設定
            </Link>
            <Link href="/" className="text-muted transition-colors hover:text-ink">
              サイトを見る
            </Link>
          </nav>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="text-xs text-muted transition-colors hover:text-ink">
              ログアウト
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
