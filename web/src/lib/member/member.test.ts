import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { todayLocal, isValidDateString, formatDateJa, daysBetween, toDateString } from './dates.ts';
import { parseVideoInput, embedUrl, directVideoUrl } from './video.ts';
import { parseBodyForm, parseMealForm, parseWorkoutForm, parseActivityForm, parseComment, normalizeCode, isPlausibleEmail } from './inputs.ts';
import { bodySeries, latestChange, yRange, groupByDate } from './stats.ts';
import type { BodyLog } from './types.ts';
import { applySession, revertSession, rollMonth, carryValid, ticketExpire, type Counters } from './karteRules.ts';
import { addMonthsString, endOfMonthString } from './dates.ts';

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
  test('自主トレ：種類は決まったものだけ・時間は任意の整数', () => {
    const ok = parseActivityForm({ loggedOn: '2026-10-03', kind: 'walk', minutes: '３０', note: ' 駅まで ' });
    assert.ok(ok.ok);
    if (ok.ok) assert.deepEqual(ok.value, { loggedOn: '2026-10-03', kind: 'walk', minutes: 30, note: '駅まで' });
    const noMinutes = parseActivityForm({ loggedOn: '2026-10-03', kind: 'stretch', minutes: '', note: '' });
    assert.ok(noMinutes.ok && noMinutes.value.minutes === null);
    assert.equal(parseActivityForm({ loggedOn: '2026-10-03', kind: 'swim', minutes: '', note: '' }).ok, false);
    assert.equal(parseActivityForm({ loggedOn: '2026-10-03', kind: 'walk', minutes: '0', note: '' }).ok, false);
    assert.equal(parseActivityForm({ loggedOn: '2026-10-03', kind: 'walk', minutes: '601', note: '' }).ok, false);
    assert.equal(parseActivityForm({ loggedOn: '2026-10-03', kind: 'walk', minutes: '1.5', note: '' }).ok, false);
    assert.equal(parseActivityForm({ loggedOn: '2026-02-30', kind: 'walk', minutes: '', note: '' }).ok, false);
    assert.equal(parseActivityForm({ loggedOn: '2026-10-03', kind: 'walk', minutes: '', note: 'あ'.repeat(1001) }).ok, false);
  });

  test('施術者のコメント：空は不可・500文字まで', () => {
    assert.equal(parseComment('   ').ok, false);
    assert.equal(parseComment('あ'.repeat(501)).ok, false);
    assert.ok(parseComment(' いい調子です ').ok);
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
describe('karteRules（回数・繰越・キャンセル）', () => {
  const T = '2026-11-10';
  const base = (o: Partial<Counters> = {}): Counters => ({ plan: 'm4', remain: 4, carry: 0, carryExpire: null, stretchRemain: 0, stretchExpire: null, ...o });

  test('日付：月末をはみ出さない／月末日', () => {
    assert.equal(addMonthsString('2026-01-31', 1), '2026-02-28');
    assert.equal(addMonthsString('2026-12-15', 2), '2027-02-15');
    assert.equal(endOfMonthString('2026-02-10'), '2026-02-28');
    assert.equal(ticketExpire('2026-10-20'), '2026-12-20');
  });

  test('会員の通常セッション：繰越から先に使う。期限切れの繰越は使わない', () => {
    const a = applySession(base({ carry: 1, carryExpire: '2026-11-30' }), 'regular', T);
    assert.deepEqual([a.consumed, a.consumedFrom, a.counters.carry, a.counters.remain], [1, 'carry', 0, 4]);
    const b = applySession(base({ carry: 1, carryExpire: '2026-11-01' }), 'regular', T);
    assert.deepEqual([b.consumedFrom, b.counters.carry, b.counters.remain], ['remain', 1, 3]);
    assert.equal(carryValid({ carry: 1, carryExpire: '2026-11-01' }, T), 0);
  });

  test('残りがなければ、回数は減らさずに記録だけ', () => {
    const r = applySession(base({ remain: 0 }), 'regular', T);
    assert.equal(r.consumed, 0);
    assert.match(r.note, /残り枠がありません/);
  });

  test('単発：体験3,300／ビジター12,000／オンライン10,000', () => {
    assert.equal(applySession(base({ plan: 'trial' }), 'trial', T).amount, 3300);
    assert.equal(applySession(base({ plan: 'visitor' }), 'visitor', T).amount, 12000);
    assert.equal(applySession(base({ plan: 'online' }), 'online', T).amount, 10000);
    assert.equal(applySession(base({ plan: 'visitor' }), 'regular', T).amount, 12000);
  });

  test('キャンセル：前日までは無料／当日は 体験3,300・ビジター6,000・会員1,000／免除', () => {
    assert.equal(applySession(base(), 'cancel_free', T).fee, 0);
    assert.equal(applySession(base(), 'cancel_same', T).fee, 1000);
    assert.equal(applySession(base({ plan: 'trial' }), 'cancel_same', T).fee, 3300);
    assert.equal(applySession(base({ plan: 'visitor' }), 'cancel_same', T).fee, 6000);
    assert.equal(applySession(base(), 'cancel_same', T, true).fee, 0);
    assert.equal(applySession(base({ plan: 'online' }), 'cancel_same', T).fee, 0, 'オンライン単発は未決のため、額を出さない');
  });

  test('無断キャンセル：会員は1回消化／単発は当日と同じ料金／免除できる', () => {
    const m = applySession(base(), 'noshow', T);
    assert.deepEqual([m.consumed, m.counters.remain, m.fee], [1, 3, 0]);
    assert.equal(applySession(base({ plan: 'visitor' }), 'noshow', T).fee, 6000);
    assert.equal(applySession(base(), 'noshow', T, true).consumed, 0);
  });

  test('ストレッチ回数券：ほかのプランと別に数える。期限切れ・残りなしは減らさない', () => {
    const ok = applySession(base({ stretchRemain: 4, stretchExpire: '2026-12-31' }), 'stretch', T);
    assert.deepEqual([ok.consumedFrom, ok.counters.stretchRemain, ok.counters.remain], ['stretch', 3, 4]);
    assert.equal(applySession(base({ stretchRemain: 4, stretchExpire: '2026-11-01' }), 'stretch', T).consumed, 0);
    assert.equal(applySession(base(), 'stretch', T).consumed, 0);
  });

  test('記録を消すと、使った回数が元に戻る', () => {
    const used = applySession(base({ carry: 1, carryExpire: '2026-11-30' }), 'regular', T);
    const back = revertSession(used.counters, used);
    assert.deepEqual([back.carry, back.remain], [1, 4]);
    const st = applySession(base({ stretchRemain: 2, stretchExpire: '2026-12-31' }), 'stretch', T);
    assert.equal(revertSession(st.counters, st).stretchRemain, 2);
    assert.deepEqual(revertSession(base(), { consumed: 0, consumedFrom: null }), base());
  });

  test('月次の締め：残りは翌月末までの繰越。これまでの繰越はなくなる。家族割は繰越なし', () => {
    const r = rollMonth(base({ remain: 2, carry: 1, carryExpire: '2026-11-30' }), T);
    assert.ok(r);
    assert.deepEqual([r.counters.carry, r.counters.carryExpire, r.counters.remain, r.lost], [2, '2026-12-31', 4, 1]);
    const fam = rollMonth(base({ plan: 'fam6', remain: 2 }), T);
    assert.ok(fam);
    assert.deepEqual([fam.counters.carry, fam.counters.carryExpire, fam.counters.remain], [0, null, 6]);
    assert.equal(rollMonth(base({ plan: 'ticket' }), T), null, '月額プラン以外は対象外');
    const none = rollMonth(base({ remain: 0 }), T);
    assert.ok(none && none.counters.carry === 0 && none.counters.carryExpire === null);
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

  test('自主トレ：記録→施術者がコメント→会員が読む。会員は他人のコメントを見られず、コメントを書けない', async () => {
    await login('alice@example.com');
    await assert.rejects(() => api.addActivity({ loggedOn: today, kind: 'walk', minutes: 30, note: '' }), '同意前は書けない');
    await api.consent();
    await api.addActivity({ loggedOn: today, kind: 'walk', minutes: 30, note: '駅まで歩いた' });
    const [log] = await api.listActivities();
    assert.equal(log.comments.length, 0);
    await assert.rejects(() => api.adminAddComment(log.id, 'x'), '会員はコメントを書けない');
    await assert.rejects(() => api.adminListActivities());
    await api.signOut();

    await login('admin@example.com');
    const all = await api.adminListActivities();
    assert.equal(all.length, 1);
    assert.equal(all[0].memberName, 'alice@example.com');
    await api.adminAddComment(log.id, 'いい歩き方でしたね');
    await api.signOut();

    await login('bob@example.com');
    await api.consent();
    assert.equal((await api.listActivities()).length, 0, 'bob に alice の記録・コメントは見えない');
    await api.signOut();

    await login('alice@example.com');
    const mine = await api.listActivities();
    assert.equal(mine[0].comments.length, 1);
    assert.equal(mine[0].comments[0].seenAt, null, '最初は新着');
    await api.markCommentsSeen();
    assert.ok((await api.listActivities())[0].comments[0].seenAt, '読んだことになる');
  });

  test('自主トレを削除すると、コメントも消える。他人の記録は消せない', async () => {
    await login('alice@example.com');
    await api.consent();
    await api.addActivity({ loggedOn: today, kind: 'stretch', minutes: null, note: '' });
    const id = (await api.listActivities())[0].id;
    await api.signOut();
    await login('admin@example.com');
    await api.adminAddComment(id, 'こんにちは');
    await api.signOut();
    await login('bob@example.com');
    await api.deleteActivity(id);
    await api.signOut();
    await login('alice@example.com');
    assert.equal((await api.listActivities()).length, 1, '他人は消せない');
    await api.deleteActivity(id);
    assert.equal((await api.listActivities()).length, 0);
  });

  test('カルテ：デモの会員には、見せてよい項目だけが返る', async () => {
    await login('alice@example.com');
    const status = await api.getMyStatus();
    assert.ok(status && status.remain >= 0);
    assert.ok(!('posture' in status) && !('internalNote' in status) && !('referrer' in status));
    assert.ok((await api.listMySessions()).length >= 1);
  });

  test('自分の記録をすべて削除すると、自主トレとコメントも消える', async () => {
    await login('alice@example.com');
    await api.consent();
    await api.addActivity({ loggedOn: today, kind: 'run', minutes: 20, note: '' });
    await api.deleteAllMyLogs();
    assert.equal((await api.listActivities()).length, 0);
  });

  test('カルテ：施術者が入力→会員に見せる項目だけが、ひもづけた会員に見える', async () => {
    await login('carol@example.com'); // 会員（admin で始まらない）
    await assert.rejects(() => api.adminListClients(), '会員はカルテ一覧を開けない');
    await assert.rejects(() => api.adminRecordSession('demo-client-1', { sessionDate: today, choice: 'regular', menu: '', homecare: '', condition: '', share: true, waive: false }));
    await api.signOut();

    await login('admin@example.com');
    const clients = await api.adminListClients();
    assert.ok(clients.length >= 2);
    const created = await api.adminSaveClient({
      name: '新規 太郎', kana: '', gender: '男性', phone: '', email: '', referrer: '紹介者A', hobby: '', plan: 'm4',
      ticketCount: null, ticketDate: null, remain: 4, carry: 0, carryExpire: null, stretchRemain: 0, stretchExpire: null,
      targetLabel: '', targetDate: null, consentOn: today, purpose: '肩の張り', goal: '', intakeBody: '', posture: '秘密の見立て',
      homework: '呼吸を朝晩', internalNote: '内部メモ',
    });
    assert.match(created.code, /^TNK-\d{4}$/);
    const msg = await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular', menu: 'ストレッチ', homecare: '呼吸', condition: '内部', share: true, waive: false });
    assert.match(msg, /回数を1つ使いました/);
    assert.equal((await api.adminListClients()).find((c) => c.id === created.id)?.remain, 3);
    const [sess] = await api.adminListSessions(created.id);
    await api.adminDeleteSession(sess.id);
    assert.equal((await api.adminListClients()).find((c) => c.id === created.id)?.remain, 4, '記録を消すと回数が戻る');
    await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular', menu: '2回目', homecare: '', condition: '', share: false, waive: false });
    await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular', menu: '3回目（共有）', homecare: '', condition: '', share: true, waive: false });
    await assert.rejects(() => api.adminLinkClient(created.id, 'nobody@example.com'));
    await api.signOut();

    await login('dave@example.com');
    await api.signOut();
    await login('admin@example.com');
    // デモでは、新しい会員にサンプルのカルテが自動でひもづくので、先に外してからひもづけ直す
    const sample = (await api.adminListClients()).find((c) => c.email === 'dave@example.com');
    assert.ok(sample);
    await assert.rejects(() => api.adminLinkClient(created.id, 'dave@example.com'), '1人の会員を2つのカルテにひもづけない');
    await api.adminDeleteClient(sample.id);
    await api.adminLinkClient(created.id, 'dave@example.com');
    await api.signOut();

    await login('dave@example.com');
    const mine = await api.getMyStatus();
    assert.ok(mine && mine.name === '新規 太郎' && mine.homework === '呼吸を朝晩' && mine.remain === 2);
    assert.ok(!JSON.stringify(mine).includes('秘密の見立て') && !JSON.stringify(mine).includes('内部メモ') && !JSON.stringify(mine).includes('紹介者A'));
    const sessions = await api.listMySessions();
    assert.deepEqual(sessions.map((x) => x.menu), ['3回目（共有）'], '共有をオフにした記録と、内部の状態メモは見えない');
  });
});

