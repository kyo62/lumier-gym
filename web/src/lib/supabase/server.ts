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

/** ログイン中の管理者を返す。未ログインなら null */
export async function getAdminUser() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // 環境変数で許可したアドレス以外は管理者として扱わない
  if (env.adminEmail && user.email?.toLowerCase() !== env.adminEmail.toLowerCase()) {
    return null;
  }
  return user;
}
