'use client';

import { Share, SquarePlus, EllipsisVertical } from 'lucide-react';
import { useStandalone } from './useStandalone';
import { Card } from './ui';

/** 「ホーム画面に追加」の案内。すでにアプリとして開いているときは出さない（alwaysShow で設定画面には常に出す） */
export function InstallGuide({ alwaysShow = false }: { alwaysShow?: boolean }) {
  const standalone = useStandalone();
  if (standalone && !alwaysShow) return null;

  return (
    <Card>
      <p className="mb-2 text-[11px] tracking-[0.3em] text-brass uppercase">App</p>
      <h2 className="text-base">ホーム画面に追加すると、アプリのように使えます</h2>
      <p className="mt-2 text-xs leading-6 text-muted">
        ホーム画面のアイコンから、すぐに開けます。追加は無料で、いつでも外せます。
        {standalone ? '（いまはアプリとして開いています）' : ''}
      </p>

      <div className="mt-5 space-y-4 text-[13px] leading-7">
        <div>
          <p className="font-medium">iPhone（Safari）</p>
          <ol className="mt-1 space-y-1 text-muted">
            <li className="flex items-center gap-2">
              1. 画面下の <Share size={15} aria-label="共有" className="inline shrink-0" /> 共有ボタンをタップ
            </li>
            <li className="flex items-center gap-2">
              2. <SquarePlus size={15} aria-label="追加" className="inline shrink-0" /> 「ホーム画面に追加」を選ぶ
            </li>
            <li>3. 右上の「追加」をタップ</li>
          </ol>
        </div>
        <div>
          <p className="font-medium">Android（Chrome）</p>
          <ol className="mt-1 space-y-1 text-muted">
            <li className="flex items-center gap-2">
              1. 右上の <EllipsisVertical size={15} aria-label="メニュー" className="inline shrink-0" /> メニューをタップ
            </li>
            <li>2. 「ホーム画面に追加」または「アプリをインストール」を選ぶ</li>
          </ol>
        </div>
      </div>
    </Card>
  );
}
