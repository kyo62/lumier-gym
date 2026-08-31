import Link from 'next/link';
import { Container } from './primitives';
import { Reveal } from './Reveal';
import { booking } from '@/config/site';

export function ReserveCta() {
  return (
    <section className="border-t border-line bg-sand py-20 sm:py-24">
      <Container className="text-center">
        <Reveal>
          <p className="mb-4 text-xs tracking-[0.25em] text-accent uppercase">Reservation</p>
          <h2 className="text-2xl leading-relaxed sm:text-3xl">
            まずは、いまの姿勢を
            <br className="sm:hidden" />
            見にきてください。
          </h2>
          <p className="mx-auto mt-6 max-w-lg text-sm leading-8 text-muted">
            カレンダーから空いている枠を選ぶだけ。
            {booking.leadTimeHours}時間前までご予約いただけます。
          </p>
          <Link
            href="/reserve"
            className="mt-10 inline-flex items-center justify-center rounded-full bg-ink px-10 py-4 text-sm tracking-wide text-canvas transition-colors hover:bg-accent"
          >
            空き状況を見る
          </Link>
        </Reveal>
      </Container>
    </section>
  );
}
