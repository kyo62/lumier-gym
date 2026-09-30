'use client';

import { useSyncExternalStore } from 'react';

/**
 * 「ホーム画面に追加したアプリ」として開かれているか。
 * true なら、追加の案内は不要。
 */
export function useStandalone(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

function subscribe(onChange: () => void) {
  const mq = window.matchMedia('(display-mode: standalone)');
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  // iOS Safari は navigator.standalone、それ以外は display-mode で判定する
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}
