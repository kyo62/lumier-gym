'use client';

import Link from 'next/link';
import { ArrowRight, Users, Video } from 'lucide-react';
import { useMember } from '@/components/member/MemberApp';
import { Card, EmptyState, Notice, PageTitle } from '@/components/member/ui';

export default function AdminIndexPage() {
  const { me } = useMember();
  if (!me.isAdmin) return <EmptyState title="このページは、施術者だけが開けます" />;

  const items = [
    { href: '/member/admin/videos', icon: Video, title: '動画の管理', body: '復習用の動画を登録します。全員に見せるか、選んだ会員だけに見せるかを決められます。' },
    { href: '/member/admin/members', icon: Users, title: '会員の記録', body: '会員が入力した体組成・食事・トレーニングを、閲覧できます（閲覧のみ）。' },
  ];

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="For practitioner" title="施術者メニュー" />
      <ul className="space-y-3">
        {items.map(({ href, icon: Icon, title, body }) => (
          <li key={href}>
            <Link href={href} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-brass">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brass-soft text-brass" aria-hidden>
                <Icon size={22} strokeWidth={1.5} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm">{title}</span>
                <span className="mt-1 block text-xs leading-6 text-muted">{body}</span>
              </span>
              <ArrowRight size={16} className="shrink-0 text-muted" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <h2 className="mb-3 text-base">会員を追加するには</h2>
        <p className="text-xs leading-7 text-muted">
          会員のログインアカウントは、Supabase の管理画面で作成します（Authentication → Users → Add user → Create new user。
          「Auto Confirm User」にチェック）。作成すると、その方のメールアドレスにログイン用コードが届くようになります。
          手順のくわしくは、リポジトリの <span className="font-mono">web/README.md</span> の「会員ページ」をご覧ください。
        </p>
      </Card>

      <Notice tone="warn">
        会員の記録は、ご本人の同意のもとで閲覧しています。セッションの準備など、目的の範囲で確認するようにしてください。
        書き換えや削除はできない仕組みになっています。
      </Notice>
    </div>
  );
}
