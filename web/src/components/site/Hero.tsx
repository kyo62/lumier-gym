import Link from 'next/link';
import { site, profile } from '@/config/site';

/**
 * 写真素材が用意できていない段階でも成立するよう、文字組みを主役にしている。
 * public/ に写真を置いたら、下の「写真の差し込み位置」のコメントを参照して置き換える。
 */
export function Hero() {
  const years = new Date().getFullYear() - profile.since;

  return (
    <section className="relative overflow-hidden bg-canvas pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* 背景の淡いグラデーション。写真を入れる場合はこのdivを <Image fill /> に置き換える */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_75%_0%,var(--color-accent-soft)_0%,transparent_55%)]"
      />

      <div className="relative mx-auto w-full max-w-5xl px-6">
        <p className="mb-6 text-[11px] tracking-[0.3em] text-accent uppercase">
          {site.address.city} / Private Salon
        </p>

        <h1 className="text-3xl leading-[1.5] sm:text-5xl sm:leading-[1.45]">
          鍛える前に、
          <br />
          <span className="text-accent">正しく動ける</span>身体へ。
        </h1>

        <p className="mt-8 max-w-xl text-sm leading-8 text-muted sm:text-base">
          {profile.since}年から現場に立つパーソナルトレーナーによる、完全予約制の{site.tagline}。
          マンションの一室のプライベート空間で、あなたの姿勢だけに向き合います。
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/reserve"
            className="inline-flex items-center justify-center rounded-full bg-ink px-8 py-4 text-sm tracking-wide text-canvas transition-colors hover:bg-accent"
          >
            空き状況を見て予約する
          </Link>
          <Link
            href="/#concept"
            className="inline-flex items-center justify-center rounded-full border border-line bg-surface px-8 py-4 text-sm tracking-wide transition-colors hover:border-accent hover:text-accent"
          >
            サロンについて
          </Link>
        </div>

        <dl className="mt-16 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line text-center">
          {[
            { label: '指導歴', value: `${years}`, unit: '年' },
            { label: '完全予約制', value: '1', unit: '名専有' },
            { label: '営業', value: '週3', unit: '日' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface px-3 py-6">
              <dd className="font-serif text-2xl text-ink tnum">
                {stat.value}
                <span className="ml-0.5 text-xs text-muted">{stat.unit}</span>
              </dd>
              <dt className="mt-2 text-[11px] tracking-widest text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
