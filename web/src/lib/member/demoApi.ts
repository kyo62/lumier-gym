import type {
  BodyInput, BodyLog, MealInput, MealLog, MemberApi, MemberLogs, MemberSummary, Me,
  Video, VideoInput, WorkoutInput, WorkoutLog,
} from './types.ts';
import { toDateString } from './dates.ts';

/**
 * デモ用のデータ層。Supabase の設定がなくても、会員ページを触れるようにする。
 *
 * ・データはこの端末のブラウザ（localStorage）にだけ保存される。どこにも送信されない
 * ・ログイン用コードは、どのメールアドレスでも「123456」
 * ・メールアドレスが admin で始まると、施術者（管理者）として入れる
 */

export const DEMO_CODE = '123456';
const STORAGE_KEY = 'toneka-member-demo-v1';

type Owned = { userId: string; createdAt: string };
type DemoUser = { id: string; email: string; displayName: string; isAdmin: boolean; consentedAt: string | null };
type Db = {
  session: string | null;
  users: Record<string, DemoUser>;
  body: (BodyLog & Owned)[];
  meals: (MealLog & Owned)[];
  workouts: (WorkoutLog & Owned)[];
  videos: Video[];
  assignments: { videoId: string; userId: string }[];
};

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateString(d);
};

/** 初期データ：施術者が見たときに画面が空にならないよう、サンプルの会員を2人置く */
function seed(): Db {
  const now = new Date().toISOString();
  const m1 = 'demo-member-1';
  const m2 = 'demo-member-2';
  const users: Record<string, DemoUser> = {
    [m1]: { id: m1, email: 'sato@example.com', displayName: '佐藤 みどり（サンプル）', isAdmin: false, consentedAt: now },
    [m2]: { id: m2, email: 'tanaka@example.com', displayName: '田中 さくら（サンプル）', isAdmin: false, consentedAt: now },
  };
  const body = [
    { weightKg: 56.4, bodyFatPct: 27.1, muscleKg: 37.2, ago: 28 },
    { weightKg: 56.0, bodyFatPct: 26.8, muscleKg: 37.3, ago: 21 },
    { weightKg: 55.7, bodyFatPct: 26.5, muscleKg: 37.5, ago: 14 },
    { weightKg: 55.6, bodyFatPct: 26.2, muscleKg: 37.6, ago: 7 },
  ].map((b) => ({
    id: newId(), userId: m1, createdAt: now, loggedOn: daysAgo(b.ago),
    weightKg: b.weightKg, bodyFatPct: b.bodyFatPct, muscleKg: b.muscleKg, note: '',
  }));
  const meals = [
    { mealType: 'breakfast' as const, content: 'ごはん、味噌汁、卵焼き', ago: 1 },
    { mealType: 'lunch' as const, content: 'サラダチキンとおにぎり', ago: 1 },
    { mealType: 'dinner' as const, content: '焼き魚、煮物、ごはん', ago: 1 },
  ].map((m) => ({ id: newId(), userId: m1, createdAt: now, loggedOn: daysAgo(m.ago), mealType: m.mealType, content: m.content, note: '' }));
  const workouts = [
    { exercise: 'スクワット', weightKg: 20, reps: 10, sets: 3, ago: 2 },
    { exercise: 'ヒップリフト', weightKg: null, reps: 15, sets: 3, ago: 2 },
  ].map((w) => ({ id: newId(), userId: m1, createdAt: now, loggedOn: daysAgo(w.ago), exercise: w.exercise, weightKg: w.weightKg, reps: w.reps, sets: w.sets, note: '' }));

  const video = (i: number, v: Partial<Video> & Pick<Video, 'title'>): Video => ({
    id: `demo-video-${i}`, description: '', category: '', provider: 'youtube', videoRef: `DEMO_VIDEO${i}`,
    visibility: 'all', published: true, sortOrder: i, createdAt: now, ...v,
  });
  return {
    session: null,
    users,
    body,
    meals,
    workouts,
    videos: [
      video(1, { title: '呼吸のリセット（3分）', category: '呼吸', description: '仰向けで行う、ゆっくりした呼吸の練習です。息を吐くときに、肋骨がゆっくり下がるのを感じてみてください。' }),
      video(2, { title: '肩まわりのストレッチ', category: 'ストレッチ', visibility: 'assigned', description: 'セッションでお伝えした肩まわりの動きの復習です。痛みを感じる手前で止めてください。' }),
      video(3, { title: '股関節まわりを動かす', category: 'ストレッチ', description: '座ったままできる、股関節まわりの動きです。' }),
      video(4, { title: '（下書き）背中の動き', category: 'ストレッチ', published: false }),
    ],
    assignments: [],
  };
}

