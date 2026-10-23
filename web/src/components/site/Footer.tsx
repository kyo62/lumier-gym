import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { Container } from './primitives';
import { site, booking } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink py-16 text-canvas">
      <Container>
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Image src="/brand/d2-symbol-dark.svg" alt="" width={44} height={44} className="mb-4 h-11 w-11" />
            <p className="font-serif text-xl tracking-[0.22em]">{site.name}</p>
            <p className="mt-1.5 text-[10px] tracking-[0.25em] text-canvas/50">{site.nameKana}</p>
            <p className="mt-5 text-xs leading-7 text-canvas/60">
              {site.tagline}
              <br />
              {site.address.prefecture}
              {site.address.city}・名城公園
            </p>
          </div>

          <nav className="flex flex-col gap-3 text-xs text-canvas/70">
            {booking.squareUrl ? (
              <a
                href={booking.squareUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-canvas"
              >
                ご予約
                <ArrowUpRight size={12} aria-hidden />
              </a>
            ) : null}
            <Link href="/#price" className="transition-colors hover:text-canvas">
              メニュー・料金
            </Link>
            <Link href="/#access" className="transition-colors hover:text-canvas">
              アクセス
            </Link>
            <Link href="/member" className="transition-colors hover:text-canvas">
              会員ページ
            </Link>
            <Link href="/terms" className="transition-colors hover:text-canvas">
              利用規約
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-canvas">
              プライバシーポリシー
            </Link>
          </nav>
        </div>

        {site.sns.instagram || site.sns.line || site.sns.youtube ? (
<div className="mt-10 flex items-center gap-3">
{site.sns.instagram ? (
<a
href={site.sns.instagram}
target="_blank"
rel="noreferrer noopener"
aria-label="Instagram"
className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 transition-colors hover:border-canvas hover:text-canvas"
>
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
<rect x="3" y="3" width="18" height="18" rx="5" />
<circle cx="12" cy="12" r="4" />
<circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
</svg>
</a>
) : null}
{site.sns.line ? (
<a
href={site.sns.line}
target="_blank"
rel="noreferrer noopener"
aria-label="公式LINE"
className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 transition-colors hover:border-canvas hover:text-canvas"
>
<svg width="22" height="19" viewBox="0 0 46 40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
<path d="M23 3C12.5 3 4 9.7 4 18c0 5 3 9.3 7.8 12.1L10 37l7.6-4.2c1.7.4 3.5.6 5.4.6 10.5 0 19-6.7 19-15S33.5 3 23 3z" />
<text x="23" y="21.5" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor" stroke="none">LINE</text>
</svg>
</a>
) : null}
{site.sns.youtube ? (
<a
href={site.sns.youtube}
target="_blank"
rel="noreferrer noopener"
aria-label="YouTube"
className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-canvas/25 text-canvas/80 transition-colors hover:border-canvas hover:text-canvas"
>
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
<rect x="2.5" y="5.5" width="19" height="13" rx="4" />
<path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" />
</svg>
</a>
) : null}
</div>
) : null}

        <p className="mt-12 border-t border-canvas/15 pt-6 text-[11px] text-canvas/40">
          © {new Date().getFullYear()} {site.name}
        </p>
      </Container>
    </footer>
  );
}
