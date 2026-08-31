import { Trash2 } from 'lucide-react';
import { addBusinessHour, deleteBusinessHour } from '@/app/admin/actions';
import { WEEKDAY_LABELS } from '@/config/site';

type Row = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
};

/** 定期営業日テンプレート（毎週の営業曜日と時間帯）の編集 */
export function BusinessHoursEditor({ rows }: { rows: Row[] }) {
  return (
    <section className="mt-10 rounded-lg border border-line bg-surface p-5 sm:p-7">
      <h2 className="text-base">定期営業日</h2>
      <p className="mt-2 text-xs leading-6 text-muted">
        毎週くり返す営業曜日と時間帯です。特定の日だけ変えたいときは、上のカレンダーから設定してください。
      </p>

      {rows.length === 0 ? (
        <p className="mt-5 rounded-md border border-dashed border-line px-4 py-5 text-center text-xs text-muted">
          定期営業日が未設定です。予約を受け付けるには、下のフォームから追加してください。
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 rounded-md border border-line px-4 py-3 text-sm">
              <span className="w-10 shrink-0 text-center">{WEEKDAY_LABELS[row.weekday]}曜</span>
              <span className="flex-1 tnum">
                {row.start_time.slice(0, 5)}〜{row.end_time.slice(0, 5)}
              </span>
              <form action={deleteBusinessHour}>
                <input type="hidden" name="id" value={row.id} />
                <button type="submit" aria-label="この営業日を削除" className="p-1 text-muted transition-colors hover:text-danger">
                  <Trash2 size={14} />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={addBusinessHour} className="mt-6 flex flex-wrap items-end gap-3 border-t border-line pt-6">
        <label className="text-xs text-muted">
          曜日
          <select
            name="weekday"
            defaultValue="2"
            className="mt-1.5 block rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent"
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}曜
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-muted">
          開始
          <input
            type="time"
            name="startTime"
            defaultValue="10:00"
            step={900}
            required
            className="mt-1.5 block rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent tnum"
          />
        </label>

        <label className="text-xs text-muted">
          終了
          <input
            type="time"
            name="endTime"
            defaultValue="19:00"
            step={900}
            required
            className="mt-1.5 block rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink outline-none focus:border-accent tnum"
          />
        </label>

        <button type="submit" className="rounded-full border border-line px-5 py-2.5 text-xs transition-colors hover:border-accent">
          追加する
        </button>
      </form>
    </section>
  );
}
