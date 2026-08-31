import Link from 'next/link';
import { cn } from '@/lib/utils';

export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
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
  title: string;
  lead?: string;
  align?: 'center' | 'left';
}) {
  return (
    <div className={cn('max-w-2xl', align === 'center' ? 'mx-auto text-center' : 'text-left')}>
      <p className="mb-4 text-xs tracking-[0.25em] text-accent uppercase">{eyebrow}</p>
      <h2 className="text-2xl leading-snug sm:text-3xl">{title}</h2>
      {lead ? <p className="mt-5 text-sm leading-8 text-muted sm:text-base">{lead}</p> : null}
    </div>
  );
}

type ButtonProps = {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'outline';
  className?: string;
};

export function ButtonLink({ href, children, variant = 'primary', className }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm tracking-wide transition-colors duration-200';
  const styles =
    variant === 'primary'
      ? 'bg-ink text-canvas hover:bg-accent'
      : 'border border-line bg-surface text-ink hover:border-accent hover:text-accent';
  return (
    <Link href={href} className={cn(base, styles, className)}>
      {children}
    </Link>
  );
}

/** 細い区切り線 */
export function Rule({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line', className)} />;
}
