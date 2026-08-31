import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

/**
 * service_role キーを使うサーバー専用クライアント。
 *
 * ⚠️ RLSを完全に無視して全データにアクセスできる。
 *    Route Handler / Server Action の内部でのみ使うこと。
 *    ブラウザに渡るコンポーネントから絶対に import しない。
 */
export function createAdminClient() {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      'Supabaseの環境変数が未設定です。NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を .env.local に設定してください。'
    );
  }
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
