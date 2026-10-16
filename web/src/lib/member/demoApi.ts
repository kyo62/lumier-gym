import type {
  ActivityComment, ActivityInput, ActivityLog, AdminActivity, AdminClient, AdminClientInput, AdminSession, SessionRecordInput, BodyInput, BodyLog, MealInput, MealLog,
  MemberApi, MemberLogs, MemberSummary, Me, MySession, MyStatus,
  Video, VideoInput, WorkoutInput, WorkoutLog,
} from './types.ts';
import { toDateString, todayLocal } from './dates.ts';
import { closeMonth, recordSession, removeSession, type KarteStore } from './karteService.ts';
import { ticketExpire } from './karteRules.ts';

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
  activities: (Omit<ActivityLog, 'comments'> & Owned)[];
  comments: (ActivityComment & { logId: string })[];
  /** カルテ（施術者の画面で入力。会員ログインにひもづけたものだけが、会員に見える） */
  clients: AdminClient[];
  karteSessions: AdminSession[];
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
    activities: [],
    comments: [],
    clients: [
      sampleClient({ id: 'demo-client-1', code: 'TNK-0001', name: '山田 花子（サンプル）', kana: 'ヤマダ ハナコ', plan: 'm4', remain: 3, carry: 1, carryExpire: daysAgo(-20), targetLabel: '名古屋ウィメンズマラソン', targetDate: '2027-03-14', posture: '【見立て】巻き肩。呼吸が浅い', internalNote: '内部メモのサンプル' }),
      sampleClient({ id: 'demo-client-2', code: 'TNK-0002', name: '田中 みどり（サンプル）', kana: 'タナカ ミドリ', plan: 'ticket', ticketCount: 4, ticketDate: daysAgo(50), remain: 1 }),
    ],
    karteSessions: [
      sampleSession('demo-client-1', daysAgo(7), { menu: '胸まわりのストレッチ、呼吸のワーク', homecare: '息を吐く呼吸を朝晩3回', condition: '走ったあとのふくらはぎの張り' }),
      sampleSession('demo-client-2', daysAgo(10), { menu: '股関節まわりの動きの確認', consumed: 1, consumedFrom: 'remain' }),
    ],
  };
}

function sampleClient(p: Partial<AdminClient> & Pick<AdminClient, 'id' | 'code' | 'name'>): AdminClient {
  return {
    userId: null, kana: '', gender: '女性', phone: '', email: '', referrer: '', hobby: '', plan: 'trial',
    ticketCount: null, ticketDate: null, remain: 0, carry: 0, carryExpire: null, stretchRemain: 0, stretchExpire: null,
    targetLabel: '', targetDate: null, consentOn: null, purpose: '', goal: '', intakeBody: '', posture: '', homework: '', internalNote: '',
    ...p,
  };
}
function sampleSession(clientId: string, sessionDate: string, p: Partial<AdminSession> = {}): AdminSession {
  return {
    id: newId(), clientId, sessionDate, type: 'regular', status: 'attended', consumed: 0, consumedFrom: null,
    fee: 0, amount: 0, condition: '', menu: '', homecare: '', share: true, note: '', ...p,
  };
}

/** カルテのコード（TNK-0001 の形）を、次の番号で作る */
function nextCode(clients: AdminClient[]): string {
  const max = clients.reduce((m, c) => Math.max(m, Number(/^TNK-(\d+)$/.exec(c.code)?.[1] ?? 0)), 0);
  return `TNK-${String(max + 1).padStart(4, '0')}`;
}

