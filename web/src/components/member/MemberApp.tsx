'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Home, PenLine, PlayCircle, Settings, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/member/api';
import type { Me } from '@/lib/member/types';
import { site } from '@/config/site';
import { cn } from '@/lib/utils';
import { Loading, Notice } from './ui';
import { LoginPanel } from './LoginPanel';

type MemberContextValue = {
  me: Me;
  /** 自分の情報（同意など）を取り直す */
  refresh: () => Promise<void>;
};
const MemberContext = createContext<MemberContextValue | null>(null);

export function useMember(): MemberContextValue {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember は MemberApp の中で使ってください');
  return ctx;
}

type State =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | { status: 'signedIn'; me: Me }
  | { status: 'error'; message: string };

async function loadState(): Promise<State> {
  try {
    const me = await api.getMe();
    return me ? { status: 'signedIn', me } : { status: 'signedOut' };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : '読み込めませんでした。' };
  }
}

/**
 * 会員ページの入口。ログインしているかどうかで、表示を切り替える。
 * ここより中のページは、ログイン済みであることを前提に書ける。
 */
export function MemberApp({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' });

  /** 自分の情報を取り直す（同意・表示名の変更のあとに、画面から呼ぶ） */
  const refresh = useCallback(async () => {
    setState(await loadState());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      void loadState().then((next) => {
        if (!cancelled) setState(next);
      });
    };
    run();
    // ログイン・ログアウトが起きたら、取り直す
    const unsubscribe = api.onAuthChange(run);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    return (
      <div className="mx-auto max-w-md px-5 py-16">
        <Notice tone="error">{state.message}</Notice>
      </div>
    );
  }
  if (state.status === 'signedOut') return <LoginPanel />;

  return (
    <MemberContext.Provider value={{ me: state.me, refresh }}>
      <Shell me={state.me}>{children}</Shell>
    </MemberContext.Provider>
  );
}

/* -------------------------------------------------------------------------- */

const TABS = [
  { href: '/member', label: 'ホーム', icon: Home, match: (p: string) => p === '/member' },
  {
    href: '/member/body',
    label: '記録',
    icon: PenLine,
    match: (p: string) => ['/member/body', '/member/meals', '/member/workouts'].some((x) => p.startsWith(x)),
  },
  { href: '/member/videos', label: '動画', icon: PlayCircle, match: (p: string) => p.startsWith('/member/videos') },
  { href: '/member/booking', label: '予約', icon: CalendarCheck, match: (p: string) => p.startsWith('/member/booking') },
  { href: '/member/settings', label: '設定', icon: Settings, match: (p: string) => p.startsWith('/member/settings') },
] as const;

function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  // 末尾のスラッシュがあってもなくても同じに扱う
  const path = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

  return (
    <div className="min-h-dvh">
      {api.mode === 'demo' ? (
        <p className="bg-brass-soft px-4 py-1.5 text-center text-[11px] leading-5 text-ink">
          デモモード：入力内容は、この端末の中にだけ保存されます
        </p>
      ) : null}

      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 w-full max-w-xl items-center justify-between px-5">
          <Link href="/member" className="flex items-baseline gap-2">
            <span className="font-serif text-base tracking-[0.22em]">{site.name}</span>
            <span className="text-[10px] tracking-[0.2em] text-muted">MEMBER</span>
          </Link>
          {me.isAdmin ? (
            <Link
              href="/member/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[11px] tracking-wider text-muted transition-colors hover:border-brass hover:text-brass"
            >
              <ShieldCheck size={13} aria-hidden />
              施術者メニュー
            </Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-5 pt-7 pb-32">{children}</main>

      <nav
        aria-label="会員メニュー"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid w-full max-w-xl grid-cols-5">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match(path);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-16 flex-col items-center justify-center gap-1 text-[10px] tracking-wider transition-colors',
                    active ? 'text-brass' : 'text-muted hover:text-ink'
                  )}
                >
                  <Icon size={21} strokeWidth={active ? 1.9 : 1.5} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
