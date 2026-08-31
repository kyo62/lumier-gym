import { ImageResponse } from 'next/og';
import { site } from '@/config/site';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** 屋号の頭文字を使ったファビコンを生成する（画像ファイルを用意しなくてよい） */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1f1d1a',
          color: '#d9c48a',
          fontSize: 38,
          fontFamily: 'serif',
          letterSpacing: '0.02em',
        }}
      >
        {site.name.slice(0, 1).toUpperCase()}
      </div>
    ),
    size
  );
}