/** デモ用：新しい会員に、サンプルのカルテをひもづける（会員画面の見え方を試せるように） */
function sampleKarte(db: Db, userId: string, email: string) {
  const id = newId();
  db.clients.push(sampleClient({
    id, code: nextCode(db.clients), userId, name: 'お客様', email, plan: 'm4', remain: 3, carry: 1, carryExpire: daysAgo(-20),
    stretchRemain: 4, stretchExpire: daysAgo(-50),
    targetLabel: '名古屋ウィメンズマラソン', targetDate: '2027-03-14',
    homework: '朝と夜に、息を吐く呼吸を3回。肩を大きく後ろに回す動きを10回。',
    purpose: '走ったあとの肩・背中の張りが気になる', goal: '3月のレースを、楽しく走り切る',
    hobby: 'ランニング、ヨガ', intakeBody: '肩のこわばり、息が浅い感じがする。',
    posture: '【見立て】巻き肩（施術者だけに見えるメモ）', internalNote: '内部メモ（会員には見えない）', consentOn: daysAgo(14),
  }));
  db.karteSessions.push(
    sampleSession(id, daysAgo(7), { menu: '胸まわりのストレッチ、呼吸のワーク、フォームの確認', homecare: '息を吐く呼吸を朝晩3回', condition: '内部の状態メモ' }),
    sampleSession(id, daysAgo(14), { type: 'trial', menu: 'カウンセリング、肩甲骨まわりの動きの確認', homecare: '肩を後ろに回す動き10回', amount: 3300 }),
  );
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

/** セッション記録の保存先（デモ）。計算は karteService.ts */
function demoKarteStore(): KarteStore {
  return {
    async getClient(id) {
      const c = load().clients.find((x) => x.id === id);
      if (!c) throw new Error('カルテが見つかりません。');
      return { ...c };
    },
    async saveCounters(id, k) {
      mutate((db) => {
        const c = db.clients.find((x) => x.id === id);
        if (c) Object.assign(c, { remain: k.remain, carry: k.carry, carryExpire: k.carryExpire, stretchRemain: k.stretchRemain, stretchExpire: k.stretchExpire });
      });
    },
    async insertSession(row) {
      mutate((db) => void db.karteSessions.push({ ...row, id: newId() }));
    },
    async getSession(id) {
      return load().karteSessions.find((s) => s.id === id) ?? null;
    },
    async deleteSession(id) {
      mutate((db) => {
        db.karteSessions = db.karteSessions.filter((s) => s.id !== id);
      });
    },
  };
}

/** 記録に、施術者のコメント（古い順）を付ける */
function withComments(db: Db, log: Omit<ActivityLog, 'comments'>): ActivityLog {
  const comments = db.comments
    .filter((c) => c.logId === log.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map(({ logId, ...rest }) => {
      void logId;
      return rest;
    });
  return { ...log, comments };
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
        if (!user.isAdmin) sampleKarte(db, user.id, normalized);
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
      const mine = new Set(db.activities.filter((r) => r.userId === me.id).map((r) => r.id));
      db.activities = db.activities.filter((r) => r.userId !== me.id);
      db.comments = db.comments.filter((c) => !mine.has(c.logId));
    });
  },

  /* --- 自主トレとコメント／カルテ --- */
  async listActivities() {
    const db = load();
    const me = currentUser(db);
    return db.activities
      .filter((r) => r.userId === me.id)
      .sort(byNewest)
      .map((r) => withComments(db, strip(r)));
  },
  async addActivity(input: ActivityInput) {
    mutate((db) => {
      const me = requireConsent(db);
      db.activities.push({ ...input, id: newId(), userId: me.id, createdAt: new Date().toISOString() });
    });
  },
  async deleteActivity(id) {
    mutate((db) => {
      const me = currentUser(db);
      if (!db.activities.some((r) => r.id === id && r.userId === me.id)) return;
      db.activities = db.activities.filter((r) => r.id !== id);
      db.comments = db.comments.filter((c) => c.logId !== id);
    });
  },
  async markCommentsSeen() {
    mutate((db) => {
      const me = currentUser(db);
      const mine = new Set(db.activities.filter((r) => r.userId === me.id).map((r) => r.id));
      const now = new Date().toISOString();
      for (const c of db.comments) if (mine.has(c.logId) && !c.seenAt) c.seenAt = now;
    });
  },
  async getMyStatus() {
    const db = load();
    const c = db.clients.find((x) => x.userId === currentUser(db).id);
    if (!c) return null;
    const today = todayLocal();
    const status: MyStatus = {
      name: c.name, plan: c.plan, remain: c.remain,
      carry: c.carryExpire && c.carryExpire < today ? 0 : c.carry, carryExpire: c.carryExpire,
      ticketExpire: ticketExpire(c.ticketDate), targetLabel: c.targetLabel, targetDate: c.targetDate,
      homework: c.homework, purpose: c.purpose, goal: c.goal, hobby: c.hobby, intakeBody: c.intakeBody,
      stretchRemain: c.stretchExpire && c.stretchExpire < today ? 0 : c.stretchRemain, stretchExpire: c.stretchExpire,
    };
    return status; // 見立て・内部メモ・紹介者・連絡先は、ここには入らない
  },
  async listMySessions() {
    const db = load();
    const c = db.clients.find((x) => x.userId === currentUser(db).id);
    if (!c) return [];
    const list: MySession[] = db.karteSessions
      .filter((s) => s.clientId === c.id && s.status === 'attended' && s.share)
      .sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1))
      .map((s) => ({ sessionDate: s.sessionDate, type: s.type, menu: s.menu, homecare: s.homecare }));
    return list;
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
  async adminListActivities() {
    const db = load();
    requireAdmin(db);
    const list: AdminActivity[] = db.activities.sort(byNewest).map((r) => ({
      ...withComments(db, strip(r)),
      userId: r.userId,
      memberName: db.users[r.userId]?.displayName || db.users[r.userId]?.email || '（不明）',
    }));
    return list;
  },
  async adminAddComment(logId, body) {
    mutate((db) => {
      requireAdmin(db);
      if (!db.activities.some((r) => r.id === logId)) throw new Error('記録が見つかりません。');
      db.comments.push({ id: newId(), logId, body, createdAt: new Date().toISOString(), seenAt: null });
    });
  },
  /* --- カルテ --- */
  async adminListClients() {
    const db = load();
    requireAdmin(db);
    return [...db.clients].sort((a, b) => (a.code < b.code ? -1 : 1));
  },
  async adminSaveClient(input: AdminClientInput) {
    return mutate((db) => {
      requireAdmin(db);
      if (!input.name.trim()) throw new Error('お名前を入力してください。');
      if (input.id) {
        const existing = db.clients.find((c) => c.id === input.id);
        if (!existing) throw new Error('カルテが見つかりません。');
        Object.assign(existing, input, { id: existing.id });
        return { ...existing };
      }
      const created: AdminClient = { ...sampleClient({ id: newId(), code: nextCode(db.clients), name: input.name }), ...input, id: newId(), code: nextCode(db.clients), userId: null };
      db.clients.push(created);
      return { ...created };
    });
  },
  async adminDeleteClient(id) {
    mutate((db) => {
      requireAdmin(db);
      db.clients = db.clients.filter((c) => c.id !== id);
      db.karteSessions = db.karteSessions.filter((s) => s.clientId !== id);
    });
  },
  async adminListSessions(clientId) {
    const db = load();
    requireAdmin(db);
    return db.karteSessions.filter((s) => s.clientId === clientId).sort((a, b) => (a.sessionDate < b.sessionDate ? 1 : -1));
  },
  async adminRecordSession(clientId: string, input: SessionRecordInput) {
    requireAdmin(load());
    return recordSession(demoKarteStore(), clientId, input, todayLocal());
  },
  async adminDeleteSession(sessionId) {
    requireAdmin(load());
    await removeSession(demoKarteStore(), sessionId);
  },
  async adminRollMonth(clientId) {
    requireAdmin(load());
    return closeMonth(demoKarteStore(), clientId, todayLocal());
  },
  async adminLinkClient(clientId, email) {
    mutate((db) => {
      requireAdmin(db);
      const user = Object.values(db.users).find((u) => u.email === email.trim().toLowerCase() && !u.isAdmin);
      if (!user) throw new Error('そのメールアドレスの会員が見つかりません。');
      const c = db.clients.find((x) => x.id === clientId);
      if (!c) throw new Error('カルテが見つかりません。');
      if (db.clients.some((x) => x.userId === user.id && x.id !== clientId)) throw new Error('その会員は、別のカルテにひもづいています。');
      c.userId = user.id;
    });
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
