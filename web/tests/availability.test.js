const assert = require('node:assert');
const { computeAvailability, openIntervalsFor } = require('../.test-build/availability');

const hours = [
  { weekday: 2, start_time: '10:00', end_time: '19:00', is_open: true }, // 火
  { weekday: 6, start_time: '09:00', end_time: '17:00', is_open: true }, // 土
];
// 2026-04-07 は火曜、2026-04-11 は土曜、2026-04-08 は水曜
const base = {
  blockMin: 75, slotStepMin: 30, leadTimeHours: 24, maxAdvanceDays: 60,
  businessHours: hours, overrides: [], busy: [],
  now: new Date('2026-04-01T00:00:00+09:00'),
};

// 1) 曜日テンプレどおりに枠が出る
let r = computeAvailability({ ...base, fromKey: '2026-04-07', toKey: '2026-04-08' });
assert.strictEqual(r.length, 2);
assert.strictEqual(r[0].date, '2026-04-07');
assert.strictEqual(r[1].slots.length, 0, '水曜は営業日ではないので0枠');
// 10:00開始〜17:45開始まで（19:00までに75分が収まる最後は17:45）
assert.strictEqual(r[0].slots[0], new Date('2026-04-07T10:00:00+09:00').toISOString());
assert.strictEqual(r[0].slots.at(-1), new Date('2026-04-07T17:30:00+09:00').toISOString());
assert.strictEqual(r[0].slots.length, 16);

// 2) 予約済みの時間帯が消える（10:00-11:15の予約 → 10:00/10:30/11:00 が消える）
r = computeAvailability({ ...base, fromKey: '2026-04-07', toKey: '2026-04-07',
  busy: [{ starts_at: '2026-04-07T01:00:00Z', ends_at: '2026-04-07T02:15:00Z' }] });
const times = r[0].slots.map(s => new Date(s).toISOString());
assert.ok(!times.includes(new Date('2026-04-07T10:00:00+09:00').toISOString()));
assert.ok(!times.includes(new Date('2026-04-07T11:00:00+09:00').toISOString()));
assert.ok(times.includes(new Date('2026-04-07T11:30:00+09:00').toISOString()), '11:30は空いているはず');
assert.strictEqual(r[0].slots.length, 13);

// 3) 終日休業の上書き
r = computeAvailability({ ...base, fromKey: '2026-04-07', toKey: '2026-04-07',
  overrides: [{ date: '2026-04-07', kind: 'closed', start_time: null, end_time: null }] });
assert.strictEqual(r[0].slots.length, 0);

// 4) 時間帯指定の休業（12:00-13:00を休憩に）
r = computeAvailability({ ...base, fromKey: '2026-04-07', toKey: '2026-04-07',
  overrides: [{ date: '2026-04-07', kind: 'closed', start_time: '12:00', end_time: '13:00' }] });
const t4 = r[0].slots.map(s => new Date(s).toISOString());
assert.ok(!t4.includes(new Date('2026-04-07T11:30:00+09:00').toISOString()), '11:30開始は12:45終了で休憩に食い込む');
assert.ok(t4.includes(new Date('2026-04-07T13:00:00+09:00').toISOString()));
assert.ok(t4.includes(new Date('2026-04-07T10:00:00+09:00').toISOString()));

// 5) 臨時営業（営業日でない水曜を14:00-18:00で開ける）
r = computeAvailability({ ...base, fromKey: '2026-04-08', toKey: '2026-04-08',
  overrides: [{ date: '2026-04-08', kind: 'open', start_time: '14:00', end_time: '18:00' }] });
assert.strictEqual(r[0].slots[0], new Date('2026-04-08T14:00:00+09:00').toISOString());
assert.strictEqual(r[0].slots.length, 6); // 14:00〜16:30（16:30開始は17:45終了）

// 6) リードタイム（24時間前まで）: 直前の枠は出ない
r = computeAvailability({ ...base, fromKey: '2026-04-07', toKey: '2026-04-07',
  now: new Date('2026-04-06T12:00:00+09:00') });
const t6 = r[0].slots.map(s => new Date(s).toISOString());
assert.ok(!t6.includes(new Date('2026-04-07T10:00:00+09:00').toISOString()), '10:00は22時間後なので受付終了');
assert.ok(t6.includes(new Date('2026-04-07T12:00:00+09:00').toISOString()), '12:00はちょうど24時間後なので受付可');

// 7) 予約可能上限を超える日
r = computeAvailability({ ...base, fromKey: '2026-09-01', toKey: '2026-09-01' });
assert.strictEqual(r[0].slots.length, 0, '60日より先は0枠');

// 8) 営業時間の区間計算
assert.deepStrictEqual(openIntervalsFor('2026-04-07', hours, []), [{ start: 600, end: 1140 }]);
assert.deepStrictEqual(
  openIntervalsFor('2026-04-07', hours, [{ date: '2026-04-07', kind: 'closed', start_time: '12:00', end_time: '13:00' }]),
  [{ start: 600, end: 720 }, { start: 780, end: 1140 }]
);

console.log('availability: 8 グループすべて通過');
