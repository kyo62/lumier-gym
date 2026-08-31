import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { env } from '../env';

/**
 * ログイン中の管理者のセッションを読むためのクライアント。
 * Server Component からも呼べるように、Cookieの書き込み失敗は握りつぶす
 * （セッションの更新は src/proxy.ts が担当する）。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component からは Cookie を書けない。proxy.ts 側で更新される。
        }
      },
    },
  });
}

/**
 * ログイン中の管理者を返す。管理者でなければ null。
 *
 * ADMIN_EMAIL と一致するアドレスだけを管理者として扱う。
 * ADMIN_EMAIL が未設定のときは「誰も管理者ではない」とする ―
 * ここを素通りさせると、Supabaseにサインアップした任意のユーザーが
 * 管理画面に入れてしまう。
 */
export async function getAdminUser() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  if (!env.adminEmail) {
    console.warn('[auth] ADMIN_EMAIL が未設定のため、管理画面へのアクセスをすべて拒否します。');
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (user.email.toLowerCase() !== env.adminEmail.toLowerCase()) return null;

  return user;
}
