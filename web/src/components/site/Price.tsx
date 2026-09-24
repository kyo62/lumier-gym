import { Check } from 'lucide-react';
import { Container, SectionHeading, ReserveButton } from './primitives';
import { Reveal } from './Reveal';
import { monthlyPlans, singlePlans, booking, sections, type Plan } from '@/config/site';
import { yen } from '@/lib/utils';

function PlanCard({
  plan,
  featured,
  badgeSlot,
}: {
  plan: Plan;
  featured?: boolean;
  /** 同じ行に推奨バッジ付きのカードがある場合、バッジ分の高さを確保して行頭を揃える */
  badgeSlot?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-lg border bg-surface p-8 ${
        featured ? 'border-brass' : 'border-line'
      }`}
    >
      {badgeSlot ? (
        <span
          aria-hidden={!plan.recommended}
          className={`mb-5 self-start rounded-full bg-brass-soft px-3.5 py-1 text-[10px] tracking-[0.15em] text-brass ${
            plan.recommended ? '' : 'invisible'
          }`}
        >
          いちばん選ばれています
        </span>
      ) : null}

      <h3 className="text-base leading-relaxed">{plan.name}</h3>
      <p className="mt-3 text-xs leading-6 text-muted">{plan.description}</p>

      <p className="mt-6 font-serif text-3xl tnum">
        {yen(plan.price)}
        <span className="ml-2 text-xs text-muted">{plan.unit}</span>
      </p>
      {plan.note ? <p className="mt-1.5 text-[11px] text-muted tnum">{plan.note}</p> : null}

      <ul className="mt-6 flex-1 space-y-3 border-t border-line pt-6 text-sm text-muted">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2.5">
            <Check size={14} className="mt-1 shrink-0 text-brass" aria-hidden />
            <span className="leading-6">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Price() {
  return (
    <section id="price" className="scroll-mt-20 border-t border-line py-20 sm:py-28">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={sections.price.eyebrow}
            title={sections.price.title}
            lead={sections.price.lead}
          />
        </Reveal>

        {/* 月額プラン */}
        <Reveal className="mt-14">
          <p className="mb-6 text-center text-xs tracking-[0.2em] text-muted">{sections.price.monthlyLabel}</p>
          <div className="grid gap-6 md:grid-cols-2">
            {monthlyPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} featured={plan.recommended} badgeSlot />
            ))}
          </div>
        </Reveal>

        {/* 単発プラン */}
        <Reveal delay={80} className="mt-12">
          <p className="mb-6 text-center text-xs tracking-[0.2em] text-muted">{sections.price.singleLabel}</p>
          <div className="grid gap-6 md:grid-cols-3">
            {singlePlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Reveal>

        {/* サポート制度・割引 */}
        <Reveal delay={120} className="mx-auto mt-12 max-w-3xl rounded-lg border border-line bg-sand p-8 sm:p-10">
          <p className="text-[11px] tracking-[0.3em] text-brass uppercase">Support</p>
          <p className="mt-4 text-sm leading-7">{sections.price.supportTitle}</p>

          <dl className="mt-7 space-y-6">
            {booking.support.map((item) => (
              <div key={item.title}>
                <dt className="text-sm">{item.title}</dt>
                <dd className="mt-1.5 text-xs leading-7 text-muted">{item.body}</dd>
              </div>
            ))}
            {booking.discounts.map((item) => (
              <div key={item.name}>
                <dt className="text-sm">{item.name}</dt>
                <dd className="mt-1.5 text-xs leading-7 text-muted">{item.body}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 border-t border-line pt-6 text-xs leading-7 text-muted">
            キャンセルについて：{booking.cancelPolicy}
          </p>
        </Reveal>

        <Reveal delay={160} className="mt-14 text-center">
          <ReserveButton />
        </Reveal>
      </Container>
    </section>
  );
}
