/**
 * 会員ページのデータの型と、データ層の窓口（MemberApi）。
 *
 * 画面は MemberApi だけを見る。実体は2つ：
 *   - supabaseApi … 本番。Supabase に保存する
 *   - demoApi     … デモ。この端末のブラウザにだけ保存する（設定なしで触れる）
 */

export type Me = {
  id: string;
  email: string;
  displayName: string;
  isAdmin: boolean;
  /** 同意した日時。null のあいだは同意画面が出て、記録は書き込めない */
  consentedAt: string | null;
};

export type BodyLog = {
  id: string;
  /** yyyy-mm-dd（日本時間の日付） */
  loggedOn: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleKg: number | null;
  note: string;
};
export type BodyInput = Omit<BodyLog, 'id'>;

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealLog = {
  id: string;
  loggedOn: string;
  mealType: MealType;
  content: string;
  note: string;
};
export type MealInput = Omit<MealLog, 'id'>;

export type WorkoutLog = {
  id: string;
  loggedOn: string;
  exercise: string;
  weightKg: number | null;
  reps: number | null;
  sets: number | null;
  note: string;
};
export type WorkoutInput = Omit<WorkoutLog, 'id'>;

export type VideoProvider = 'youtube' | 'vimeo' | 'url';
export type VideoVisibility = 'all' | 'assigned';

export type Video = {
  id: string;
  title: string;
  description: string;
  category: string;
  provider: VideoProvider;
  /** youtube: 動画ID / vimeo: 動画ID（限定公開は "ID/ハッシュ"） / url: https のURL */
  videoRef: string;
  visibility: VideoVisibility;
  published: boolean;
  sortOrder: number;
  createdAt: string;
};
export type VideoInput = Omit<Video, 'id' | 'createdAt'> & { id?: string };

/** 施術者向けの会員一覧の1行 */
export type MemberSummary = {
  id: string;
  email: string;
  displayName: string;
  consentedAt: string | null;
};

export type MemberLogs = {
  body: BodyLog[];
  meals: MealLog[];
  workouts: WorkoutLog[];
};

export interface MemberApi {
  readonly mode: 'demo' | 'supabase';

  /* --- 認証 --- */
  getMe(): Promise<Me | null>;
  /** メールにログイン用コードを送る（登録済みかどうかは、呼び出し側に伝えない） */
  requestCode(email: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signOut(): Promise<void>;
  /** ログイン状態が変わったときに呼ばれる。戻り値で解除する */
  onAuthChange(callback: () => void): () => void;
  consent(): Promise<void>;
  /** 同意を取り消す。あわせて、記録をすべて消すのは呼び出し側（deleteAllMyLogs）で行う */
  withdrawConsent(): Promise<void>;
  updateDisplayName(name: string): Promise<void>;

  /* --- 自分の記録 --- */
  listBody(): Promise<BodyLog[]>;
  addBody(input: BodyInput): Promise<void>;
  deleteBody(id: string): Promise<void>;
  listMeals(): Promise<MealLog[]>;
  addMeal(input: MealInput): Promise<void>;
  deleteMeal(id: string): Promise<void>;
  listWorkouts(): Promise<WorkoutLog[]>;
  addWorkout(input: WorkoutInput): Promise<void>;
  deleteWorkout(id: string): Promise<void>;
  /** 自分の記録をすべて消す（アカウントは残る） */
  deleteAllMyLogs(): Promise<void>;

  /* --- 動画（見えるものだけが返る） --- */
  listVideos(): Promise<Video[]>;
  getVideo(id: string): Promise<Video | null>;

  /* --- 施術者だけ（DB側でも権限を確認している） --- */
  adminListVideos(): Promise<Video[]>;
  adminSaveVideo(input: VideoInput): Promise<Video>;
  adminDeleteVideo(id: string): Promise<void>;
  adminGetAssignments(videoId: string): Promise<string[]>;
  adminSetAssignments(videoId: string, userIds: string[]): Promise<void>;
  adminListMembers(): Promise<MemberSummary[]>;
  adminGetMemberLogs(userId: string): Promise<MemberLogs>;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};
export const MEAL_TYPES = Object.keys(MEAL_TYPE_LABELS) as MealType[];
