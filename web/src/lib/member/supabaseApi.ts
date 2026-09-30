import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BodyInput, BodyLog, MealInput, MealLog, MealType, MemberApi, MemberLogs, MemberSummary, Me,
  Video, VideoInput, VideoProvider, VideoVisibility, WorkoutInput, WorkoutLog,
} from './types.ts';

/**
 * 本番用のデータ層（Supabase）。
 *
 * アクセス制御はここではなく、データベース側（supabase/migrations の RLS）が本体。
 * ブラウザに置く anon キーは公開されて構わない設計で、
 * RLS がなければ誰でも読めてしまう。だから、テーブルを作るときは必ず
 * 001_member_area.sql を先に実行すること。
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let clientPromise: Promise<SupabaseClient> | null = null;

/** ブラウザでだけ、初めて必要になったときに読み込む（静的書き出しでも安全） */
function getClient(): Promise<SupabaseClient> {
  clientPromise ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // ログインはコード入力で行うので、URL からのセッション取得は使わない
        detectSessionInUrl: false,
      },
    })
  );
  return clientPromise;
}

/* ---- エラーをやさしい日本語にする ---------------------------------------- */

type SbError = { message?: string; code?: string; status?: number } | null;

function friendly(error: NonNullable<SbError>): string {
  if (error.code === '42501') return 'この操作を行う権限がありません。';
  if (error.code === 'PGRST301' || /jwt/i.test(error.message ?? ''))
    return 'ログインの有効期限が切れました。もう一度ログインしてください。';
  if (error.code === '23514') return '入力内容が範囲外です。内容を確認してください。';
  return '保存できませんでした。通信状況をご確認のうえ、もう一度お試しください。';
}

function unwrap<T>({ data, error }: { data: T | null; error: SbError }): T {
  if (error) {
    console.error('[member]', error);
    throw new Error(friendly(error));
  }
  return data as T;
}
function check({ error }: { error: SbError }) {
  if (error) {
    console.error('[member]', error);
    throw new Error(friendly(error));
  }
}

async function sessionUserId(sb: SupabaseClient): Promise<string> {
  const { data } = await sb.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('ログインしてください。');
  return id;
}

/* ---- 行 → 画面用の型 ------------------------------------------------------ */

type Row = Record<string, unknown>;
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

const toBody = (r: Row): BodyLog => ({
  id: str(r.id), loggedOn: str(r.logged_on), weightKg: num(r.weight_kg),
  bodyFatPct: num(r.body_fat_pct), muscleKg: num(r.muscle_kg), note: str(r.note),
});
const toMeal = (r: Row): MealLog => ({
  id: str(r.id), loggedOn: str(r.logged_on), mealType: str(r.meal_type) as MealType,
  content: str(r.content), note: str(r.note),
});
const toWorkout = (r: Row): WorkoutLog => ({
  id: str(r.id), loggedOn: str(r.logged_on), exercise: str(r.exercise),
  weightKg: num(r.weight_kg), reps: num(r.reps), sets: num(r.sets), note: str(r.note),
});
const toVideo = (r: Row): Video => ({
  id: str(r.id), title: str(r.title), description: str(r.description), category: str(r.category),
  provider: str(r.provider) as VideoProvider, videoRef: str(r.video_ref),
  visibility: str(r.visibility) as VideoVisibility, published: r.published === true,
  sortOrder: Number(r.sort_order ?? 0), createdAt: str(r.created_at),
});

const NEWEST_FIRST = { ascending: false } as const;
const LIMIT = 1000;

async function listLogs<T>(table: string, map: (r: Row) => T, userId?: string): Promise<T[]> {
  const sb = await getClient();
  let q = sb.from(table).select('*');
  if (userId) q = q.eq('user_id', userId);
  const rows = unwrap(await q.order('logged_on', NEWEST_FIRST).order('created_at', NEWEST_FIRST).limit(LIMIT));
  return (rows as Row[]).map(map);
}

/** 「空文字」ではなく null を保存する（DB の制約と、表示の両方でその方が扱いやすい） */
const orNull = (s: string) => (s === '' ? null : s);

