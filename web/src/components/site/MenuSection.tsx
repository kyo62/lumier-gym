import Link from 'next/link';
import { Check } from 'lucide-react';
import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { menus, booking } from '@/config/site';
import { yen } from '@/lib/utils';

export function MenuSection() {
  return (
    <section id="menu" className="scroll-mt-24 border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Menu"
            title="メニュー・料金"
            lead="すべて税込・完全予約制です。初めての方は「初回カウンセリング＋姿勢改善」からお選びください。"
          />
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {menus.map((menu, i) => (
            <Reveal
              key={menu.id}
              delay={i * 80}
              className={`flex h-full flex-col rounded-lg border bg-surface p-8 ${
                menu.recommended ? 'border-accent' : 'border-line'
              }`}
            >
              {menu.recommended ? (
                <span className="mb-4 self-start rounded-full bg-accent-soft px-3 py-1 text-[11px] tracking-widest text-accent">
                  はじめての方へ
                </span>
              ) : null}

              <h3 className="text-lg leading-relaxed">{menu.name}</h3>
              <p className="mt-3 text-xs leading-6 text-muted">{menu.description}</p>

              <p className="mt-6 font-serif text-3xl tnum">
                {yen(menu.price)}
                <span className="ml-2 text-xs text-muted tnum">/ {menu.durationMin}分</span>
              </p>

              <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6 text-sm text-muted">
                {menu.features.map((feature) => (
                  <li key={feature} className="flex gap-2.5">
                    <Check size={15} className="mt-1 shrink-0 text-accent" aria-hidden />
                    <span className="leading-6">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/reserve?menu=${menu.id}`}
                className="mt-8 inline-flex items-center justify-center rounded-full border border-ink px-6 py-3 text-sm transition-colors hover:bg-ink hover:text-canvas"
              >
                このメニューで予約
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal className="mx-auto mt-12 max-w-2xl rounded-lg border border-line bg-surface p-6 text-xs leading-7 text-muted">
          <p className="mb-3 text-[11px] tracking-[0.2em] text-accent uppercase">Cancellation</p>
          <ul className="space-y-1">
            {booking.cancelPolicy.map((line) => (
              <li key={line}>・{line}</li>
            ))}
          </ul>
          <p className="mt-4">
            ご予約は{booking.leadTimeHours}時間前まで、{booking.maxAdvanceDays}日先までお受けしています。
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
