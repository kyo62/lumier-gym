'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import { ArrowRight, Check, PlayCircle } from 'lucide-react';
import { api } from '@/lib/member/api';
import { todayLocal } from '@/lib/member/dates';
import { booking } from '@/config/site';
import { useMember } from '@/components/member/MemberApp';
import { InstallGuide } from '@/components/member/InstallGuide';
import { Card, Loading, PageTitle, useAsync } from '@/components/member/ui';
import { ReserveButton } from '@/components/site/primitives';

export default function MemberHomePage() {
  const { me } = useMember();
  const name = me.displayName.trim();

  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Welcome" title={name ? `${name} さん、こんにちは` : 'こんにちは'} lead="今日も、まず整えるところから。" />

      <Card className="text-center">
        <p className="text-[11px] tracking-[0.3em] text-brass uppercase">Reservation</p>
        <h2 className="mt-2 text-lg">次回のご予約</h2>
        <p className="mt-2 mb-5 text-xs leading-6 text-muted">
          予約と変更は、予約ページ（Square）で行います。
          <br />
          {booking.cancelPolicy}
        </p>
        <ReserveButton className="w-full">予約ページを開く</ReserveButton>
      </Card>

      <TodayCard />
      <NewVideos />
      <InstallGuide />
    </div>
  );
}

/** 今日の記録の状況。3種類の記録へ、すぐ移れる */
function TodayCard() {
  const load = useCallback(async () => {
    const [body, meals, workouts] = await Promise.all([api.listBody(), api.listMeals(), api.listWorkouts()]);
    const today = todayLocal();
    return {
      body: body.filter((l) => l.loggedOn === today).length,
      meals: meals.filter((l) => l.loggedOn === today).length,
      workouts: workouts.filter((l) => l.loggedOn === today).length,
    };
  }, []);
  const { data, loading } = useAsync(load);

  const items = [
    { href: '/member/body', label: '体組成', count: data?.body ?? 0 },
    { href: '/member/meals', label: '食事', count: data?.meals ?? 0 },
    { href: '/member/workouts', label: 'トレーニング', count: data?.workouts ?? 0 },
  ];

  return (
    <Card>
      <h2 className="mb-4 text-base">今日の記録</h2>
      {loading ? (
        <Loading label="" />
      ) : (
        <ul className="divide-y divide-line">
          {items.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className="flex min-h-12 items-center justify-between gap-3 py-2 text-sm transition-colors hover:text-brass">
                <span className="flex items-center gap-3">
                  <span
                    className={`grid size-5 place-items-center rounded-full border ${it.count > 0 ? 'border-brass bg-brass text-canvas' : 'border-line text-transparent'}`}
                    aria-hidden
                  >
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {it.label}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  {it.count > 0 ? `${it.count}件` : '記録する'}
                  <ArrowRight size={14} aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** 新しい動画（上位3本） */
function NewVideos() {
  const { data, loading } = useAsync(api.listVideos);
  if (loading || !data || data.length === 0) return null;

  return (
    <Card>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-base">動画で復習する</h2>
        <Link href="/member/videos" className="text-xs text-brass underline underline-offset-4">
          すべて見る
        </Link>
      </div>
      <ul className="space-y-1">
        {data.slice(0, 3).map((v) => (
          <li key={v.id}>
            <Link
              href={`/member/videos/watch?id=${encodeURIComponent(v.id)}`}
              className="flex min-h-12 items-center gap-3 py-2 text-sm transition-colors hover:text-brass"
            >
              <PlayCircle size={20} strokeWidth={1.5} className="shrink-0 text-brass" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{v.title}</span>
              {v.visibility === 'assigned' ? (
                <span className="shrink-0 rounded-full bg-brass-soft px-2.5 py-0.5 text-[10px] tracking-wider">あなたへ</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
