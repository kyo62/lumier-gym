import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

/** 屋号の頭文字を使ったファビコン（画像ファイルを用意しなくてよい） */
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
          background: '#2e2b27',
          color: '#d8bc84',
          fontSize: 34,
          fontFamily: 'serif',
          letterSpacing: '0.04em',
        }}
      >
        T
      </div>
    ),
    size
  );
}
