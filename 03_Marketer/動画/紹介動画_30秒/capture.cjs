// 1コマずつ描画して、画像として書き出す（時間で決まる動きなので、何度やっても同じ映像になる）
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FPS = 30, DURATION = 31.0;
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null; // 確認用：秒を指定して、そのコマだけ

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--proxy-bypass-list=<-loopback>', '--allow-file-access-from-files'] });
  const page = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto('file://' + path.join(__dirname, 'index.html'));

  // 使う文字を、先に読み込ませておく（書体は、必要な文字だけ後から読み込まれるため）
  const text = await page.evaluate(() => document.body.innerText);
  await page.evaluate(async (txt) => {
    await Promise.all(['500 60px "Shippori Mincho"', '600 60px "Shippori Mincho"', '400 38px "Noto Sans JP"', '500 38px "Noto Sans JP"'].map((f) => document.fonts.load(f, txt)));
    await document.fonts.ready;
  }, text);
  await page.waitForTimeout(500);

  const dir = path.join(__dirname, 'frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const times = only ? only : Array.from({ length: Math.round(FPS * DURATION) }, (_, i) => i / FPS);
  let n = 0;
  for (const t of times) {
    await page.evaluate((tt) => window.render(tt), t);
    const name = only ? `check_${String(t).replace('.', '_')}.png` : `f_${String(n).padStart(4, '0')}.jpg`;
    await page.screenshot(only ? { path: path.join(dir, name) } : { path: path.join(dir, name), type: 'jpeg', quality: 95 });
    n++;
  }
  console.log('frames', n);
  await b.close();
})();
