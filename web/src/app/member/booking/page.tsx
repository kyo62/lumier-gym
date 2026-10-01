'use client';

import { CalendarCheck } from 'lucide-react';
import { booking } from '@/config/site';
import { Card, PageTitle } from '@/components/member/ui';
import { ReserveButton } from '@/components/site/primitives';

/**
 * 予約は Square の予約ページで行う（決済・リマインドまで一体で動くため、自作しない）。
 * ここは、そこへ送り出す案内のページ。予約URLは site.ts の booking.squareUrl で設定する。
 */
export default function BookingPage() {
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Reservation" title="ご予約" lead="ご予約と変更は、予約ページ（Square）で行います。" />

      <Card className="text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brass-soft text-brass" aria-hidden>
          <CalendarCheck size={26} strokeWidth={1.5} />
        </span>
        <p className="mb-6 text-sm leading-7">空いている日時から、お好きな枠を選んでご予約いただけます。</p>
        <ReserveButton className="w-full">予約ページを開く</ReserveButton>
      </Card>

      <Card>
        <h2 className="mb-3 text-base">キャンセル・変更について</h2>
        <p className="text-sm leading-7 text-muted">{booking.cancelPolicy}</p>
      </Card>

      <Card>
        <h2 className="mb-4 text-base">月額プランのサポート</h2>
        <ul className="space-y-4">
          {booking.support.map((s) => (
            <li key={s.title} className="text-sm leading-7">
              <p className="font-medium">{s.title}</p>
              <p className="text-muted">{s.body}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
