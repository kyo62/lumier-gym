import { Container, ReserveButton, TextLink } from './primitives';
import { Reveal } from './Reveal';
import { booking, site, sections } from '@/config/site';

export function ReserveCta() {
  const { eyebrow, title, lead } = sections.reserveCta;
  // 設定されている連絡手段だけを出す（未設定のものは表示しない）。空文字の定数型にならないよう string で受ける
  const line: string = site.sns.line;
  const phone: string = site.phone;
  const email: string = site.email;
  const contacts = [
    line ? { label: 'LINEで連絡する', href: line, external: true } : null,
    phone ? { label: `電話する（${phone}）`, href: `tel:${phone.replace(/[^0-9+]/g, '')}`, external: false } : null,
    email && !email.endsWith('@example.com')
      ? { label: 'メールで連絡する', href: `mailto:${email}`, external: false }
      : null,
  ].filter((c): c is { label: string; href: string; external: boolean } => c !== null);

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

          {/* 初めての方：連絡をもらってから、代表が日程を決める */}
          <div className="mx-auto mt-11 max-w-xl rounded-lg border border-line bg-sand p-8 text-left sm:p-10">
            <h3 className="text-base">{booking.firstVisit.title}</h3>
            <p className="mt-3 text-sm leading-7 text-muted">{booking.firstVisit.lead}</p>

            {contacts.length > 0 ? (
              <ul className="mt-6 flex flex-wrap gap-3">
                {contacts.map((c) => (
                  <li key={c.label}>
                    <a
                      href={c.href}
                      {...(c.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                      className="inline-flex items-center rounded-full border border-line bg-surface px-6 py-2.5 text-sm tracking-wider transition-colors hover:border-brass hover:text-brass"
                    >
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-6 text-xs text-muted">ご連絡先は準備中です。</p>
            )}

            <p className="mt-8 text-xs tracking-wider text-muted">{booking.firstVisit.askTitle}</p>
            <ul className="mt-3 space-y-1.5 text-sm leading-7">
              {booking.firstVisit.ask.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="text-brass">・</span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs leading-7 text-muted">{booking.firstVisit.phoneNote}</p>
            <p className="mt-3 text-[11px] leading-6 text-muted">
              {booking.firstVisit.privacyNote}
              <TextLink href="/privacy">プライバシーポリシー</TextLink>
            </p>
          </div>

          {/* 2回目以降・会員の方：Squareの予約ページ */}
          <p className="mt-12 mb-5 text-xs tracking-wider text-muted">2回目以降・会員の方</p>
          <div>
            <ReserveButton>オンラインで予約する</ReserveButton>
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
