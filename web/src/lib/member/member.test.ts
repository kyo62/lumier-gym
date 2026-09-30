import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { todayLocal, isValidDateString, formatDateJa, daysBetween, toDateString } from './dates.ts';
import { parseVideoInput, embedUrl, directVideoUrl } from './video.ts';
import { parseBodyForm, parseMealForm, parseWorkoutForm, normalizeCode, isPlausibleEmail } from './inputs.ts';
import { bodySeries, latestChange, yRange, groupByDate } from './stats.ts';
import type { BodyLog } from './types.ts';

/* -------------------------------------------------------------------------- */
describe('dates', () => {
  test('todayLocal は UTC ではなく端末のローカル日付（日本の朝9時前でも「今日」）', () => {
    // 2026-01-01 08:00（ローカル）。toISOString だと UTC に直されて前日になりうる
    assert.equal(todayLocal(new Date(2026, 0, 1, 8, 0)), '2026-01-01');
    assert.equal(toDateString(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
  });
  test('実在しない日付を弾く', () => {
    assert.equal(isValidDateString('2026-02-30'), false);
    assert.equal(isValidDateString('2026-13-01'), false);
    assert.equal(isValidDateString('2026-1-5'), false);
    assert.equal(isValidDateString('2028-02-29'), true);
    assert.equal(isValidDateString('2027-02-29'), false);
  });
  test('formatDateJa', () => {
    assert.equal(formatDateJa('2026-10-03'), '10月3日（土）');
    assert.equal(formatDateJa('2027-03-14'), '3月14日（日）');
    assert.equal(formatDateJa('でたらめ'), 'でたらめ');
  });
  test('daysBetween', () => {
    assert.equal(daysBetween('2026-10-01', '2026-10-08'), 7);
    assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
  });
});

/* -------------------------------------------------------------------------- */
describe('video', () => {
  test('YouTube の各形式のURLから動画IDを取り出す', () => {
    const id = 'dQw4w9WgXcQ';
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtube.com/watch?v=${id}&t=30s`,
      `https://m.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}`,
      `https://youtu.be/${id}?si=abc`,
      `https://www.youtube.com/embed/${id}`,
      `https://www.youtube.com/shorts/${id}`,
      `youtube.com/watch?v=${id}`, // https を付け忘れても読める
    ]) {
      assert.deepEqual(parseVideoInput(url), { provider: 'youtube', videoRef: id }, url);
    }
  });
  test('YouTube のIDが不正なら null', () => {
    assert.equal(parseVideoInput('https://www.youtube.com/watch?v=short'), null);
    assert.equal(parseVideoInput('https://www.youtube.com/watch?v="><script>'), null);
  });
  test('Vimeo（限定公開のハッシュ付きも）', () => {
    assert.deepEqual(parseVideoInput('https://vimeo.com/123456789'), { provider: 'vimeo', videoRef: '123456789' });
    assert.deepEqual(parseVideoInput('https://vimeo.com/123456789/abcdef1234'), { provider: 'vimeo', videoRef: '123456789/abcdef1234' });
    assert.deepEqual(parseVideoInput('https://player.vimeo.com/video/123456789?h=abcdef1234'), { provider: 'vimeo', videoRef: '123456789/abcdef1234' });
  });
  test('直接の動画ファイルは https のみ', () => {
    assert.deepEqual(parseVideoInput('https://example.com/a.mp4'), { provider: 'url', videoRef: 'https://example.com/a.mp4' });
    assert.equal(parseVideoInput('http://example.com/a.mp4'), null);
    assert.equal(parseVideoInput('javascript:alert(1)'), null);
    assert.equal(parseVideoInput('ftp://example.com/a.mp4'), null);
    assert.equal(parseVideoInput(''), null);
    assert.equal(parseVideoInput('   '), null);
  });
  test('embedUrl：形式が正しいときだけ埋め込みURLを返す', () => {
    assert.equal(
      embedUrl('youtube', 'dQw4w9WgXcQ'),
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1'
    );
    assert.equal(embedUrl('vimeo', '123456789/abcdef1234'), 'https://player.vimeo.com/video/123456789?h=abcdef1234');
    assert.equal(embedUrl('vimeo', '123456789'), 'https://player.vimeo.com/video/123456789');
    // DB に不正な値が入っていても、iframe には入れない
    assert.equal(embedUrl('youtube', '"><script>alert(1)</script>'), null);
    assert.equal(embedUrl('youtube', 'abc'), null);
    assert.equal(embedUrl('vimeo', '12/../etc'), null);
    assert.equal(embedUrl('url', 'https://example.com/a.mp4'), null);
  });
  test('directVideoUrl', () => {
    assert.equal(directVideoUrl('https://example.com/a.mp4'), 'https://example.com/a.mp4');
    assert.equal(directVideoUrl('javascript:alert(1)'), null);
    assert.equal(directVideoUrl('http://example.com/a.mp4'), null);
  });
});

