import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { reasons, sections } from '@/config/site';

export function Reasons() {
  return (
    <section id="reasons" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading eyebrow={sections.reasons.eyebrow} title={sections.reasons.title} />
        </Reveal>

        <ul className="mt-16 space-y-px overflow-hidden rounded-lg border border-line bg-line">
          {reasons.map((reason, i) => (
            <li key={reason.no} className="bg-surface">
              <Reveal delay={i * 90} className="grid gap-4 p-8 sm:grid-cols-[7rem_1fr] sm:gap-8 sm:p-10">
                <div>
                  <span className="font-serif text-2xl text-brass tnum">{reason.no}</span>
                </div>
                <div>
                  <h3 className="text-lg leading-relaxed">{reason.title}</h3>
                  <p className="mt-4 text-sm leading-8 text-muted">{reason.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
