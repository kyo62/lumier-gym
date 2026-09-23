import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { profile } from '@/config/site';

export function Profile() {
  const years = new Date().getFullYear() - profile.since;

  return (
    <section id="profile" className="scroll-mt-20 border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="Profile" title={`${profile.since}年から、現場で。`} />
        </Reveal>

        <div className="mt-16 grid gap-12 md:grid-cols-[260px_1fr] md:gap-16">
          <Reveal>
            {profile.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.photo}
                alt={`${profile.nameJa}のプロフィール写真`}
                className="aspect-[3/4] w-full rounded-lg object-cover"
              />
            ) : (
              /* 写真が未設定のときのプレースホルダー。
                 public/ に画像を置き、config/site.ts の profile.photo にパスを設定してください */
              <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg border border-dashed border-line bg-surface text-center text-[11px] leading-6 text-muted">
                プロフィール写真
                <br />
                （config/site.ts の
                <br />
                profile.photo に設定）
              </div>
            )}

            <div className="mt-6">
              <p className="font-serif text-xl tracking-[0.12em]">{profile.name}</p>
              <p className="mt-1.5 text-sm">{profile.nameJa}</p>
              <p className="mt-3 text-[11px] tracking-wider text-muted">{profile.role}</p>
              <p className="mt-1 text-[11px] tracking-wider text-brass tnum">指導歴 {years}年</p>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <p className="font-serif text-lg leading-10 sm:text-xl">{profile.lead}</p>
            <div className="mt-9 space-y-6 text-sm leading-8 text-muted">
              {profile.body.map((paragraph) => (
                <p key={paragraph.slice(0, 14)}>{paragraph}</p>
              ))}
            </div>

            {profile.credentials.length > 0 ? (
              <div className="mt-10 rounded-lg border border-line bg-surface p-6">
                <p className="text-[11px] tracking-[0.3em] text-brass uppercase">Credentials</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  {profile.credentials.map((c) => (
                    <li key={c}>・{c}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