/* -------------------------------------------------------------------------- */
describe('inputs', () => {
  const body = { loggedOn: '2026-10-03', weightKg: '', bodyFatPct: '', muscleKg: '', note: '' };

  test('体組成：どれか1つは必須', () => {
    const r = parseBodyForm(body);
    assert.equal(r.ok, false);
  });
  test('体組成：全角の数字と小数点を受け付ける', () => {
    const r = parseBodyForm({ ...body, weightKg: '５２．４', bodyFatPct: '24.1' });
    assert.ok(r.ok);
    assert.equal(r.value.weightKg, 52.4);
    assert.equal(r.value.bodyFatPct, 24.1);
    assert.equal(r.value.muscleKg, null);
  });
  test('体組成：範囲外・数字でない値を弾く（DBの制約と同じ範囲）', () => {
    assert.equal(parseBodyForm({ ...body, weightKg: '500' }).ok, false);
    assert.equal(parseBodyForm({ ...body, weightKg: '19.9' }).ok, false);
    assert.equal(parseBodyForm({ ...body, bodyFatPct: '95' }).ok, false);
    assert.equal(parseBodyForm({ ...body, muscleKg: '4' }).ok, false);
    assert.equal(parseBodyForm({ ...body, weightKg: 'abc' }).ok, false);
    assert.equal(parseBodyForm({ ...body, weightKg: '5 2' }).ok, false);
    assert.equal(parseBodyForm({ ...body, weightKg: '20' }).ok, true);
    assert.equal(parseBodyForm({ ...body, weightKg: '300' }).ok, true);
  });
  test('体組成：日付とメモの検証', () => {
    assert.equal(parseBodyForm({ ...body, weightKg: '50', loggedOn: '2026-02-30' }).ok, false);
    assert.equal(parseBodyForm({ ...body, weightKg: '50', note: 'あ'.repeat(501) }).ok, false);
    assert.equal(parseBodyForm({ ...body, weightKg: '50', note: 'あ'.repeat(500) }).ok, true);
  });
  test('食事', () => {
    const f = { loggedOn: '2026-10-03', mealType: 'lunch', content: 'おにぎり', note: '' };
    assert.ok(parseMealForm(f).ok);
    assert.equal(parseMealForm({ ...f, content: '   ' }).ok, false);
    assert.equal(parseMealForm({ ...f, mealType: 'brunch' }).ok, false);
    assert.equal(parseMealForm({ ...f, content: 'あ'.repeat(501) }).ok, false);
  });
  test('トレーニング：回数・セット数は整数', () => {
    const f = { loggedOn: '2026-10-03', exercise: 'スクワット', weightKg: '20', reps: '10', sets: '3', note: '' };
    const ok = parseWorkoutForm(f);
    assert.ok(ok.ok);
    assert.equal(ok.value.reps, 10);
    assert.equal(parseWorkoutForm({ ...f, reps: '10.5' }).ok, false);
    assert.equal(parseWorkoutForm({ ...f, reps: '0' }).ok, false);
    assert.equal(parseWorkoutForm({ ...f, exercise: '' }).ok, false);
    // 重さは空欄でも、自重の種目として保存できる
    const bodyweight = parseWorkoutForm({ ...f, weightKg: '' });
    assert.ok(bodyweight.ok);
    assert.equal(bodyweight.value.weightKg, null);
  });
  test('ログイン用コードとメール', () => {
    assert.equal(normalizeCode('123456'), '123456');
    assert.equal(normalizeCode(' 123 456 '), '123456');
    assert.equal(normalizeCode('１２３４５６'), '123456');
    assert.equal(normalizeCode('12345'), null);
    assert.equal(normalizeCode('abcdef'), null);
    assert.equal(normalizeCode('12345678'), '12345678'); // 桁数は Supabase の設定で変わる
    assert.equal(isPlausibleEmail('a@b.co'), true);
    assert.equal(isPlausibleEmail('a@b'), false);
    assert.equal(isPlausibleEmail('a b@c.jp'), false);
  });
});

