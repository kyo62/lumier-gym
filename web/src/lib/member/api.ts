import type { MemberApi } from './types.ts';
import { demoApi } from './demoApi.ts';
import { isSupabaseConfigured, supabaseApi } from './supabaseApi.ts';

/**
 * 画面が使うデータ層。Supabase の環境変数があれば本番、なければデモ。
 * （NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）
 */
export const api: MemberApi = isSupabaseConfigured ? supabaseApi : demoApi;
