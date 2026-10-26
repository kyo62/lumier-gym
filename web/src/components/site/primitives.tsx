import Link from 'next/link';
import { cn } from '@/lib/utils';
import { booking, site } from '@/config/site';

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-5xl px-6', className)}>{children}</div>;
}

/** セクション見出し。英字の小さなラベル＋明朝の日本語見出し */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'text-left')}>
      <p className="mb-5 text-[11px] tracking-[0.3em] text-brass uppercase">{eyebrow}</p>
      <h2 className="text-2xl leading-[1.7] sm:text-[1.75rem]">{title}</h2>
      {lead ? <p className="mt-6 whitespace-pre-line text-sm leading-8 text-muted">{lead}</p> : null}
    </div>
  );
}

/**
 * 予約ボタン。
 * Square の予約URLが未設定のあいだは、LINE・お電話・メールの順で、連絡の入口になる。
 * 連絡先が1つもなければ、押せない「準備中」の見た目になる。
 */
export function ReserveButton({
  children = 'ご予約・体験のお申し込み',
  variant = 'primary',
  className,
}: {
  children?: React.ReactNode;
  variant?: 'primary' | 'outline';
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-9 py-4 text-sm tracking-wider transition-colors duration-200';
  const styles =
    variant === 'primary'
      ? 'bg-ink text-canvas hover:bg-brass'
      : 'border border-line bg-surface text-ink hover:border-brass hover:text-brass';

  if (!booking.squareUrl) {
    // 予約ページができるまでは、LINE → お電話 → メールの順で、連絡の入口にする
    const line: string = site.sns.line;
    const phone: string = site.phone;
    const email: string = site.email;
    const contact = line
      ? { href: line, label: 'LINEでご予約・ご相談', external: true }
      : phone
        ? { href: `tel:${phone.replace(/[^0-9+]/g, '')}`, label: 'お電話でご予約・ご相談', external: false }
        : email
          ? { href: `mailto:${email}`, label: 'メールでご予約・ご相談', external: false }
          : null;
    if (!contact) {
      return (
        <span aria-disabled className={cn(base, 'cursor-not-allowed border border-dashed border-line bg-sand text-muted', className)}>
          ご連絡先は準備中です
        </span>
      );
    }
    return (
      <a
        href={contact.href}
        {...(contact.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
        className={cn(base, styles, className)}
      >
        {contact.label}
      </a>
    );
  }

  return (
    <a href={booking.squareUrl} target="_blank" rel="noreferrer noopener" className={cn(base, styles, className)}>
      {children}
    </a>
  );
}

export function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-brass underline underline-offset-4 transition-opacity hover:opacity-70">
      {children}
    </Link>
  );
}