/* ---- 保存と読み込み -------------------------------------------------------- */

let memory: Db | null = null;

function hasStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

function load(): Db {
  if (hasStorage()) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Db;
    } catch {
      /* 壊れていたら作り直す */
    }
    const fresh = seed();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    return fresh;
  }
  return (memory ??= seed());
}

function save(db: Db) {
  if (hasStorage()) localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  else memory = db;
}

/** 読み込んで、変更して、保存する */
function mutate<T>(fn: (db: Db) => T): T {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((cb) => cb());

/** テスト用：状態を初期化する */
export function resetDemoData() {
  memory = null;
  if (hasStorage()) localStorage.removeItem(STORAGE_KEY);
}

/* ---- 共通の並び順 ---------------------------------------------------------- */

const byNewest = <T extends { loggedOn: string; createdAt: string }>(a: T, b: T) =>
  a.loggedOn < b.loggedOn ? 1 : a.loggedOn > b.loggedOn ? -1 : a.createdAt < b.createdAt ? 1 : -1;

/** 保存用の付帯情報（持ち主・作成日時）を外して、画面に返す形にする */
const strip = <T extends Owned>(row: T): Omit<T, keyof Owned> => {
  const { userId, createdAt, ...rest } = row;
  void userId;
  void createdAt;
  return rest;
};

function currentUser(db: Db): DemoUser {
  const user = db.session ? db.users[db.session] : undefined;
  if (!user) throw new Error('ログインしてください。');
  return user;
}
function requireAdmin(db: Db): DemoUser {
  const user = currentUser(db);
  if (!user.isAdmin) throw new Error('この操作を行う権限がありません。');
  return user;
}
function requireConsent(db: Db): DemoUser {
  const user = currentUser(db);
  if (!user.consentedAt) throw new Error('先に、ご利用への同意が必要です。');
  return user;
}

/** 会員に見える動画（公開中で、全員向け or 自分に割り当て） */
function visibleVideos(db: Db, userId: string): Video[] {
  const mine = new Set(db.assignments.filter((a) => a.userId === userId).map((a) => a.videoId));
  return db.videos
    .filter((v) => v.published && (v.visibility === 'all' || mine.has(v.id)))
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.createdAt < b.createdAt ? 1 : -1));
}

/* ---- 実装 ------------------------------------------------------------------ */

