'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { site, booking } from '@/config/site';
import { cn } from '@/lib/utils';

const links = [
  { href: '#concept', label: 'コンセプト' },
  { href: '#reasons', label: '選ばれる理由' },
  { href: '#flow', label: 'セッションの流れ' },
  { href: '#price', label: 'メニュー・料金' },
  { href: '#profile', label: 'プロフィール' },
  { href: '#access', label: 'アクセス' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // メニューを開いている間は背面をスクロールさせない
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const reserveHref = booking.squareUrl || '#price';

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled || open ? 'border-b border-line bg-canvas/95 backdrop-blur' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:h-18">
        <Link href="/" className="flex items-baseline gap-2" onClick={() => setOpen(false)}>
          <span className="font-serif text-lg tracking-[0.22em]">{site.name}</span>
          <span className="hidden text-[10px] tracking-[0.2em] text-muted sm:inline">{site.nameKana}</span>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-xs tracking-wider text-muted transition-colors hover:text-ink">
              {link.label}
            </Link>
          ))}
          <a
            href={reserveHref}
            {...(booking.squareUrl ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className="rounded-full bg-ink px-6 py-2.5 text-xs tracking-wider text-canvas transition-colors hover:bg-brass"
          >
            ご予約
          </a>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          <a
            href={reserveHref}
            {...(booking.squareUrl ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
            className="rounded-full bg-ink px-5 py-2 text-xs tracking-wider text-canvas"
          >
            ご予約
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="-mr-2 p-2 text-ink"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <nav id="mobile-nav" className="border-t border-line bg-canvas lg:hidden">
          <ul className="px-6 py-2">
            {links.map((link) => (
              <li key={link.href} className="border-b border-line/60 last:border-0">
                <Link href={link.href} className="block py-4 text-sm" onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
