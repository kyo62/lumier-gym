'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { api } from '@/lib/member/api';
import { cn } from '@/lib/utils';
import { EmptyState, Loading, Notice, PageTitle, useAsync } from '@/components/member/ui';

export default function VideosPage() {
  const { data: videos, error, loading } = useAsync(api.listVideos);
  const [category, setCategory] = useState<string>('');

  if (loading) return <Loading />;
  if (error || !videos) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const categories = [...new Set(videos.map((v) => v.category).filter(Boolean))];
  const shown = category ? videos.filter((v) => v.category === category) : videos;

  return (
    <>
      <PageTitle eyebrow="Videos" title="復習用の動画" lead="セッションでお伝えした内容を、おうちで振り返るための動画です。" />

      {categories.length > 0 ? (
        <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="カテゴリー">
          {['', ...categories].map((c) => (
            <button
              key={c || 'all'}
              type="button"
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs tracking-wider transition-colors',
                category === c ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-muted hover:border-brass'
              )}
            >
              {c || 'すべて'}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <EmptyState title="まだ動画がありません" body="セッションのあとに、復習用の動画をお届けします。" />
      ) : (
        <ul className="space-y-3">
          {shown.map((v) => (
            <li key={v.id}>
              <Link
                href={`/member/videos/watch?id=${encodeURIComponent(v.id)}`}
                className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-brass"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brass-soft text-brass" aria-hidden>
                  <PlayCircle size={24} strokeWidth={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{v.title}</span>
                  <span className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                    {v.category ? <span>{v.category}</span> : null}
                    {v.visibility === 'assigned' ? (
                      <span className="rounded-full bg-brass-soft px-2.5 py-0.5 tracking-wider text-ink">あなたへ</span>
                    ) : null}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