export const demoApi: MemberApi = {
  mode: 'demo',

  async getMe() {
    const db = load();
    const u = db.session ? db.users[db.session] : undefined;
    if (!u) return null;
    const me: Me = { id: u.id, email: u.email, displayName: u.displayName, isAdmin: u.isAdmin, consentedAt: u.consentedAt };
    return me;
  },

  async requestCode(email) {
    if (!email.trim()) throw new Error('メールアドレスを入力してください。');
  },

  async verifyCode(email, code) {
    if (code !== DEMO_CODE) throw new Error('コードが正しくないか、有効期限が切れています。');
    const normalized = email.trim().toLowerCase();
    mutate((db) => {
      let user = Object.values(db.users).find((u) => u.email === normalized);
      if (!user) {
        user = {
          id: newId(), email: normalized, displayName: '',
          isAdmin: normalized.startsWith('admin'), consentedAt: null,
        };
        db.users[user.id] = user;
        // 「あなたへの動画」の見え方を確かめられるよう、割り当て型の動画を1本つけておく
        if (!user.isAdmin && db.videos.some((v) => v.id === 'demo-video-2')) {
          db.assignments.push({ videoId: 'demo-video-2', userId: user.id });
        }
      }
      db.session = user.id;
    });
    emit();
  },

  async signOut() {
    mutate((db) => {
      db.session = null;
    });
    emit();
  },

  onAuthChange(callback) {
    listeners.add(callback);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) callback();
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(callback);
      if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
    };
  },

  async consent() {
    mutate((db) => {
      currentUser(db).consentedAt = new Date().toISOString();
    });
  },

  async withdrawConsent() {
    mutate((db) => {
      currentUser(db).consentedAt = null;
    });
  },

  async updateDisplayName(name) {
    mutate((db) => {
      currentUser(db).displayName = name;
    });
  },

  /* --- 体組成 --- */
  async listBody() {
    const db = load();
    const me = currentUser(db);
    return db.body.filter((r) => r.userId === me.id).sort(byNewest).map(strip);
  },
  async addBody(input: BodyInput) {
    mutate((db) => {
      const me = requireConsent(db);
      db.body.push({ ...input, id: newId(), userId: me.id, createdAt: new Date().toISOString() });
    });
  },
  async deleteBody(id) {
    mutate((db) => {
      const me = currentUser(db);
      db.body = db.body.filter((r) => !(r.id === id && r.userId === me.id));
    });
  },

  /* --- 食事 --- */
  async listMeals() {
    const db = load();
    const me = currentUser(db);
    return db.meals.filter((r) => r.userId === me.id).sort(byNewest).map(strip);
  },
  async addMeal(input: MealInput) {
    mutate((db) => {
      const me = requireConsent(db);
      db.meals.push({ ...input, id: newId(), userId: me.id, createdAt: new Date().toISOString() });
    });
  },
  async deleteMeal(id) {
    mutate((db) => {
      const me = currentUser(db);
      db.meals = db.meals.filter((r) => !(r.id === id && r.userId === me.id));
    });
  },

  /* --- トレーニング --- */
  async listWorkouts() {
    const db = load();
    const me = currentUser(db);
    return db.workouts.filter((r) => r.userId === me.id).sort(byNewest).map(strip);
  },
  async addWorkout(input: WorkoutInput) {
    mutate((db) => {
      const me = requireConsent(db);
      db.workouts.push({ ...input, id: newId(), userId: me.id, createdAt: new Date().toISOString() });
    });
  },
  async deleteWorkout(id) {
    mutate((db) => {
      const me = currentUser(db);
      db.workouts = db.workouts.filter((r) => !(r.id === id && r.userId === me.id));
    });
  },

  async deleteAllMyLogs() {
    mutate((db) => {
      const me = currentUser(db);
      db.body = db.body.filter((r) => r.userId !== me.id);
      db.meals = db.meals.filter((r) => r.userId !== me.id);
      db.workouts = db.workouts.filter((r) => r.userId !== me.id);
    });
  },

  /* --- 動画 --- */
  async listVideos() {
    const db = load();
    return visibleVideos(db, currentUser(db).id);
  },
  async getVideo(id) {
    const db = load();
    return visibleVideos(db, currentUser(db).id).find((v) => v.id === id) ?? null;
  },

  /* --- 施術者 --- */
  async adminListVideos() {
    const db = load();
    requireAdmin(db);
    return [...db.videos].sort((a, b) => a.sortOrder - b.sortOrder || (a.createdAt < b.createdAt ? 1 : -1));
  },
  async adminSaveVideo(input: VideoInput) {
    return mutate((db) => {
      requireAdmin(db);
      if (input.id) {
        const existing = db.videos.find((v) => v.id === input.id);
        if (!existing) throw new Error('動画が見つかりません。');
        Object.assign(existing, { ...input, id: existing.id });
        return { ...existing };
      }
      const created: Video = { ...input, id: newId(), createdAt: new Date().toISOString() };
      db.videos.push(created);
      return { ...created };
    });
  },
  async adminDeleteVideo(id) {
    mutate((db) => {
      requireAdmin(db);
      db.videos = db.videos.filter((v) => v.id !== id);
      db.assignments = db.assignments.filter((a) => a.videoId !== id);
    });
  },
  async adminGetAssignments(videoId) {
    const db = load();
    requireAdmin(db);
    return db.assignments.filter((a) => a.videoId === videoId).map((a) => a.userId);
  },
  async adminSetAssignments(videoId, userIds) {
    mutate((db) => {
      requireAdmin(db);
      db.assignments = [
        ...db.assignments.filter((a) => a.videoId !== videoId),
        ...[...new Set(userIds)].map((userId) => ({ videoId, userId })),
      ];
    });
  },
  async adminListMembers() {
    const db = load();
    requireAdmin(db);
    const list: MemberSummary[] = Object.values(db.users)
      .filter((u) => !u.isAdmin)
      .map((u) => ({ id: u.id, email: u.email, displayName: u.displayName, consentedAt: u.consentedAt }));
    return list.sort((a, b) => (a.email < b.email ? -1 : 1));
  },
  async adminGetMemberLogs(userId) {
    const db = load();
    requireAdmin(db);
    const logs: MemberLogs = {
      body: db.body.filter((r) => r.userId === userId).sort(byNewest).map(strip),
      meals: db.meals.filter((r) => r.userId === userId).sort(byNewest).map(strip),
      workouts: db.workouts.filter((r) => r.userId === userId).sort(byNewest).map(strip),
    };
    return logs;
  },
};