/* ---- 実装 ----------------------------------------------------------------- */

export const supabaseApi: MemberApi = {
  mode: 'supabase',

  async getMe() {
    const sb = await getClient();
    const { data } = await sb.auth.getSession();
    const session = data.session;
    if (!session) return null;
    const row = unwrap(
      await sb.from('profiles').select('id, email, display_name, is_admin, consented_at').eq('id', session.user.id).maybeSingle()
    ) as Row | null;
    if (!row) throw new Error('アカウントの準備ができていません。サロンにご連絡ください。');
    const me: Me = {
      id: str(row.id),
      email: str(row.email) || session.user.email || '',
      displayName: str(row.display_name),
      isAdmin: row.is_admin === true,
      consentedAt: typeof row.consented_at === 'string' ? row.consented_at : null,
    };
    return me;
  },

  async requestCode(email) {
    const sb = await getClient();
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // 会員は施術者が作成する。ここで勝手にアカウントを作らせない
      options: { shouldCreateUser: false },
    });
    if (!error) return;
    if (error.status === 429 || /rate limit/i.test(error.message)) {
      throw new Error('メールの送信回数が上限に達しました。しばらくしてからお試しください。');
    }
    // 未登録のメールアドレスであることは、画面に出さない（会員かどうかが分かってしまうため）
    if (/signups? not allowed|user.*not found/i.test(error.message)) return;
    console.error('[member]', error);
    throw new Error('コードを送れませんでした。通信状況をご確認のうえ、もう一度お試しください。');
  },

  async verifyCode(email, code) {
    const sb = await getClient();
    const { error } = await sb.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' });
    if (error) throw new Error('コードが正しくないか、有効期限が切れています。');
  },

  async signOut() {
    const sb = await getClient();
    await sb.auth.signOut();
  },

  onAuthChange(callback) {
    let cancelled = false;
    let unsubscribe = () => {};
    void getClient().then((sb) => {
      if (cancelled) return;
      const { data } = sb.auth.onAuthStateChange((event) => {
        // 起動時と定期更新では、再取得しない
        if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
        // コールバックの中で Supabase を呼ぶと詰まることがあるため、1拍おく
        setTimeout(callback, 0);
      });
      unsubscribe = () => data.subscription.unsubscribe();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  },

  async consent() {
    const sb = await getClient();
    const id = await sessionUserId(sb);
    check(await sb.from('profiles').update({ consented_at: new Date().toISOString() }).eq('id', id));
  },

  async withdrawConsent() {
    const sb = await getClient();
    const id = await sessionUserId(sb);
    check(await sb.from('profiles').update({ consented_at: null }).eq('id', id));
  },

  async updateDisplayName(name) {
    const sb = await getClient();
    const id = await sessionUserId(sb);
    check(await sb.from('profiles').update({ display_name: orNull(name) }).eq('id', id));
  },

  /* --- 体組成 --- */
  listBody: () => listLogs('body_logs', toBody),
  async addBody(i: BodyInput) {
    const sb = await getClient();
    check(await sb.from('body_logs').insert({
      logged_on: i.loggedOn, weight_kg: i.weightKg, body_fat_pct: i.bodyFatPct,
      muscle_kg: i.muscleKg, note: orNull(i.note),
    }));
  },
  async deleteBody(id) {
    const sb = await getClient();
    check(await sb.from('body_logs').delete().eq('id', id));
  },

  /* --- 食事 --- */
  listMeals: () => listLogs('meal_logs', toMeal),
  async addMeal(i: MealInput) {
    const sb = await getClient();
    check(await sb.from('meal_logs').insert({
      logged_on: i.loggedOn, meal_type: i.mealType, content: i.content, note: orNull(i.note),
    }));
  },
  async deleteMeal(id) {
    const sb = await getClient();
    check(await sb.from('meal_logs').delete().eq('id', id));
  },

  /* --- トレーニング --- */
  listWorkouts: () => listLogs('workout_logs', toWorkout),
  async addWorkout(i: WorkoutInput) {
    const sb = await getClient();
    check(await sb.from('workout_logs').insert({
      logged_on: i.loggedOn, exercise: i.exercise, weight_kg: i.weightKg,
      reps: i.reps, sets: i.sets, note: orNull(i.note),
    }));
  },
  async deleteWorkout(id) {
    const sb = await getClient();
    check(await sb.from('workout_logs').delete().eq('id', id));
  },

  async deleteAllMyLogs() {
    const sb = await getClient();
    const id = await sessionUserId(sb);
    // 施術者にも他人の記録は見えるが、削除できるのは自分のものだけ（RLS）。念のため user_id も指定する
    for (const table of ['body_logs', 'meal_logs', 'workout_logs']) {
      check(await sb.from(table).delete().eq('user_id', id));
    }
  },

  /* --- 動画 --- */
  async listVideos() {
    const sb = await getClient();
    const id = await sessionUserId(sb);
    const rows = unwrap(
      await sb.from('videos').select('*').eq('published', true).order('sort_order').order('created_at', NEWEST_FIRST)
    ) as Row[];
    const mine = new Set(
      (unwrap(await sb.from('video_assignments').select('video_id').eq('user_id', id)) as Row[]).map((r) => str(r.video_id))
    );
    // 施術者にはすべての動画が見えるが、会員画面では会員と同じ見え方にそろえる
    return rows.map(toVideo).filter((v) => v.visibility === 'all' || mine.has(v.id));
  },
  async getVideo(id) {
    return (await supabaseApi.listVideos()).find((v) => v.id === id) ?? null;
  },

  /* --- 施術者 --- */
  async adminListVideos() {
    const sb = await getClient();
    const rows = unwrap(await sb.from('videos').select('*').order('sort_order').order('created_at', NEWEST_FIRST)) as Row[];
    return rows.map(toVideo);
  },
  async adminSaveVideo(input: VideoInput) {
    const sb = await getClient();
    const payload = {
      title: input.title, description: orNull(input.description), category: orNull(input.category),
      provider: input.provider, video_ref: input.videoRef, visibility: input.visibility,
      published: input.published, sort_order: input.sortOrder,
    };
    const query = input.id
      ? sb.from('videos').update(payload).eq('id', input.id)
      : sb.from('videos').insert(payload);
    return toVideo(unwrap(await query.select().single()) as Row);
  },
  async adminDeleteVideo(id) {
    const sb = await getClient();
    check(await sb.from('videos').delete().eq('id', id));
  },
  async adminGetAssignments(videoId) {
    const sb = await getClient();
    const rows = unwrap(await sb.from('video_assignments').select('user_id').eq('video_id', videoId)) as Row[];
    return rows.map((r) => str(r.user_id));
  },
  async adminSetAssignments(videoId, userIds) {
    const sb = await getClient();
    const want = new Set(userIds);
    const have = new Set(await supabaseApi.adminGetAssignments(videoId));
    const remove = [...have].filter((u) => !want.has(u));
    const add = [...want].filter((u) => !have.has(u));
    if (remove.length) check(await sb.from('video_assignments').delete().eq('video_id', videoId).in('user_id', remove));
    if (add.length) check(await sb.from('video_assignments').insert(add.map((user_id) => ({ video_id: videoId, user_id }))));
  },
  async adminListMembers() {
    const sb = await getClient();
    const rows = unwrap(
      await sb.from('profiles').select('id, email, display_name, consented_at').eq('is_admin', false).order('email')
    ) as Row[];
    const list: MemberSummary[] = rows.map((r) => ({
      id: str(r.id), email: str(r.email), displayName: str(r.display_name),
      consentedAt: typeof r.consented_at === 'string' ? r.consented_at : null,
    }));
    return list;
  },
  async adminGetMemberLogs(userId) {
    const [body, meals, workouts] = await Promise.all([
      listLogs('body_logs', toBody, userId),
      listLogs('meal_logs', toMeal, userId),
      listLogs('workout_logs', toWorkout, userId),
    ]);
    const logs: MemberLogs = { body, meals, workouts };
    return logs;
  },
};
