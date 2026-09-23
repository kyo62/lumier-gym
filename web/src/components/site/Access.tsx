import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { site, businessHours, policies } from '@/config/site';

export function Access() {
  return (
    <section id="access" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Access"
            title="アクセス・ご利用にあたって"
            lead={`地下鉄名城線「名城公園」駅からすぐ。マンションの一室の、完全個室のサロンです。`}
          />
        </Reveal>

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <Reveal>
            <dl className="divide-y divide-line border-t border-b border-line text-sm">
              <div className="grid grid-cols-[5.5rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">所在地</dt>
                <dd className="leading-7">
                  〒{site.address.postalCode}
                  <br />
                  {site.address.prefecture}
                  {site.address.city}
                  <br />
                  <span className="text-xs text-muted">{site.address.street}</span>
                </dd>
              </div>
              <div className="grid grid-cols-[5.5rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">アクセス</dt>
                <dd className="space-y-1 leading-7">
                  {site.address.access.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </dd>
              </div>
              <div className="grid grid-cols-[5.5rem_1fr] gap-4 py-5">
                <dt className="text-xs tracking-widest text-muted">営業日</dt>
                <dd className="leading-7">
                  {businessHours.days}
                  <br />
                  <span className="text-xs text-muted tnum">{businessHours.hours}</span>
                  <br />
                  <span className="text-[11px] leading-6 text-muted">{businessHours.note}</span>
                </dd>
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
                className="h-full min-h-[300px] w-full rounded-lg border border-line"
              />
            ) : (
              /* Googleマップの「共有」→「地図を埋め込む」で得られる src を
                 config/site.ts の address.mapEmbedUrl に設定すると地図が表示されます */
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-lg border border-dashed border-line bg-surface px-6 text-center text-[11px] leading-6 text-muted">
                地図（config/site.ts の
                <br />
                address.mapEmbedUrl に
                <br />
                Googleマップの埋め込みURLを設定）
              </div>
            )}
          </Reveal>
        </div>

        {/* ご利用にあたって */}
        <Reveal delay={140} className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {policies.map((policy) => (
            <div key={policy.title} className="bg-surface p-7">
              <h3 className="text-sm leading-relaxed">{policy.title}</h3>
              <p className="mt-3 text-xs leading-7 text-muted">{policy.body}</p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
