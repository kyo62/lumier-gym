import { Container, SectionHeading } from './primitives';
import { Reveal } from './Reveal';

const faqs = [
  {
    q: '運動が苦手でも大丈夫ですか？',
    a: 'はい。むしろ運動習慣のない方こそ対象です。ハードな筋力トレーニングは行いません。ストレッチと、正しい動きを覚え直すことが中心です。',
  },
  {
    q: 'ベンチプレスがあると聞きましたが、重いものを持つのでしょうか？',
    a: 'いいえ。高重量を扱うことはありません。胸を開くストレッチの土台として、また安全な低負荷でフォームを確認する補助具として使用します。',
  },
  {
    q: '服装や持ち物は？',
    a: '動きやすい服装をお持ちください。着替えスペースがあります。お手洗いもご利用いただけます。',
  },
  {
    q: '痛みがあるのですが施術を受けられますか？',
    a: '強い痛みや、しびれ・原因のはっきりしない症状がある場合は、まず医療機関の受診をおすすめしています。当サロンは医療行為・治療を行う施設ではありません。ご不安な点は予約フォームの「現在の身体のお悩み」欄にご記入ください。',
  },
  {
    q: '支払い方法は？',
    a: '施術後に現地でお支払いいただきます（現金・キャッシュレス決済に対応）。',
  },
];

export function Faq() {
  return (
    <section className="border-t border-line py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading eyebrow="FAQ" title="よくあるご質問" />
        </Reveal>

        <dl className="mx-auto mt-12 max-w-2xl divide-y divide-line border-t border-b border-line">
          {faqs.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 50} className="py-7">
              <dt className="flex gap-3 text-sm leading-7">
                <span className="font-serif text-accent">Q.</span>
                {faq.q}
              </dt>
              <dd className="mt-3 flex gap-3 text-sm leading-7 text-muted">
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
