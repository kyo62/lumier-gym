import { env, isTurnstileConfigured } from './env';

/**
 * Cloudflare Turnstile によるボット判定。
 * 未設定の環境では常に true を返す（開発中に邪魔をしない）。
 */
export async function verifyTurnstile(token: string | undefined, ip?: string | null): Promise<boolean> {
  if (!isTurnstileConfigured()) return true;
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret: env.turnstileSecretKey, response: token });
    if (ip) body.set('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true;
  } catch (error) {
    console.error('[turnstile] 検証に失敗しました', error);
    return false;
  }
}
