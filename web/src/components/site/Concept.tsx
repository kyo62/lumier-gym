import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { concerns, brand, site, sections } from '@/config/site';

export function Concept() {
  return (
    <section id="concept" className="scroll-mt-20 border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={sections.concept.eyebrow}
            title={sections.concept.title}
            lead={sections.concept.lead}
          />
        </Reveal>

        {/* お悩みチェック */}
        <Reveal className="mx-auto mt-16 max-w-2xl rounded-lg border border-line bg-surface p-8 sm:p-10">
          <p className="text-center text-sm tracking-wider text-muted">{sections.concept.concernsTitle}</p>
          <ul className="mt-7 space-y-4">
            {concerns.map((concern) => (
              <li key={concern} className="flex items-start gap-3.5 text-sm leading-7 sm:text-[0.95rem]">
                <span
                  aria-hidden
                  className="mt-2.5 block size-1.5 shrink-0 rotate-45 border border-brass"
                />
                {concern}
              </li>
            ))}
          </ul>
        </Reveal>

        {/* 屋号の由来 */}
        <Reveal delay={100} className="mx-auto mt-14 max-w-xl text-center">
          <p className="text-[11px] tracking-[0.3em] text-brass uppercase">Name</p>
          <p className="mt-5 font-serif text-xl tracking-[0.1em]">
            {site.name}
            <span className="ml-3 text-xs tracking-[0.2em] text-muted">{site.nameKana}</span>
          </p>
          <p className="mt-4 font-serif text-base text-brass">{brand.originTitle}</p>
          <div className="mt-5 space-y-2 text-sm leading-8 text-muted">
            {brand.originBody.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