/* -------------------------------------------------------------------------- */
describe('stats', () => {
  const log = (loggedOn: string, weightKg: number | null, id = loggedOn): BodyLog => ({
    id, loggedOn, weightKg, bodyFatPct: null, muscleKg: null, note: '',
  });

  test('bodySeries：古い順・値のない日は除外', () => {
    const logs = [log('2026-10-03', 55), log('2026-10-02', null), log('2026-10-01', 56)];
    assert.deepEqual(bodySeries(logs, 'weightKg'), [
      { date: '2026-10-01', value: 56 },
      { date: '2026-10-03', value: 55 },
    ]);
  });
  test('bodySeries：同じ日に複数あれば、新しい入力（先に出てくる方）を採用', () => {
    const logs = [log('2026-10-03', 55, 'new'), log('2026-10-03', 99, 'old')];
    assert.deepEqual(bodySeries(logs, 'weightKg'), [{ date: '2026-10-03', value: 55 }]);
  });
  test('latestChange', () => {
    assert.equal(latestChange([]), null);
    assert.deepEqual(latestChange([{ date: '2026-10-01', value: 56 }]), { latest: { date: '2026-10-01', value: 56 }, diff: null });
    const c = latestChange([{ date: '2026-10-01', value: 56.4 }, { date: '2026-10-08', value: 55.7 }]);
    assert.equal(c?.diff, -0.7); // 浮動小数点の誤差（-0.70000001）を出さない
  });
  test('yRange：値が1つでも全部同じでも、線が潰れない', () => {
    const one = yRange([55]);
    assert.ok(one.max > one.min);
    const same = yRange([55, 55, 55]);
    assert.ok(same.max > same.min);
    const many = yRange([50, 60]);
    assert.ok(many.min < 50 && many.max > 60);
    assert.deepEqual(yRange([]), { min: 0, max: 1 });
  });
  test('groupByDate：新しい日が先、日の中の順は保つ', () => {
    const items = [
      { loggedOn: '2026-10-01', n: 1 }, { loggedOn: '2026-10-03', n: 2 }, { loggedOn: '2026-10-03', n: 3 },
    ];
    const g = groupByDate(items);
    assert.deepEqual(g.map((x) => x.date), ['2026-10-03', '2026-10-01']);
    assert.deepEqual(g[0].items.map((x) => x.n), [2, 3]);
  });
});

