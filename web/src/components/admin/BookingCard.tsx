'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { saveBookingMemo, updateBookingStatus } from '@/app/admin/actions';
import { cn } from '@/lib/utils';

export type BookingRow = {
  id: string;
  menu_name: string;
  menu_price: number;
  menu_duration_min: number;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_kana: string | null;
  phone: string;
  email: string;
  concern: string | null;
  note: string | null;
  status: 'confirmed' | 'cancelled' | 'done';
  admin_memo: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<BookingRow['status'], string> = {
  confirmed: '予約済み',
  done: '来店済み',
  cancelled: 'キャンセル',
};

/**
 * 予約1件のカード。
 * 氏名・電話・お悩みは折りたたみの中に置く（画面を人に見られる場面を考慮）。
 */
export function BookingCard({
  booking,
  timeLabel,
  priceLabel,
}: {
  booking: BookingRow;
  timeLabel: string;
  priceLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <span className="font-serif text-lg tnum">{timeLabel}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{booking.customer_name} 様</span>
          <span className="block truncate text-xs text-muted">
            {booking.menu_name}（{booking.menu_duration_min}分 / {priceLabel}）
          </span>
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[10px] tracking-wider',
            booking.status === 'confirmed' && 'bg-accent-soft text-accent',
            booking.status === 'done' && 'bg-sand text-muted',
            booking.status === 'cancelled' && 'bg-danger/10 text-danger'
          )}
        >
          {STATUS_LABEL[booking.status]}
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div className="space-y-5 border-t border-line p-5 text-sm">
          <dl className="space-y-2">
            {booking.customer_kana ? (
              <Row label="ふりがな">{booking.customer_kana}</Row>
            ) : null}
            <Row label="電話">
              <a href={`tel:${booking.phone}`} className="text-accent underline underline-offset-4">
                {booking.phone}
              </a>
            </Row>
            <Row label="メール">
              <a href={`mailto:${booking.email}`} className="break-all text-accent underline underline-offset-4">
                {booking.email}
              </a>
            </Row>
          </dl>

          <div>
            <p className="text-xs text-muted">現在の身体のお悩み</p>
            <p className="mt-1.5 whitespace-pre-wrap leading-7">{booking.concern || '（記載なし）'}</p>
          </div>

          {booking.note ? (
            <div>
              <p className="text-xs text-muted">ご要望・連絡事項</p>
              <p className="mt-1.5 whitespace-pre-wrap leading-7">{booking.note}</p>
            </div>
          ) : null}

          <form action={saveBookingMemo}>
            <input type="hidden" name="id" value={booking.id} />
            <label className="block text-xs text-muted" htmlFor={`memo-${booking.id}`}>
              施術メモ（お客様には表示されません）
            </label>
            <textarea
              id={`memo-${booking.id}`}
              name="memo"
              rows={3}
              defaultValue={booking.admin_memo ?? ''}
              className="mt-1.5 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm leading-7 outline-none focus:border-accent"
            />
            <button type="submit" className="mt-2 rounded-full border border-line px-4 py-2 text-xs transition-colors hover:border-accent">
              メモを保存
            </button>
          </form>

          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            {booking.status !== 'done' ? (
              <StatusButton id={booking.id} status="done" label="来店済みにする" />
            ) : null}
            {booking.status !== 'confirmed' ? (
              <StatusButton id={booking.id} status="confirmed" label="予約済みに戻す" />
            ) : null}
            {booking.status !== 'cancelled' ? (
              <StatusButton id={booking.id} status="cancelled" label="キャンセルにする" danger />
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-20 shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function StatusButton({
  id,
  status,
  label,
  danger,
}: {
  id: string;
  status: BookingRow['status'];
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={updateBookingStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={cn(
          'rounded-full border px-4 py-2 text-xs transition-colors',
          danger ? 'border-danger/40 text-danger hover:bg-danger/5' : 'border-line hover:border-accent'
        )}
      >
        {label}
      </button>
    </form>
  );
}
