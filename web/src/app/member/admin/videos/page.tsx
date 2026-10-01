'use client';

import { useCallback, useState } from 'react';
import { api } from '@/lib/member/api';
import { PROVIDER_LABELS, parseVideoInput } from '@/lib/member/video';
import type { MemberSummary, Video, VideoVisibility } from '@/lib/member/types';
import { AdminGate, BackLink } from '@/components/member/AdminGate';
import { Button, Card, ConfirmButton, EmptyState, Field, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

export default function AdminVideosPage() {
  return (
    <AdminGate>
      <BackLink href="/member/admin">施術者メニュー</BackLink>
      <PageTitle eyebrow="For practitioner" title="動画の管理" lead="復習用の動画を登録します。YouTube・Vimeo のURL、または動画ファイルのURL（https）を貼りつけてください。" />
      <VideosAdmin />
    </AdminGate>
  );
}

/** 保存済みの値から、入力欄に入れるURLを組み立てる（編集のとき） */
function refToUrl(v: Pick<Video, 'provider' | 'videoRef'>): string {
  if (v.provider === 'youtube') return `https://youtu.be/${v.videoRef}`;
  if (v.provider === 'vimeo') return `https://vimeo.com/${v.videoRef}`;
  return v.videoRef;
}

function VideosAdmin() {
  const { data: videos, error, loading, reload } = useAsync(api.adminListVideos);
  const { data: members } = useAsync(api.adminListMembers);
  const [editing, setEditing] = useState<Video | 'new' | null>(null);

  if (loading) return <Loading />;
  if (error || !videos) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  if (editing) {
    return (
      <VideoForm
        // 編集する動画が変わったら、フォームの状態を作り直す
        key={editing === 'new' ? 'new' : editing.id}
        initial={editing === 'new' ? null : editing}
        members={members ?? []}
        categories={[...new Set(videos.map((v) => v.category).filter(Boolean))]}
        onDone={() => {
          setEditing(null);
          reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Button className="w-full" onClick={() => setEditing('new')}>
        新しい動画を登録する
      </Button>

      {videos.length === 0 ? (
        <EmptyState title="まだ動画がありません" />
      ) : (
        <ul className="space-y-3">
          {videos.map((v) => (
            <li key={v.id}>
              <Card className="space-y-3 p-4">
                <div>
                  <p className="text-sm">{v.title}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                    <span>{PROVIDER_LABELS[v.provider]}</span>
                    {v.category ? <span>{v.category}</span> : null}
                    <span className={v.published ? 'text-ink' : 'text-red-800'}>{v.published ? '公開中' : '下書き（非公開）'}</span>
                    <span>{v.visibility === 'all' ? '全員に表示' : '選んだ会員だけ'}</span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="min-h-9 flex-1 px-4 text-xs" onClick={() => setEditing(v)}>
                    編集
                  </Button>
                  <ConfirmButton
                    variant="outline"
                    label="削除"
                    confirmLabel="本当に削除"
                    className="flex-1"
                    onConfirm={async () => {
                      await api.adminDeleteVideo(v.id);
                      reload();
                    }}
                  />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function VideoForm({
  initial,
  members,
  categories,
  onDone,
}: {
  initial: Video | null;
  members: MemberSummary[];
  categories: string[];
  onDone: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [urlInput, setUrlInput] = useState(initial ? refToUrl(initial) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [visibility, setVisibility] = useState<VideoVisibility>(initial?.visibility ?? 'all');
  const [published, setPublished] = useState(initial?.published ?? true);
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [selected, setSelected] = useState<string[] | null>(null);
  const submit = useSubmit();

  // 編集のときは、いまの割り当てを読み込む。まだ触っていなければ、それをそのまま使う
  const loadAssigned = useCallback(() => (initial ? api.adminGetAssignments(initial.id) : Promise.resolve<string[]>([])), [initial]);
  const { data: assigned } = useAsync(loadAssigned);
  const chosen = selected ?? assigned ?? [];

  const parsed = urlInput.trim() ? parseVideoInput(urlInput) : null;

  const toggle = (id: string) => setSelected(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return submit.setError('題名を入力してください。');
    if ([...title.trim()].length > 100) return submit.setError('題名は100文字以内で入力してください。');
    if (!parsed) return submit.setError('動画のURLを確認してください。YouTube・Vimeo のURL、または https から始まる動画ファイルのURLが使えます。');
    if ([...description].length > 1000) return submit.setError('説明は1000文字以内で入力してください。');
    if ([...category.trim()].length > 30) return submit.setError('カテゴリーは30文字以内で入力してください。');
    const order = Number(sortOrder);
    if (!Number.isInteger(order)) return submit.setError('表示順は整数で入力してください。');

    await submit
      .run(async () => {
        const saved = await api.adminSaveVideo({
          id: initial?.id,
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          provider: parsed.provider,
          videoRef: parsed.videoRef,
          visibility,
          published,
          sortOrder: order,
        });
        if (visibility === 'assigned') await api.adminSetAssignments(saved.id, chosen);
      }, '保存しました')
      .then((ok) => (ok ? onDone() : undefined));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <h2 className="text-lg">{initial ? '動画を編集する' : '新しい動画を登録する'}</h2>

      <Field label="題名" htmlFor="v-title">
        <input id="v-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="肩まわりのストレッチ" />
      </Field>

      <Field label="動画のURL" htmlFor="v-url" hint="YouTube（限定公開）・Vimeo・動画ファイルのURLを貼りつけます。">
        <input id="v-url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} className={inputClass} placeholder="https://youtu.be/..." inputMode="url" autoCapitalize="none" />
      </Field>
      {urlInput.trim() ? (
        parsed ? (
          <Notice tone="success">{PROVIDER_LABELS[parsed.provider]} の動画として読み取りました。</Notice>
        ) : (
          <Notice tone="error">URLを読み取れません。https から始まるURLを貼りつけてください。</Notice>
        )
      ) : null}
      {parsed?.provider === 'youtube' ? (
        <Notice tone="warn">
          YouTube の「限定公開」は、URLを知っている人なら誰でも見られます。会員だけに見せたい動画は、共有先に気をつけてください。
          より厳密に守りたいときは、Vimeo のドメイン制限などをご検討ください。
        </Notice>
      ) : null}

      <Field label="説明（任意）" htmlFor="v-desc">
        <textarea id="v-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="動画の見どころ、行うときの注意など" />
      </Field>

      <Field label="カテゴリー（任意）" htmlFor="v-cat">
        <input id="v-cat" list="v-cats" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} placeholder="ストレッチ" />
        <datalist id="v-cats">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-xs tracking-wider text-muted">見せる相手</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ['all', '全員'],
              ['assigned', '選んだ会員だけ'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={visibility === value}
              onClick={() => setVisibility(value)}
              className={`min-h-12 rounded-xl border text-sm tracking-wider transition-colors ${visibility === value ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-muted hover:border-brass'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      {visibility === 'assigned' ? (
        <Card className="p-4">
          <p className="mb-3 text-xs tracking-wider text-muted">見せる会員（{chosen.length}人）</p>
          {members.length === 0 ? (
            <p className="text-xs text-muted">会員がまだいません。</p>
          ) : (
            <ul className="space-y-1">
              {members.map((m) => (
                <li key={m.id}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                    <input type="checkbox" checked={chosen.includes(m.id)} onChange={() => toggle(m.id)} className="size-5 accent-[#a8894f]" />
                    <span className="min-w-0">
                      <span className="block truncate">{m.displayName || m.email}</span>
                      {m.displayName ? <span className="block truncate text-[11px] text-muted">{m.email}</span> : null}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : null}

      <div className="grid grid-cols-2 items-end gap-4">
        <label className="flex min-h-12 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-5 accent-[#a8894f]" />
          公開する
        </label>
        <Field label="表示順（小さい順）" htmlFor="v-order">
          <input id="v-order" inputMode="numeric" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {!published ? <Notice>「公開する」をオフにすると下書きになり、会員には表示されません。</Notice> : null}

      {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onDone} disabled={submit.busy}>
          キャンセル
        </Button>
        <Button type="submit" className="flex-1" disabled={submit.busy}>
          {submit.busy ? '保存しています…' : '保存する'}
        </Button>
      </div>
    </form>
  );
}
