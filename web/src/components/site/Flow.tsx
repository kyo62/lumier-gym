import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';

const steps = [
  { title: 'ご予約', body: 'このサイトのカレンダーから、空いている枠をお選びください。ご予約確定のメールをお送りします。' },
  { title: 'カウンセリング', body: '現在のお悩み、痛みの出る動き、生活の中での姿勢の癖をうかがいます。' },
  { title: '姿勢の撮影・分析', body: '正面と側面から撮影し、どこがどう崩れているのかを一緒に確認します。' },
  { title: '施術・エクササイズ', body: 'ストレッチと徒手による調整を行い、正しい動きを身体に覚え直してもらいます。' },
  { title: 'セルフケアのご提案', body: 'ご自宅でできることを2〜3つに絞ってお伝えします。多すぎると続かないためです。' },
];

export function Flow() {
  return (
    <section id="flow" className="scroll-mt-24 border-t border-line py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Flow"
            title="ご利用の流れ"
            lead="初回は75分。動きやすい服装をご用意ください（着替えスペースがあります）。"
          />
        </Reveal>

        <ol className="mx-auto mt-14 max-w-2xl">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-6 pb-10 last:pb-0">
              {/* 縦のガイドライン（最後の項目には引かない） */}
              {i < steps.length - 1 ? (
                <span aria-hidden className="absolute top-9 bottom-0 left-[15px] w-px bg-line" />
              ) : null}
              <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface font-serif text-xs text-accent tnum">
                {i + 1}
              </span>
              <Reveal delay={i * 60} className="flex-1 pt-1">
                <h3 className="text-base">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted">{step.body}</p>
              </Reveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
