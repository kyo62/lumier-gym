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

/** 自主トレ（トレーニング・ストレッチ・歩いた日など、運動に関わる行動の記録） */
export type ActivityKind = 'training' | 'stretch' | 'walk' | 'run' | 'other';
export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  training: 'トレーニング',
  stretch: 'ストレッチ',
  walk: 'ウォーキング',
  run: 'ラン',
  other: 'その他',
};
export const ACTIVITY_KINDS = Object.keys(ACTIVITY_KIND_LABELS) as ActivityKind[];

/** 施術者からのコメント。お客様からの返信欄はない（返事のプレッシャーをなくすため） */
export type ActivityComment = {
  id: string;
  body: string;
  createdAt: string;
  /** お客様が読んだ日時。null なら「新着」 */
  seenAt: string | null;
};
export type ActivityLog = {
  id: string;
  loggedOn: string;
  kind: ActivityKind;
  minutes: number | null;
  note: string;
  comments: ActivityComment[];
};
export type ActivityInput = Omit<ActivityLog, 'id' | 'comments'>;
/** 施術者の画面：誰の記録か */
export type AdminActivity = ActivityLog & { userId: string; memberName: string };

/** お客様に見せるカルテの要点（見立て・内部メモ・料金・キャンセル履歴は含まれない） */
export type MyStatus = {
  name: string;
  plan: string;
  remain: number;
  carry: number;
  carryExpire: string | null;
  ticketExpire: string | null;
  targetLabel: string;
  targetDate: string | null;
  homework: string;
  purpose: string;
  goal: string;
  hobby: string;
  /** 最初の問診票に、お客様ご自身が書いた体の状態 */
  intakeBody: string;
  /** ストレッチ回数券の残りと期限（期限切れなら 0） */
  stretchRemain: number;
  stretchExpire: string | null;
};
/** お客様に見せるセッションの記録 */
export type MySession = {
  sessionDate: string;
  type: string;
  menu: string;
  homecare: string;
};

/** 施術者の画面：カルテ（内部の項目を含む） */
export type AdminClient = {
  id: string;
  code: string;
  /** ひもづけた会員ログイン。null ならまだ */
  userId: string | null;
  name: string;
  kana: string;
  gender: string;
  phone: string;
  email: string;
  referrer: string;
  hobby: string;
  plan: string;
  ticketCount: number | null;
  ticketDate: string | null;
  remain: number;
  carry: number;
  carryExpire: string | null;
  stretchRemain: number;
  stretchExpire: string | null;
  targetLabel: string;
  targetDate: string | null;
  consentOn: string | null;
  purpose: string;
  goal: string;
  intakeBody: string;
  /** 見立て（内部のみ。会員には見えない） */
  posture: string;
  /** ホームケア（会員に見える） */
  homework: string;
  internalNote: string;
};
export type AdminClientInput = Omit<AdminClient, 'id' | 'code' | 'userId'> & { id?: string };

export type AdminSession = {
  id: string;
  clientId: string;
  sessionDate: string;
  type: string;
  status: string;
  consumed: number;
  consumedFrom: 'remain' | 'carry' | 'stretch' | null;
  fee: number;
  amount: number;
  /** 状態メモ（内部のみ） */
  condition: string;
  menu: string;
  homecare: string;
  /** false なら会員には出ない */
  share: boolean;
  note: string;
};
export type SessionRecordInput = {
  sessionDate: string;
  choice: string;
  menu: string;
  homecare: string;
  condition: string;
  share: boolean;
  /** キャンセル料・無断キャンセルを免除する */
  waive: boolean;
};

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

  /* --- 自主トレとコメント／カルテ（自分の分だけ） --- */
  listActivities(): Promise<ActivityLog[]>;
  addActivity(input: ActivityInput): Promise<void>;
  deleteActivity(id: string): Promise<void>;
  /** 自分への施術者のコメントを、すべて「読んだ」にする */
  markCommentsSeen(): Promise<void>;
  /** サロンがカルテをひもづけるまでは null */
  getMyStatus(): Promise<MyStatus | null>;
  listMySessions(): Promise<MySession[]>;

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
  /** 会員の自主トレを新しい順に（コメントつき） */
  adminListActivities(): Promise<AdminActivity[]>;
  adminAddComment(logId: string, body: string): Promise<void>;

  /* --- カルテ（施術者だけ） --- */
  adminListClients(): Promise<AdminClient[]>;
  adminSaveClient(input: AdminClientInput): Promise<AdminClient>;
  adminDeleteClient(id: string): Promise<void>;
  adminListSessions(clientId: string): Promise<AdminSession[]>;
  /** セッションを記録し、回数・繰越・キャンセル料を自動で計算する。結果のひとことを返す */
  adminRecordSession(clientId: string, input: SessionRecordInput): Promise<string>;
  /** セッションの記録を消し、使った回数を元に戻す */
  adminDeleteSession(sessionId: string): Promise<void>;
  /** 月次の締め（月初に1回）。なくなった回数を返す */
  adminRollMonth(clientId: string): Promise<number>;
  /** カルテと会員ログイン（メールアドレス）をひもづける */
  adminLinkClient(clientId: string, email: string): Promise<void>;
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '朝食',
  lunch: '昼食',
  dinner: '夕食',
  snack: '間食',
};
export const MEAL_TYPES = Object.keys(MEAL_TYPE_LABELS) as MealType[];
