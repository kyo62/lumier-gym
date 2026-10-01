'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { EmptyState } from './ui';
import { useMember } from './MemberApp';

/**
 * 施術者だけのページの入口。
 * ここは「見た目を出さない」ためだけの確認で、本当の権限確認はデータベース側（RLS）が行っている。
 * 会員がURLを直接開いても、データは1件も返ってこない。
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { me } = useMember();
  if (!me.isAdmin) {
    return <EmptyState title="このページは、施術者だけが開けます" />;
  }
  return <div className="space-y-6">{children}</div>;
}

/** 1つ上の階層へ戻るリンク */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink">
      <ChevronLeft size={15} aria-hidden />
      {children}
    </Link>
  );
}
