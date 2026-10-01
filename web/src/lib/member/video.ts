import type { VideoProvider } from './types.ts';

/**
 * 動画のURLの解釈。
 *
 * 施術者が貼りつけたURLから、種別と動画IDを取り出す。
 * 埋め込みに使う値は、ここで形式を厳しく確認する（変なURLを iframe に入れないため）。
 */

export type ParsedVideo = { provider: VideoProvider; videoRef: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const VIMEO_ID = /^\d{6,12}$/;
const VIMEO_HASH = /^[A-Za-z0-9]{6,20}$/;

/**
 * URL 文字列を https の URL として読む。失敗したら null。
 * 「youtube.com/…」のように https:// を付け忘れた入力は補う。
 * ただし ftp:// や javascript: など、ほかのスキームで始まるものは補わずに弾く。
 */
function readUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^https:\/\//i.test(trimmed)) return parse(trimmed);
  // スキームらしきもの（xxx:// や javascript: など）で始まっていたら、https 以外なので不可
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^(javascript|data|vbscript|file|blob|about):/i.test(trimmed)) {
    return null;
  }
  return parse(`https://${trimmed}`);
}

function parse(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * 入力欄に貼られた文字列から、動画の種別とIDを判定する。
 * YouTube・Vimeo のURL、または直接の動画ファイル（https）に対応。判定できなければ null。
 */
export function parseVideoInput(input: string): ParsedVideo | null {
  const url = readUrl(input);
  if (!url) return null;

  const host = url.hostname.replace(/^www\.|^m\./, '').toLowerCase();

  // --- YouTube ---
  if (host === 'youtu.be') {
    const id = url.pathname.split('/')[1] ?? '';
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoRef: id } : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const id =
      url.searchParams.get('v') ??
      (['embed', 'shorts', 'live', 'v'].includes(parts[0]) ? parts[1] : undefined) ??
      '';
    return YOUTUBE_ID.test(id) ? { provider: 'youtube', videoRef: id } : null;
  }

  // --- Vimeo（限定公開は vimeo.com/ID/ハッシュ、または ?h=ハッシュ） ---
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    const idIndex = host === 'player.vimeo.com' ? parts.indexOf('video') + 1 : 0;
    const id = parts[idIndex] ?? '';
    if (!VIMEO_ID.test(id)) return null;
    const hash = host === 'player.vimeo.com' ? url.searchParams.get('h') : parts[idIndex + 1];
    return {
      provider: 'vimeo',
      videoRef: hash && VIMEO_HASH.test(hash) ? `${id}/${hash}` : id,
    };
  }

  // --- 直接の動画ファイル ---
  return { provider: 'url', videoRef: url.toString() };
}

/** 保存済みの値から、iframe に入れてよい埋め込みURLを作る。不正な値なら null */
export function embedUrl(provider: VideoProvider, videoRef: string): string | null {
  if (provider === 'youtube') {
    if (!YOUTUBE_ID.test(videoRef)) return null;
    // 関連動画を控えめにし、Cookie を使わないドメインで埋め込む
    return `https://www.youtube-nocookie.com/embed/${videoRef}?rel=0&modestbranding=1&playsinline=1`;
  }
  if (provider === 'vimeo') {
    const [id, hash] = videoRef.split('/');
    if (!VIMEO_ID.test(id)) return null;
    if (hash !== undefined && !VIMEO_HASH.test(hash)) return null;
    return `https://player.vimeo.com/video/${id}${hash ? `?h=${hash}` : ''}`;
  }
  return null;
}

/** 直接の動画ファイルとして <video> に渡してよいか（https のみ） */
export function directVideoUrl(videoRef: string): string | null {
  const url = readUrl(videoRef);
  return url ? url.toString() : null;
}

export const PROVIDER_LABELS: Record<VideoProvider, string> = {
  youtube: 'YouTube',
  vimeo: 'Vimeo',
  url: '動画ファイル（URL）',
};
