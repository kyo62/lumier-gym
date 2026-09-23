import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { faqs } from '@/config/site';

export function Faq() {
  return (
    <section className="border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="よくあるご質問" />
        </Reveal>

        <dl className="mx-auto mt-14 max-w-2xl divide-y divide-line border-t border-b border-line">
          {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 50} className="py-7">
              <dt className="flex gap-3.5 text-sm leading-7">
                <span className="font-serif text-brass">Q.</span>
                {faq.q}
              </dt>
              <dd className="mt-3.5 flex gap-3.5 text-sm leading-7 text-muted">
                <span className="font-serif text-line">A.</span>
                {faq.a}
              </dd>
            </Reveal>
          ))}
        </dl>
      </Container>
    </section>
  );
}
