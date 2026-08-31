import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Container } from './primitives';
import { site } from '@/config/site';

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink py-16 text-canvas">
      <Container>
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-serif text-xl tracking-[0.18em]">{site.name}</p>
            <p className="mt-3 text-xs leading-6 text-canvas/60">
              {site.tagline}
              <br />
              {site.address.prefecture}
              {site.address.city}
            </p>
          </div>

          <nav className="flex flex-col gap-3 text-xs text-canvas/70">
            <Link href="/reserve" className="transition-colors hover:text-canvas">
              ご予約
            </Link>
            <Link href="/#menu" className="transition-colors hover:text-canvas">
              メニュー・料金
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
            className="mt-10 inline-flex items-center gap-2 text-xs text-canvas/70 transition-colors hover:text-canvas"
          >
            Instagram
            <ArrowUpRight size={13} aria-hidden />
          </a>
        ) : null}

        <p className="mt-12 border-t border-canvas/15 pt-6 text-[11px] text-canvas/40">
          © {new Date().getFullYear()} {site.name}
        </p>
      </Container>
    </footer>
  );
}
