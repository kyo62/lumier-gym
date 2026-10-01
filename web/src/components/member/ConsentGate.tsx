'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/member/api';
import { site } from '@/config/site';
import { Button, Card, Notice, useSubmit } from './ui';
import { useMember } from './MemberApp';

/**
 * 記録ページの入口。記録を書き込む前に、お預かりする情報と閲覧者を伝え、同意をもらう。
 * 同意が済むまでは、DB 側でも記録の書き込みが拒否される（001_member_area.sql の has_consented）。
 * 動画や予約は、同意しなくても使える。
 */
export function ConsentGate({ children }: { children: React.ReactNode }) {
  const { me } = useMember();
  return me.consentedAt ? <>{children}</> : <ConsentCard />;
}

function ConsentCard() {
  const { refresh } = useMember();
  const [agreed, setAgreed] = useState(false);
  const submit = useSubmit();

  return (
    <Card className="space-y-5">
      <div>
        <p className="mb-2 text-[11px] tracking-[0.3em] text-brass uppercase">Before you start</p>
        <h2 className="text-lg">記録をはじめる前に</h2>
        <p className="mt-3 text-xs leading-6 text-muted">
          体組成・食事・トレーニングの記録は、ご自身の振り返りのためのものです。次の内容をご確認ください。
        </p>
      </div>

      <ul className="space-y-3 text-[13px] leading-7">
        <Item title="お預かりする情報">
          体組成（体重・体脂肪率・筋肉量）、食事の内容、トレーニングの内容、それぞれのメモ。
        </Item>
        <Item title="使いみち">
          ご自身の振り返りと、{site.name}の施術者がセッションの内容やご提案を考える際の参考にします。
        </Item>
        <Item title="見られる人">
          あなた自身と、{site.name}の施術者だけです。ほかのお客様には見えません。
        </Item>
        <Item title="入力は任意です">
          すべての項目は、書きたいときに書くものです。無理に入力する必要はありません。
        </Item>
        <Item title="書かないでください">
          病名・診断名・通院歴・服薬など、医療に関わる内容は入力しないでください。
        </Item>
        <Item title="いつでも消せます">
          「設定」から、記録をすべて削除し、同意を取り消せます。
        </Item>
      </ul>

      <p className="text-xs leading-6 text-muted">
        くわしくは
        <Link href="/privacy" className="mx-1 text-brass underline underline-offset-4">
          プライバシーポリシー
        </Link>
        をご覧ください。
      </p>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-canvas px-4 py-3.5">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[#a8894f]"
        />
        <span className="text-[13px] leading-6">上記の内容に同意して、記録をはじめます。</span>
      </label>

      {submit.error ? <Notice tone="error">{submit.error}</Notice> : null}
      <Button
        disabled={!agreed || submit.busy}
        className="w-full"
        onClick={async () => {
          if (await submit.run(() => api.consent(), '')) await refresh();
        }}
      >
        {submit.busy ? '保存しています…' : '同意してはじめる'}
      </Button>
    </Card>
  );
}

function Item({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
      <span>
        <b className="font-medium">{title}</b>
        <br />
        <span className="text-muted">{children}</span>
      </span>
    </li>
  );
}
