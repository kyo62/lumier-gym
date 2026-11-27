'use client';

import { CalendarCheck } from 'lucide-react';
import { booking } from '@/config/site';
import { Card, PageTitle } from '@/components/member/ui';
import { ReserveButton } from '@/components/site/primitives';

/**
 * 予約は、Square の予約ページ（booking.squareUrl）が設定されていればそちら、なければ LINE・メールへ（ReserveButton が切り替える）。
 */
export default function BookingPage() {
  return (
    <div className="space-y-6">
      <PageTitle eyebrow="Reservation" title="ご予約" lead="ご予約と変更は、こちらからご連絡ください。" />

      <Card>
        <h2 className="mb-2 text-base">空いている日時から予約する</h2>
        <p className="mb-4 text-xs leading-6 text-muted">
          メニューと日時を選んで、そのままご予約いただけます（開始の3時間前まで）。60分は90分枠、30分は45分枠です。
        </p>
        <iframe
          src="https://calendar.google.com/calendar/appointments/AcZssZ08S1QCEZO6b1pZu5Vy7dRAQEuAJCAcVmdFUVs=?gv=true"
          title="TONEKA ご予約カレンダー"
          loading="lazy"
          className="h-[680px] w-full rounded-xl border-0"
        />
      </Card>

      <Card className="text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-brass-soft text-brass" aria-hidden>
          <CalendarCheck size={26} strokeWidth={1.5} />
        </span>
        <p className="mb-6 text-sm leading-7">開始の3時間を過ぎたご予約や、変更・キャンセルは、LINEでお知らせください。</p>
        <ReserveButton className="w-full">ご予約はこちら</ReserveButton>
      </Card>

      <Card>
        <h2 className="mb-3 text-base">キャンセル・変更について</h2>
        <p className="text-sm leading-7 text-muted">{booking.cancelPolicy}</p>
      </Card>

      <Card>
        <h2 className="mb-4 text-base">回数券について</h2>
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
