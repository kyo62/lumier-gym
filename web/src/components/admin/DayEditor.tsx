import { Trash2 } from 'lucide-react';
import { addBlock, addOverride, deleteBlock, deleteOverride } from '@/app/admin/actions';

type OverrideRow = {
  id: string;
  kind: string;
  start_time: string | null;
  end_time: string | null;
  note: string | null;
};

/**
 * 選択した1日の設定パネル。
 * すべて素の <form> + Server Action なので、JavaScriptが無効でも動作する。
 */
export function DayEditor({
  date,
  dateLabel,
  openLabel,
  overrides,
  blocks,
  bookings,
}: {
  date: string;
  dateLabel: string;
  openLabel: string | null;
  overrides: OverrideRow[];
  blocks: { id: string; label: string; reason: string | null }[];
  bookings: { id: string; label: string; name: string; menu: string }[];
}) {
  return (
    <section className="mt-6 rounded-lg border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base">{dateLabel}</h2>
        <p className="text-xs text-muted tnum">
          {openLabel ? `営業 ${openLabel}` : '休業日（この日は予約を受け付けません）'}
        </p>
      </div>

      {/* ---- この日の予約 ---- */}
      {bookings.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-widest text-muted">この日の予約</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {bookings.map((b) => (
              <li key={b.id} className="flex flex-wrap gap-x-3 rounded-md bg-sand px-3 py-2">
                <span className="tnum">{b.label}</span>
                <span>{b.name} 様</span>
                <span className="text-xs text-muted">{b.menu}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---- 現在の臨時設定 ---- */}
      {overrides.length > 0 || blocks.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs tracking-widest text-muted">この日の臨時設定</h3>
          <ul className="mt-2 space-y-1.5 text-sm">
            {overrides.map((o) => (
              <li key={o.id} className="flex items-center gap-3 rounded-md border border-line px-3 py-2">
                <span className="flex-1">
                  {o.kind === 'closed'
                    ? o.start_time
                      ? `休業 ${o.start_time.slice(0, 5)}〜${o.end_time?.slice(0, 5)}`
                      : '終日休業'
                    : `臨時営業 ${o.start_time?.slice(0, 5)}〜${o.end_time?.slice(0, 5)}`}
                  {o.note ? <span className="ml-2 text-xs text-muted">{o.note}</span> : null}
                </span>
                <DeleteButton action={deleteOverride} id={o.id} label="この設定を削除" />
              </li>
            ))}
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center gap-3 rounded-md border border-line px-3 py-2">
                <span className="flex-1 tnum">
                  ブロック {b.label}
                  {b.reason ? <span className="ml-2 text-xs text-muted">{b.reason}</span> : null}
                </span>
                <DeleteButton action={deleteBlock} id={b.id} label="このブロックを削除" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ---- 操作 ---- */}
      <div className="mt-7 grid gap-4 border-t border-line pt-6 sm:grid-cols-2">
        {/* 終日休業 */}
        <form action={addOverride} className="rounded-md border border-line p-4">
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="kind" value="closed" />
          <p className="text-sm">終日休業にする</p>
          <p className="mt-1 text-xs leading-6 text-muted">この日の予約受付をすべて止めます。</p>
          <button type="submit" className="mt-3 w-full rounded-full border border-line py-2.5 text-xs transition-colors hover:border-accent">
            終日休業にする
          </button>
        </form>

        {/* 臨時営業 */}
        <form action={addOverride} className="rounded-md border border-line p-4">
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="kind" value="open" />
          <p className="text-sm">臨時営業を追加</p>
          <p className="mt-1 text-xs leading-6 text-muted">通常は営業日でない日を開けます。</p>
          <div className="mt-3 flex items-center gap-2">
            <TimeInput name="startTime" defaultValue="10:00" />
            <span className="text-xs text-muted">〜</span>
            <TimeInput name="endTime" defaultValue="19:00" />
          </div>
          <button type="submit" className="mt-3 w-full rounded-full border border-line py-2.5 text-xs transition-colors hover:border-accent">
            臨時営業を追加
          </button>
        </form>

        {/* 時間帯の休業 */}
        <form action={addOverride} className="rounded-md border border-line p-4">
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="kind" value="closed" />
          <p className="text-sm">時間帯を休業にする</p>
          <p className="mt-1 text-xs leading-6 text-muted">昼休みや早上がりの設定に。</p>
          <div className="mt-3 flex items-center gap-2">
            <TimeInput name="startTime" defaultValue="12:00" />
            <span className="text-xs text-muted">〜</span>
            <TimeInput name="endTime" defaultValue="13:00" />
          </div>
          <button type="submit" className="mt-3 w-full rounded-full border border-line py-2.5 text-xs transition-colors hover:border-accent">
            この時間を休業にする
          </button>
        </form>

        {/* ブロック */}
        <form action={addBlock} className="rounded-md border border-line p-4">
          <input type="hidden" name="date" value={date} />
          <p className="text-sm">枠をブロックする</p>
          <p className="mt-1 text-xs leading-6 text-muted">私用・移動時間など、理由を残せます。</p>
          <div className="mt-3 flex items-center gap-2">
            <TimeInput name="startTime" defaultValue="15:00" />
            <span className="text-xs text-muted">〜</span>
            <TimeInput name="endTime" defaultValue="16:00" />
          </div>
          <input
            type="text"
            name="reason"
            placeholder="理由（任意）"
            maxLength={200}
            className="mt-2 w-full rounded-md border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button type="submit" className="mt-3 w-full rounded-full border border-line py-2.5 text-xs transition-colors hover:border-accent">
            ブロックする
          </button>
        </form>
      </div>
    </section>
  );
}

function TimeInput({ name, defaultValue }: { name: string; defaultValue: string }) {
  return (
    <input
      type="time"
      name={name}
      defaultValue={defaultValue}
      step={900}
      required
      className="flex-1 rounded-md border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-accent tnum"
    />
  );
}

function DeleteButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" aria-label={label} className="p-1 text-muted transition-colors hover:text-danger">
        <Trash2 size={14} />
      </button>
    </form>
  );
}
