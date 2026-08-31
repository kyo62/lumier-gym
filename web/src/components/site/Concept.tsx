import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';

const points = [
  {
    no: '01',
    title: '姿勢を「見て」から始める',
    body: '初回は姿勢の撮影と分析から。感覚ではなく、目で見て確認できる状態を出発点にします。変化も同じ方法で記録するので、進んでいることがご自身で分かります。',
  },
  {
    no: '02',
    title: 'ゆるめて、目覚めさせて、覚え直す',
    body: '硬くなった部分をストレッチと徒手でゆるめ、使えていない部分に働きかけ、正しい動きのパターンを身体に覚え直してもらいます。この順番を飛ばすと元に戻ります。',
  },
  {
    no: '03',
    title: '器具は「補助」として使う',
    body: 'ベンチプレス台を1台のみ設置していますが、高重量を扱うためのものではありません。胸を開くストレッチや、安全な低負荷でのフォーム修正を支える道具として使います。',
  },
  {
    no: '04',
    title: '誰の目も気にならない空間で',
    body: 'マンションの一室、完全予約制の1対1。他のお客様と顔を合わせることはありません。身体の悩みは人に見られたくないもの、という前提で設計しています。',
  },
];

export function Concept() {
  return (
    <section id="concept" className="scroll-mt-24 border-t border-line bg-sand py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="Concept"
            title="姿勢が変われば、身体の使い方が変わる"
            lead="肩が内側に巻き、骨盤が後ろに倒れ、呼吸が浅くなる。その状態のままトレーニングを重ねても、身体は思うように変わりません。まず「正しく動ける状態」に戻すことから始めます。"
          />
        </Reveal>

        <ul className="mt-14 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
          {points.map((point, i) => (
            <li key={point.no} className="bg-surface">
              <Reveal delay={i * 80} className="h-full p-8 sm:p-10">
                <span className="font-serif text-sm tracking-[0.2em] text-accent">{point.no}</span>
                <h3 className="mt-4 text-lg leading-relaxed">{point.title}</h3>
                <p className="mt-4 text-sm leading-8 text-muted">{point.body}</p>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
