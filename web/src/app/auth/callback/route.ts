import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

/**
 * マジックリンクのクリック先。
 * Supabaseから戻ってきた認証コードをセッションに交換し、管理画面へ送る。
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/admin';
  const redirect = (path: string) => NextResponse.redirect(new URL(path, url.origin));

  if (!isSupabaseConfigured()) return redirect('/admin/login?error=config');

  const supabase = await createSupabaseServerClient();

  const code = url.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return redirect(error ? '/admin/login?error=link' : next);
  }

  // メールテンプレートを token_hash 形式に変更している場合の経路
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type === 'magiclink') {
    const { error } = await supabase.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
    return redirect(error ? '/admin/login?error=link' : next);
  }

  return redirect('/admin/login?error=link');
}
