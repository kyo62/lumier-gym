/**
 * 共有用プレビューの書き出し。
 *
 *   npm run build:preview
 *
 * 本番デプロイには使いません。「まだドメインを取っていないが、人に見せたい」
 * ときに、どこにでも置ける単体のHTMLを作るためのものです。
 *
 * 静的書き出し（out/）の各ページを、CSSを埋め込んだ1枚のHTMLに変換します。
 *   - Next.js のランタイムJSは読み込まない（アセットのパス解決に依存しないため）
 *   - 代わりに、スクロール表示とモバイルメニューだけを素のJSで再現する
 *   - ページ間のリンクは書き出したファイル名に合わせて相対パスに直す
 *
 * 出力先： preview/
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'out';
const PREVIEW = 'preview';

/** 書き出すページ。[ソース, 出力名] */
const PAGES = [
  ['index.html', 'index.html'],
  ['terms.html', 'terms.html'],
  ['privacy.html', 'privacy.html'],
];

/** Next.js のクライアント処理のうち、プレビューで必要な2つだけを素のJSで再現する */
const FALLBACK_SCRIPT = `
(function () {
  // スクロールで画面に入った要素を表示する
  var targets = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-visible', 'true');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    targets.forEach(function (el) { io.observe(el); });
  } else {
    targets.forEach(function (el) { el.setAttribute('data-visible', 'true'); });
  }

  // モバイルメニューの開閉
  var toggle = document.querySelector('[aria-controls="mobile-nav"]');
  var nav = document.getElementById('mobile-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.hasAttribute('hidden');
      if (open) { nav.removeAttribute('hidden'); } else { nav.setAttribute('hidden', ''); }
      toggle.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.setAttribute('hidden', '');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ヘッダーの背景をスクロールで切り替える
  var header = document.querySelector('header');
  if (header) {
    var onScroll = function () {
      var scrolled = window.scrollY > 24;
      header.classList.toggle('border-b', scrolled);
      header.classList.toggle('border-line', scrolled);
      header.classList.toggle('bg-canvas/95', scrolled);
      header.classList.toggle('backdrop-blur', scrolled);
      header.classList.toggle('bg-transparent', !scrolled);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
`.trim();

/** 内部リンク。絶対パス → 書き出したファイル名 */
const LINK_REWRITES = [
  [/href="\/#/g, 'href="index.html#'],
  [/href="\/terms"/g, 'href="terms.html"'],
  [/href="\/privacy"/g, 'href="privacy.html"'],
  [/href="\/icon\?[^"]*"/g, 'href="#"'],
  [/href="\/"/g, 'href="index.html"'],
];

console.log('1/3 静的書き出し …');
execFileSync('npx', ['next', 'build'], { stdio: 'inherit' });

console.log('2/3 CSSを埋め込み、ランタイムJSを外す …');
rmSync(PREVIEW, { recursive: true, force: true });
mkdirSync(PREVIEW, { recursive: true });

for (const [source, target] of PAGES) {
  const sourcePath = join(OUT, source);
  if (!existsSync(sourcePath)) {
    console.warn(`   スキップ： ${source} が見つかりません`);
    continue;
  }
  let html = readFileSync(sourcePath, 'utf8');

  // 参照しているCSSを読み、<style> として本文に埋め込む
  const cssHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="(\/_next\/[^"]+)"[^>]*>/g)].map(
    (m) => m[1]
  );
  const css = cssHrefs
    .map((href) => readFileSync(join(OUT, href.replace(/^\//, '')), 'utf8'))
    .join('\n');

  // Next.js が差し込んだ <link rel="stylesheet"> と <script> をすべて除去する
  html = html
    .replace(/<link[^>]+rel="stylesheet"[^>]+href="\/_next\/[^"]+"[^>]*>/g, '')
    .replace(/<link[^>]+rel="preload"[^>]+>/g, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/g, '');

  for (const [pattern, replacement] of LINK_REWRITES) html = html.replace(pattern, replacement);

  // 埋め込んだCSSと、代わりの素のJSを差し込む
  html = html
    .replace('</head>', `<style>${css}</style></head>`)
    .replace('</body>', `<script>${FALLBACK_SCRIPT}</script></body>`);

  writeFileSync(join(PREVIEW, target), html);
  console.log(`   ${target}  (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
}

console.log('\n3/3 完了： preview/ の各HTMLは単体で動きます。');
