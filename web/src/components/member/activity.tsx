'use client';

import { cn } from '@/lib/utils';
import { formatDateJa } from '@/lib/member/dates';
import { ACTIVITY_KIND_LABELS, type ActivityLog } from '@/lib/member/types';

/** 自主トレの1件。施術者のコメントを、下に並べる */
export function ActivityCard({
  log,
  freshIds,
  actions,
  children,
}: {
  log: ActivityLog;
  /** 「新着」の印をつけるコメントのID */
  freshIds?: ReadonlySet<string>;
  /** 右上に置く操作（削除ボタンなど） */
  actions?: React.ReactNode;
  /** コメントの下に置くもの（施術者のコメント入力欄など） */
  children?: React.ReactNode;
}) {
  const detail = [ACTIVITY_KIND_LABELS[log.kind], log.minutes !== null ? `${log.minutes}分` : null].filter(Boolean).join('・');
  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] tracking-wider text-muted">{formatDateJa(log.loggedOn)}</p>
          <p className="mt-0.5 text-sm font-medium">{detail}</p>
          {log.note ? <p className="mt-1.5 text-sm leading-7 whitespace-pre-wrap text-ink/90">{log.note}</p> : null}
        </div>
        {actions}
      </div>

      {log.comments.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-line pt-3">
          {log.comments.map((c) => (
            <li key={c.id} className="rounded-xl bg-brass-soft/50 px-3.5 py-3">
              <p className="mb-1 flex items-center gap-2 text-[10px] tracking-wider text-brass">
                TONEKA より
                {freshIds?.has(c.id) ? (
                  <span className={cn('rounded-full bg-brass px-2 py-0.5 text-[9px] text-canvas')}>新着</span>
                ) : null}
              </p>
              <p className="text-sm leading-7 whitespace-pre-wrap">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {children}
    </li>
  );
}
