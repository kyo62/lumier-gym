import { isValidDateString } from './dates.ts';
import type { BodyInput, MealInput, MealType, WorkoutInput } from './types.ts';
import { MEAL_TYPES } from './types.ts';

/**
 * フォームの入力を、保存できる形に整える。
 * 範囲は DB 側の制約（001_member_area.sql）と同じにしてある。
 * どちらか一方だけだと、画面では通ったのに保存で失敗する、といったずれが起きる。
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

/** 空欄なら null、数字でなければ NaN 扱いのエラー、範囲外もエラー */
function readNumber(
  raw: string,
  label: string,
  min: number,
  max: number,
  options: { integer?: boolean } = {}
): Result<number | null> {
  // 全角の数字・小数点・マイナスも受け付ける（スマホの日本語入力で起きやすい）
  const normalized = raw
    .trim()
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .replace(/[，,]/g, '');
  if (normalized === '') return { ok: true, value: null };
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return fail(`${label}は数字で入力してください。`);
  const n = Number(normalized);
  if (options.integer && !Number.isInteger(n)) return fail(`${label}は整数で入力してください。`);
  if (n < min || n > max) return fail(`${label}は${min}〜${max}の範囲で入力してください。`);
  return { ok: true, value: n };
}

function readDate(raw: string): Result<string> {
  return isValidDateString(raw) ? { ok: true, value: raw } : fail('日付を確認してください。');
}

function readText(raw: string, label: string, max: number, required: boolean): Result<string> {
  const t = raw.trim();
  if (required && t === '') return fail(`${label}を入力してください。`);
  if ([...t].length > max) return fail(`${label}は${max}文字以内で入力してください。`);
  return { ok: true, value: t };
}

export function parseBodyForm(f: {
  loggedOn: string;
  weightKg: string;
  bodyFatPct: string;
  muscleKg: string;
  note: string;
}): Result<BodyInput> {
  const date = readDate(f.loggedOn);
  if (!date.ok) return date;
  const weight = readNumber(f.weightKg, '体重', 20, 300);
  if (!weight.ok) return weight;
  const fat = readNumber(f.bodyFatPct, '体脂肪率', 1, 80);
  if (!fat.ok) return fat;
  const muscle = readNumber(f.muscleKg, '筋肉量', 5, 200);
  if (!muscle.ok) return muscle;
  const note = readText(f.note, 'メモ', 500, false);
  if (!note.ok) return note;

  if (weight.value === null && fat.value === null && muscle.value === null) {
    return fail('体重・体脂肪率・筋肉量のうち、どれか1つは入力してください。');
  }
  return {
    ok: true,
    value: {
      loggedOn: date.value,
      weightKg: weight.value,
      bodyFatPct: fat.value,
      muscleKg: muscle.value,
      note: note.value,
    },
  };
}

export function parseMealForm(f: {
  loggedOn: string;
  mealType: string;
  content: string;
  note: string;
}): Result<MealInput> {
  const date = readDate(f.loggedOn);
  if (!date.ok) return date;
  if (!MEAL_TYPES.includes(f.mealType as MealType)) return fail('食事の種類を選んでください。');
  const content = readText(f.content, '食べたもの', 500, true);
  if (!content.ok) return content;
  const note = readText(f.note, 'メモ', 500, false);
  if (!note.ok) return note;
  return {
    ok: true,
    value: { loggedOn: date.value, mealType: f.mealType as MealType, content: content.value, note: note.value },
  };
}

export function parseWorkoutForm(f: {
  loggedOn: string;
  exercise: string;
  weightKg: string;
  reps: string;
  sets: string;
  note: string;
}): Result<WorkoutInput> {
  const date = readDate(f.loggedOn);
  if (!date.ok) return date;
  const exercise = readText(f.exercise, '種目', 60, true);
  if (!exercise.ok) return exercise;
  const weight = readNumber(f.weightKg, '重さ', 0, 1000);
  if (!weight.ok) return weight;
  const reps = readNumber(f.reps, '回数', 1, 1000, { integer: true });
  if (!reps.ok) return reps;
  const sets = readNumber(f.sets, 'セット数', 1, 100, { integer: true });
  if (!sets.ok) return sets;
  const note = readText(f.note, 'メモ', 500, false);
  if (!note.ok) return note;
  return {
    ok: true,
    value: {
      loggedOn: date.value,
      exercise: exercise.value,
      weightKg: weight.value,
      reps: reps.value,
      sets: sets.value,
      note: note.value,
    },
  };
}

/** 施術者が動画を登録するときの入力 */
export function parseDisplayName(raw: string): Result<string> {
  return readText(raw, 'お名前', 40, false);
}

export function isPlausibleEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}

/** ログイン用コード（6〜10桁の数字。Supabase の設定で桁数が変わるため幅を持たせる） */
export function normalizeCode(raw: string): string | null {
  const code = raw.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\s/g, '');
  return /^\d{6,10}$/.test(code) ? code : null;
}
