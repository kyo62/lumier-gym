import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from './primitives';
import { site, booking } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink py-16 text-canvas">
      <Container>
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
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
            <Link href="/terms" className="transition-colors hover:text-canvas">
              利用規約
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-canvas">
              プライバシーポリシー
            </Link>
          </nav>
        </div>

        {site.sns.instagram ? (
          <a
            href={site.sns.instagram}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-10 inline-flex items-center gap-1.5 text-xs text-canvas/70 transition-colors hover:text-canvas"
          >
            Instagram
            <ArrowUpRight size={12} aria-hidden />
          </a>
        ) : null}

        <p className="mt-12 border-t border-canvas/15 pt-6 text-[11px] text-canvas/40">
          © {new Date().getFullYear()} {site.name}
        </p>
      </Container>
    </footer>
  );
}
