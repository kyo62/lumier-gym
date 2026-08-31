/**
 * 環境変数へのアクセスを1か所にまとめる。
 *
 * 未設定でもビルドとトップページの表示は成功させ、
 * 予約機能を使う瞬間にだけ分かりやすいエラーを出す方針。
 */

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  mailFrom: process.env.MAIL_FROM ?? '',
  adminEmail: process.env.ADMIN_EMAIL ?? '',
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? '',
};

/** Supabaseに接続できる状態か（未設定ならデモモードで動く） */
export const isSupabaseConfigured = () => Boolean(env.supabaseUrl && env.supabaseAnonKey);

/** サーバー側で書き込みができる状態か */
export const canWriteBookings = () =>
  Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);

export const isMailConfigured = () => Boolean(env.resendApiKey && env.mailFrom);
export const isTurnstileConfigured = () =>
  Boolean(env.turnstileSiteKey && env.turnstileSecretKey);
