import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';
import { flow } from '@/config/site';

export function Flow() {
  return (
    <section id="flow" className="scroll-mt-20 border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Flow"
            title="セッションの流れ"
            lead="ゆったり90分。お茶を飲んで振り返る時間まで含めて、TONEKAのセッションです。"
          />
        </Reveal>

        <ol className="mx-auto mt-16 max-w-2xl">
          {flow.map((step, i) => (
            <li key={step.title} className="relative flex gap-6 pb-10 last:pb-0 sm:gap-8">
              {/* 縦のガイドライン（最後の項目には引かない） */}
              {i < flow.length - 1 ? (
                <span aria-hidden className="absolute top-10 bottom-0 left-[19px] w-px bg-line" />
              ) : null}
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-serif text-xs text-brass tnum">
                {i + 1}
              </span>
              <Reveal delay={i * 70} className="flex-1 pt-1.5">
                <p className="text-[10px] tracking-[0.2em] text-muted tnum">{step.time}</p>
                <h3 className="mt-1.5 text-base">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
