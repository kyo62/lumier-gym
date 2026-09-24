import { Container, ReserveButton } from './primitives';
import { Reveal } from './Reveal';
import { booking, site, sections } from '@/config/site';

export function ReserveCta() {
  const { eyebrow, title, lead } = sections.reserveCta;

  return (
    <section id="reserve" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
      <Container className="text-center">
        <Reveal>
          <p className="mb-6 text-[11px] tracking-[0.3em] text-brass uppercase">{eyebrow}</p>
          <h2 className="text-2xl leading-[1.7] sm:text-[1.75rem]">
            {title.map((line, i) => (
              <span key={line}>
                {line}
                {i < title.length - 1 ? <br className="sm:hidden" /> : null}
              </span>
            ))}
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-sm leading-8 text-muted">
            {lead.map((line, i) => (
              <span key={line}>
                {line}
                {i < lead.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>

          <div className="mt-11">
            <ReserveButton />
          </div>

          {!booking.squareUrl ? (
            <p className="mt-6 text-xs leading-7 text-muted">
              {/* === TODO: Squareの予約ページを作成したら config/site.ts の booking.squareUrl に設定してください */}
              オンライン予約ページは準備中です。
              {site.sns.instagram ? '公開までのご予約はInstagramのDMよりお願いいたします。' : null}
            </p>
          ) : null}
        </Reveal>
      </Container>
    </section>
  );
}
