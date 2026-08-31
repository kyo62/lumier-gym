import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { site, defaultBusinessHours, WEEKDAY_LABELS } from '@/config/site';

export function Access() {
  const days = defaultBusinessHours.map((h) => WEEKDAY_LABELS[h.weekday]).join('・');
  const hours = defaultBusinessHours
    .map((h) => `${WEEKDAY_LABELS[h.weekday]} ${h.startTime}〜${h.endTime}`)
    .join(' / ');

  return (
    <section id="access" className="scroll-mt-24 border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Access"
            title="アクセス"
            lead={`${site.address.city}のマンションの一室、完全予約制のプライベートサロンです。`}
          />
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <Reveal>
            <dl className="divide-y divide-line border-t border-b border-line text-sm">
              <div className="grid grid-cols-[6rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">所在地</dt>
                <dd className="leading-7">
                  〒{site.address.postalCode}
                  <br />
                  {site.address.prefecture}
                  {site.address.city}
                  {site.address.street}
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">アクセス</dt>
                <dd className="space-y-1 leading-7">
                  {site.address.access.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">営業日</dt>
                <dd className="leading-7">
                  毎週 {days}
                  <br />
                  <span className="text-xs text-muted tnum">{hours}</span>
                  <br />
                  <span className="text-xs text-muted">
                    ※ 実際の空き状況は予約ページのカレンダーをご覧ください
                  </span>
                </dd>
              </div>
              <div className="grid grid-cols-[6rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">ご予約</dt>
                <dd className="leading-7">完全予約制（当サイトのカレンダーより）</dd>
              </div>
            </dl>
          </Reveal>

          <Reveal delay={100}>
            {site.address.mapEmbedUrl ? (
              <iframe
                src={site.address.mapEmbedUrl}
                title="所在地の地図"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-full min-h-[320px] w-full rounded-lg border border-line"
              />
            ) : (
              /* Googleマップの「共有」→「地図を埋め込む」で得られる src を
                 config/site.ts の address.mapEmbedUrl に設定すると地図が表示されます */
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 text-center text-xs leading-6 text-muted">
                地図（config/site.ts の
                <br />
                address.mapEmbedUrl に
                <br />
                Googleマップの埋め込みURLを設定）
              </div>
            )}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
