import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { todayLocal, isValidDateString, formatDateJa, daysBetween, toDateString } from './dates.ts';
import { parseVideoInput, embedUrl, directVideoUrl } from './video.ts';
import { parseBodyForm, parseMealForm, parseWorkoutForm, parseActivityForm, parseComment, normalizeCode, isPlausibleEmail } from './inputs.ts';
import { bodySeries, latestChange, yRange, groupByDate } from './stats.ts';
import type { BodyLog } from './types.ts';
import {
  applySession, revertSession, newTicket, pickTicket, ticketUsable, ticketExpired, daysLeft, expiringSoon, usableCount, ticketFromInput, TICKET_KINDS,
  type Ticket,
} from './karteRules.ts';
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
describe('karteRules（回数券・キャンセル・期限）', () => {
  const T = '2026-11-10';
  const t = (id: string, o: Partial<Ticket> = {}): Ticket => ({ ...newTicket(id, 't4', '2026-11-01'), ...o });

  test('日付：月末をはみ出さない／月末日', () => {
    assert.equal(addMonthsString('2026-01-31', 1), '2026-02-28');
    assert.equal(addMonthsString('2026-12-15', 2), '2027-02-15');
    assert.equal(endOfMonthString('2026-02-10'), '2026-02-28');
  });

  test('券の種類：HPの料金・回数・期限（2回券30分2か月／4回券3か月／8回券4か月）', () => {
    const t2 = newTicket('a', 't2', '2026-11-10');
    assert.deepEqual([t2.label, t2.total, t2.minutes, t2.expiresOn], ['2回券（30分）', 2, 30, '2027-01-10']);
    const t4 = newTicket('b', 't4', '2026-11-10');
    assert.deepEqual([t4.total, t4.minutes, t4.expiresOn], [4, 60, '2027-02-10']);
    const t8 = newTicket('c', 't8', '2026-11-10');
    assert.deepEqual([t8.total, t8.minutes, t8.expiresOn], [8, 60, '2027-03-10']);
    assert.deepEqual([TICKET_KINDS.t2.price, TICKET_KINDS.t4.price, TICKET_KINDS.t8.price], [9400, 35200, 65600]);
  });

  test('「その他の券」は名前・回数・期限を手入力。種類つきの券は自動', () => {
    const o = ticketFromInput('x', { kind: 'other', label: ' ストレッチ4回券 ', total: 4, remain: 3, purchasedOn: T, expiresOn: '2027-01-31' });
    assert.deepEqual([o.label, o.total, o.remain, o.expiresOn], ['ストレッチ4回券', 4, 3, '2027-01-31']);
    const a = ticketFromInput('y', { kind: 't8', label: '', total: 0, remain: 0, purchasedOn: T, expiresOn: null });
    assert.deepEqual([a.total, a.remain, a.expiresOn], [8, 8, '2027-03-10']);
  });

  test('使える券：残りがあり、期限の日までは使える。期限の翌日からは使えない', () => {
    assert.equal(ticketUsable(t('a', { expiresOn: '2026-11-10' }), T), true);
    assert.equal(ticketUsable(t('a', { expiresOn: '2026-11-09' }), T), false);
    assert.equal(ticketExpired(t('a', { expiresOn: '2026-11-09' }), T), true);
    assert.equal(ticketUsable(t('a', { remain: 0 }), T), false);
    assert.equal(ticketExpired(t('a', { remain: 0, expiresOn: '2026-11-09' }), T), false, '残りがなければ「期限切れ」として扱わない');
    assert.equal(ticketUsable(t('a', { expiresOn: null }), T), true, '期限なしの券');
  });

  test('複数の券：期限の近い券から使う。期限切れ・残りなしは飛ばす', () => {
    const tickets = [
      t('late', { expiresOn: '2027-02-01' }),
      t('soon', { expiresOn: '2026-12-01' }),
      t('gone', { expiresOn: '2026-11-05' }), // 期限切れ
      t('empty', { expiresOn: '2026-11-20', remain: 0 }),
    ];
    assert.equal(pickTicket(tickets, T)?.id, 'soon');
    const r = applySession(tickets, 'regular60', T);
    assert.deepEqual([r.consumed, r.ticketId, r.changed.map((x) => [x.id, x.remain])], [1, 'soon', [['soon', 3]]]);
    assert.equal(pickTicket(tickets, T, { preferId: 'late' })?.id, 'late', '指定した券を使える');
    assert.equal(pickTicket(tickets, T, { preferId: 'gone' })?.id, 'soon', '期限切れの券は指定しても使えない');
  });

  test('30分と60分：2回券は30分、4回券・8回券は60分。長さの合う券だけを使う', () => {
    const tickets = [newTicket('s', 't2', '2026-11-01'), newTicket('f', 't4', '2026-11-01')];
    assert.equal(applySession(tickets, 'regular30', T).ticketId, 's');
    assert.equal(applySession(tickets, 'regular60', T).ticketId, 'f');
    const only60 = applySession([newTicket('f', 't4', '2026-11-01')], 'regular30', T);
    assert.equal(only60.consumed, 0);
    assert.match(only60.note, /30分の回数券がありません/);
  });

  test('使える券がなければ、回数は減らさずに記録だけ', () => {
    const r = applySession([t('a', { remain: 0 })], 'regular60', T);
    assert.deepEqual([r.consumed, r.changed.length], [0, 0]);
  });

  test('単発：初回体験3,300／都度ビジター10,000（回数は減らさない）', () => {
    const tr = applySession([t('a')], 'trial', T);
    assert.deepEqual([tr.amount, tr.consumed], [3300, 0]);
    assert.equal(applySession([t('a')], 'visitor', T).amount, 10000);
  });

  test('キャンセル：前日までは回数を減らさない／当日・無断は回数券でも1回分を消化／免除できる', () => {
    const tickets = [t('a')];
    assert.equal(applySession(tickets, 'cancel_free', T).consumed, 0);
    const same = applySession(tickets, 'cancel_same', T);
    assert.deepEqual([same.consumed, same.ticketId, same.changed[0].remain], [1, 'a', 3]);
    const ns = applySession(tickets, 'noshow', T);
    assert.deepEqual([ns.consumed, ns.changed[0].remain], [1, 3]);
    assert.match(ns.note, /無断キャンセル/);
    assert.equal(applySession(tickets, 'noshow', T, { waive: true }).consumed, 0);
    assert.equal(applySession(tickets, 'cancel_same', T, { waive: true }).consumed, 0);
    const none = applySession([], 'cancel_same', T);
    assert.deepEqual([none.consumed, none.changed.length], [0, 0]);
  });

  test('オンライン・ストレッチは「その他の券」から。なければ記録だけ', () => {
    const other = ticketFromInput('o', { kind: 'other', label: 'ストレッチ4回券', total: 4, remain: 4, purchasedOn: T, expiresOn: '2027-01-31' });
    const r = applySession([t('a'), other], 'stretch', T);
    assert.deepEqual([r.ticketId, r.changed[0].remain], ['o', 3]);
    const none = applySession([t('a')], 'online', T);
    assert.deepEqual([none.consumed, none.changed.length], [0, 0]);
    assert.match(none.note, /その他の券/);
  });

  test('記録を消すと、使った券の回数が元に戻る（上限は回数まで。券が消えていれば何もしない）', () => {
    const tickets = [t('a', { remain: 2 })];
    assert.equal(revertSession(tickets, { consumed: 1, ticketId: 'a' })[0].remain, 3);
    assert.equal(revertSession([t('a', { remain: 4 })], { consumed: 1, ticketId: 'a' })[0].remain, 4);
    assert.deepEqual(revertSession(tickets, { consumed: 1, ticketId: 'zzz' }), []);
    assert.deepEqual(revertSession(tickets, { consumed: 0, ticketId: 'a' }), []);
    assert.deepEqual(revertSession(tickets, { consumed: 1, ticketId: null }), []);
  });

  test('期限が近い券：14日以内。会員への案内と、カルテの「お声がけの目安」に使う', () => {
    const tickets = [
      t('near', { expiresOn: '2026-11-24' }),   // あと14日
      t('far', { expiresOn: '2026-11-25' }),    // あと15日
      t('expired', { expiresOn: '2026-11-09' }),
      t('none', { expiresOn: null }),
    ];
    assert.equal(daysLeft(tickets[0], T), 14);
    assert.deepEqual(expiringSoon(tickets, T).map((x) => x.id), ['near']);
    assert.equal(daysLeft(tickets[2], T), null);
    assert.equal(daysLeft(tickets[3], T), null);
    assert.equal(usableCount(tickets, T), 12, '使える残りの合計（期限切れは入れない）');
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
    assert.ok(status && status.tickets.length >= 1);
    assert.ok(status.tickets.every((x) => x.remain > 0 && (!x.expiresOn || x.expiresOn >= today)), '使える券だけが会員に返る');
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
    await assert.rejects(() => api.adminRecordSession('demo-client-1', { sessionDate: today, choice: 'regular60', menu: '', homecare: '', condition: '', share: true, waive: false }));
    await api.signOut();

    await login('admin@example.com');
    const clients = await api.adminListClients();
    assert.ok(clients.length >= 2);
    const created = await api.adminSaveClient({
      name: '新規 太郎', kana: '', gender: '男性', phone: '', email: '', referrer: '紹介者A', hobby: '',
      targetLabel: '', targetDate: null, consentOn: today, purpose: '肩の張り', goal: '', intakeBody: '', posture: '秘密の見立て',
      homework: '呼吸を朝晩', internalNote: '内部メモ',
    });
    assert.match(created.code, /^TNK-\d{4}$/);
    const msg = await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular60', menu: '券なし', homecare: '', condition: '内部', share: false, waive: false });
    assert.match(msg, /使える60分の回数券がありません/, '券がなければ、回数は減らさない');
    await api.adminAddTicket(created.id, { kind: 't4', label: '', total: 0, remain: 0, purchasedOn: today, expiresOn: null });
    const bought = (await api.adminListClients()).find((c) => c.id === created.id)?.tickets ?? [];
    assert.deepEqual([bought.length, bought[0].remain, bought[0].total], [1, 4, 4]);
    assert.match(await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular60', menu: 'ストレッチ', homecare: '呼吸', condition: '内部', share: true, waive: false }), /1回使いました/);
    const remainOf = async () => (await api.adminListClients()).find((c) => c.id === created.id)?.tickets[0].remain;
    assert.equal(await remainOf(), 3);
    const used = (await api.adminListSessions(created.id)).find((x) => x.consumed === 1);
    assert.ok(used);
    await api.adminDeleteSession(used.id);
    assert.equal(await remainOf(), 4, '記録を消すと回数が戻る');
    await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular60', menu: '2回目', homecare: '', condition: '', share: false, waive: false });
    await api.adminRecordSession(created.id, { sessionDate: today, choice: 'regular60', menu: '3回目（共有）', homecare: '', condition: '', share: true, waive: false });
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
    assert.ok(mine && mine.name === '新規 太郎' && mine.homework === '呼吸を朝晩' && mine.tickets.reduce((n, x) => n + x.remain, 0) === 2);
    assert.ok(!JSON.stringify(mine).includes('秘密の見立て') && !JSON.stringify(mine).includes('内部メモ') && !JSON.stringify(mine).includes('紹介者A'));
    const sessions = await api.listMySessions();
    assert.deepEqual(sessions.map((x) => x.menu), ['3回目（共有）'], '共有をオフにした記録と、内部の状態メモは見えない');
  });
});

