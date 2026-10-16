'use client';

import { useState } from 'react';
import { api } from '@/lib/member/api';
import { parseComment } from '@/lib/member/inputs';
import { ActivityCard } from '@/components/member/activity';
import { useMember } from '@/components/member/MemberApp';
import { Button, EmptyState, Loading, Notice, PageTitle, inputClass, useAsync, useSubmit } from '@/components/member/ui';

/** 表現チェック：効果の断定・医療的な言い方（CLAUDE.md の表現ルール）。入っていたら、送る前に知らせる */
const NG_WORDS = ['治る', '治ります', '治療', '矯正', '改善します', '完治', '診断', '必ず'];

export default function AdminActivityPage() {
  const { me } = useMember();
  const { data, error, loading, reload } = useAsync(api.adminListActivities);
  const [onlyNew, setOnlyNew] = useState(true);

  if (!me.isAdmin) return <EmptyState title="このページは、施術者だけが開けます" />;
  if (loading) return <Loading />;
  if (error || !data) return <Notice tone="error">{error ?? '読み込めませんでした。'}</Notice>;

  const shown = onlyNew ? data.filter((l) => l.comments.length === 0) : data;

  return (
    <div className="space-y-6">
      <PageTitle
        eyebrow="Comment"
        title="自主トレへのコメント"
        lead="会員の自主トレの記録に、コメントを送ります。お客様からの返信欄はありません（返事のプレッシャーをなくすため）。"
      />
      <div className="flex gap-2 text-xs">
        {[
          { v: true, label: 'コメントがまだない記録' },
          { v: false, label: 'すべて' },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            onClick={() => setOnlyNew(o.v)}
            aria-pressed={onlyNew === o.v}
            className={`min-h-9 rounded-full border px-4 ${onlyNew === o.v ? 'border-ink bg-ink text-canvas' : 'border-line bg-surface text-muted'}`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState title={onlyNew ? 'コメントがまだない記録は、ありません' : 'まだ記録がありません'} />
      ) : (
        <ul className="space-y-3">
          {shown.map((log) => (
            <ActivityCard key={log.id} log={log}>
              <p className="mt-3 text-[11px] tracking-wider text-muted">{log.memberName} さん</p>
              <CommentForm logId={log.id} onSent={reload} />
            </ActivityCard>
          ))}
        </ul>
      )}
    </div>
  );
}

function CommentForm({ logId, onSent }: { logId: string; onSent: () => void }) {
  const [text, setText] = useState('');
  const submit = useSubmit();
  const hits = NG_WORDS.filter((w) => text.includes(w));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseComment(text);
    if (!parsed.ok) {
      submit.setError(parsed.error);
      return;
    }
    const ok = await submit.run(async () => {
      await api.adminAddComment(logId, parsed.value);
    });
    if (ok) {
      setText('');
      onSent();
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-2 space-y-2" noValidate>
      <label htmlFor={`cm-${logId}`} className="sr-only">
        コメント
      </label>
      <textarea
        id={`cm-${logId}`}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className={inputClass}
        placeholder="例：続けられていて素敵です。無理のない範囲で、また教えてくださいね。"
      />
      {hits.length > 0 ? (
        <Notice tone="warn">
          「{hits.join('」「')}」が入っています。効果を断定する言い方は避けて、「動きやすさのサポート」などに直してください。
        </Notice>
      ) : null}
      {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
      <Button type="submit" disabled={submit.busy} className="min-h-10 w-full text-xs">
        {submit.busy ? '送っています…' : 'コメントを送る'}
      </Button>
    </form>
  );
}
