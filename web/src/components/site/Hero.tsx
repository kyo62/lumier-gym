import { site, businessHours, sections } from '@/config/site';
import { ReserveButton } from './primitives';

/** 見出しの一部だけを差し色にする。指定文字が含まれていなければそのまま返す */
function withAccent(line: string, accent: string) {
  if (!accent || !line.includes(accent)) return line;
  const [before, ...rest] = line.split(accent);
  return (
    <>
      {before}
      <span className="text-brass">{accent}</span>
      {rest.join(accent)}
    </>
  );
}

/**
 * 写真素材が用意できていない段階でも成立するよう、文字組みを主役にしている。
 * public/ に写真を置いたら、下の「写真の差し込み位置」のコメントを参照して置き換える。
 */
export function Hero() {
  const { headline, headlineAccent, lead, secondaryButton } = sections.hero;

  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* 背景の淡いにじみ。写真を入れる場合はこのdivを <Image fill /> に置き換える */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_90%_at_80%_-10%,var(--color-brass-soft)_0%,transparent_60%)]"
      />
      {/* 和モダンの記号としての縦組みラベル */}
      <span
        aria-hidden
        className="vertical absolute top-36 right-6 hidden text-[10px] tracking-[0.35em] text-brass/70 lg:block"
      >
        名城公園
      </span>

      <div className="relative mx-auto w-full max-w-5xl px-6">
        <p className="mb-8 text-[11px] leading-6 tracking-[0.3em] text-brass">{site.tagline}</p>

        <h1 className="text-[2rem] leading-[1.6] sm:text-[3.25rem] sm:leading-[1.5]">
          {headline.map((line, i) => (
            <span key={line} className="block">
              {withAccent(line, headlineAccent)}
              {i < headline.length - 1 ? null : null}
            </span>
          ))}
        </h1>

        <p className="mt-10 max-w-xl text-sm leading-9 text-muted sm:text-base">
          {lead.map((line, i) => (
            <span key={line}>
              {line}
              {i < lead.length - 1 ? <br className="hidden sm:block" /> : null}
            </span>
          ))}
        </p>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row">
          <ReserveButton />
          <a
            href="#concept"
            className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-9 py-4 text-sm tracking-wider transition-colors hover:border-brass hover:text-brass"
          >
            {secondaryButton}
          </a>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-3">
          {[
            { label: 'アクセス', value: '名城公園駅', unit: '徒歩すぐ' },
            { label: 'プライバシー', value: '完全個室', unit: '1対1' },
            { label: '営業', value: businessHours.days, unit: businessHours.hours },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface px-5 py-6 text-center sm:text-left">
              <dt className="text-[10px] tracking-[0.2em] text-muted">{stat.label}</dt>
              <dd className="mt-2 font-serif text-lg text-ink">
                {stat.value}
                <span className="ml-2 text-[11px] text-muted tnum">{stat.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
