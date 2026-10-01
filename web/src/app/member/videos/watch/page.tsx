'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { api } from '@/lib/member/api';
import { directVideoUrl, embedUrl } from '@/lib/member/video';
import type { Video } from '@/lib/member/types';
import { Card, EmptyState, Loading, Notice, useAsync } from '@/components/member/ui';

/**
 * 動画の再生ページ。静的書き出しでは動画ごとのURLを事前に作れないため、
 * /member/videos/watch?id=… のように、URL の後ろで動画を指定する。
 */
export default function WatchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Watch />
    </Suspense>
  );
}

function Watch() {
  const id = useSearchParams().get('id') ?? '';
  const load = useCallback(() => api.getVideo(id), [id]);
  const { data: video, error, loading } = useAsync(load);

  return (
    <div className="space-y-6">
      <Link href="/member/videos" className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-ink">
        <ChevronLeft size={15} aria-hidden />
        動画の一覧へ
      </Link>

      {loading ? (
        <Loading />
      ) : error ? (
        <Notice tone="error">{error}</Notice>
      ) : !video ? (
        <EmptyState title="この動画は見つかりませんでした" body="公開が終了したか、あなたの動画ではない可能性があります。" />
      ) : (
        <>
          <div>
            {video.category ? <p className="mb-2 text-[11px] tracking-[0.3em] text-brass">{video.category}</p> : null}
            <h1 className="text-xl leading-snug">{video.title}</h1>
          </div>

          <Player video={video} />

          {video.description ? (
            <Card>
              <p className="text-sm leading-8 whitespace-pre-wrap">{video.description}</p>
            </Card>
          ) : null}

          <Notice>
            痛みを感じたときは、無理をせず中止してください。痛みのある方、通院中・治療中の方は、医療機関にご相談のうえ行ってください。
            <br />
            この動画は、ご入会中の方への復習用です。無断での転載・共有はご遠慮ください。
          </Notice>
        </>
      )}
    </div>
  );
}

function Player({ video }: { video: Video }) {
  const frame = 'aspect-video w-full overflow-hidden rounded-2xl border border-line bg-ink';

  // デモ用のダミー動画（DEMO_ で始まる ID）
  if (video.videoRef.startsWith('DEMO_')) {
    return (
      <div className={`${frame} grid place-items-center text-center text-canvas/70`}>
        <p className="px-6 text-xs leading-6">
          デモ用のダミー動画です。
          <br />
          本番では、ここに動画が表示されます。
        </p>
      </div>
    );
  }

  if (video.provider === 'url') {
    const src = directVideoUrl(video.videoRef);
    if (!src) return <Notice tone="error">この動画のURLが正しくありません。サロンにご連絡ください。</Notice>;
    return (
      <video className={frame} controls playsInline preload="metadata" src={src}>
        お使いのブラウザでは、この動画を再生できません。
      </video>
    );
  }

  const src = embedUrl(video.provider, video.videoRef);
  if (!src) return <Notice tone="error">この動画のURLが正しくありません。サロンにご連絡ください。</Notice>;
  return (
    <iframe
      className={frame}
      src={src}
      title={video.title}
      allow="fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      loading="lazy"
    />
  );
}