/* -------------------------------------------------------------------------- */
/* デモ用データ層：本番（RLS）と同じ振る舞いになっているかを確かめる            */
/* -------------------------------------------------------------------------- */
describe('demoApi（本番のアクセス制御と同じ振る舞い）', async () => {
  // localStorage の代わり
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;

  const { demoApi: api, resetDemoData, DEMO_CODE } = await import('./demoApi.ts');
  const today = '2026-10-03';
  const login = async (email: string) => {
    await api.verifyCode(email, DEMO_CODE);
  };

  beforeEach(() => {
    store.clear();
    resetDemoData();
  });

  test('コードが違えばログインできない', async () => {
    await assert.rejects(() => api.verifyCode('a@example.com', '000000'));
    assert.equal(await api.getMe(), null);
  });

  test('同意するまで、記録は書き込めない', async () => {
    await login('alice@example.com');
    await assert.rejects(() => api.addBody({ loggedOn: today, weightKg: 50, bodyFatPct: null, muscleKg: null, note: '' }));
    await assert.rejects(() => api.addMeal({ loggedOn: today, mealType: 'lunch', content: 'x', note: '' }));
    await assert.rejects(() => api.addWorkout({ loggedOn: today, exercise: 'x', weightKg: null, reps: null, sets: null, note: '' }));
    await api.consent();
    await api.addBody({ loggedOn: today, weightKg: 50, bodyFatPct: null, muscleKg: null, note: '' });
    assert.equal((await api.listBody()).length, 1);
  });

  test('会員は自分の記録しか見えない・消せない', async () => {
    await login('alice@example.com');
    await api.consent();
    await api.addBody({ loggedOn: today, weightKg: 50, bodyFatPct: null, muscleKg: null, note: '' });
    const aliceLogId = (await api.listBody())[0].id;
    await api.signOut();

    await login('bob@example.com');
    await api.consent();
    assert.equal((await api.listBody()).length, 0, 'bob に alice の記録は見えない');
    await api.deleteBody(aliceLogId); // 他人の記録を消そうとしても何も起きない
    await api.signOut();

    await login('alice@example.com');
    assert.equal((await api.listBody()).length, 1, 'alice の記録は残っている');
  });

  test('会員は管理者の操作ができない', async () => {
    await login('alice@example.com');
    await assert.rejects(() => api.adminListMembers());
    await assert.rejects(() => api.adminListVideos());
    await assert.rejects(() => api.adminGetMemberLogs('demo-member-1'));
    await assert.rejects(() =>
      api.adminSaveVideo({ title: 'x', description: '', category: '', provider: 'youtube', videoRef: 'dQw4w9WgXcQ', visibility: 'all', published: true, sortOrder: 0 })
    );
    await assert.rejects(() => api.adminDeleteVideo('demo-video-1'));
    await assert.rejects(() => api.adminSetAssignments('demo-video-1', ['x']));
  });

  test('施術者は会員の記録を読める（サンプル会員の分）', async () => {
    await login('admin@example.com');
    const members = await api.adminListMembers();
    assert.ok(members.length >= 2);
    assert.ok(members.every((m) => m.email !== 'admin@example.com'), '管理者は会員一覧に出ない');
    const logs = await api.adminGetMemberLogs('demo-member-1');
    assert.ok(logs.body.length > 0);
  });

  test('動画：非公開は見えない／割り当て型は割り当てられた人だけ', async () => {
    await login('alice@example.com'); // デモでは、新規会員に「割り当て型」の動画が1本つく
    const titles = (await api.listVideos()).map((v) => v.title);
    assert.ok(titles.includes('呼吸のリセット（3分）'));
    assert.ok(titles.includes('肩まわりのストレッチ'), '自分に割り当てられた動画');
    assert.ok(!titles.some((t) => t.includes('下書き')), '非公開は見えない');
    await api.signOut();

    // 施術者が割り当てを外すと、alice からは見えなくなる
    await login('admin@example.com');
    await api.adminSetAssignments('demo-video-2', []);
    await api.signOut();
    await login('alice@example.com');
    assert.ok(!(await api.listVideos()).some((v) => v.id === 'demo-video-2'));
    assert.equal(await api.getVideo('demo-video-2'), null);
  });

  test('施術者が動画を登録・更新・削除できる。割り当ても保存される', async () => {
    await login('admin@example.com');
    const saved = await api.adminSaveVideo({
      title: '新しい動画', description: '説明', category: '呼吸', provider: 'youtube',
      videoRef: 'dQw4w9WgXcQ', visibility: 'assigned', published: true, sortOrder: 5,
    });
    assert.ok(saved.id);
    await api.adminSetAssignments(saved.id, ['demo-member-1', 'demo-member-1', 'demo-member-2']);
    assert.deepEqual((await api.adminGetAssignments(saved.id)).sort(), ['demo-member-1', 'demo-member-2']);

    const updated = await api.adminSaveVideo({ ...saved, title: '題名を変更' });
    assert.equal(updated.id, saved.id);
    assert.equal((await api.adminListVideos()).find((v) => v.id === saved.id)?.title, '題名を変更');

    await api.adminDeleteVideo(saved.id);
    assert.ok(!(await api.adminListVideos()).some((v) => v.id === saved.id));
    assert.deepEqual(await api.adminGetAssignments(saved.id), [], '割り当ても一緒に消える');
  });

  test('施術者も、会員画面では会員と同じ見え方（下書きは出ない）', async () => {
    await login('admin@example.com');
    assert.ok(!(await api.listVideos()).some((v) => v.title.includes('下書き')));
    assert.ok((await api.adminListVideos()).some((v) => v.title.includes('下書き')));
  });

  test('自分の記録をすべて削除できる（アカウントは残る）', async () => {
    await login('alice@example.com');
    await api.consent();
    await api.addBody({ loggedOn: today, weightKg: 50, bodyFatPct: null, muscleKg: null, note: '' });
    await api.addMeal({ loggedOn: today, mealType: 'lunch', content: 'x', note: '' });
    await api.addWorkout({ loggedOn: today, exercise: 'x', weightKg: null, reps: null, sets: null, note: '' });
    await api.deleteAllMyLogs();
    assert.equal((await api.listBody()).length + (await api.listMeals()).length + (await api.listWorkouts()).length, 0);
    assert.ok(await api.getMe());
  });

  test('ログインしていなければ、何も読めない', async () => {
    await assert.rejects(() => api.listBody());
    await assert.rejects(() => api.listVideos());
  });
});
