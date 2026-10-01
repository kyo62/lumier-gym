-- =============================================================================
-- アクセス制御のテスト。どれか1つでも期待とずれたら、その場で例外になる。
-- =============================================================================
\set ON_ERROR_STOP on
\o /dev/null

-- ---- テスト用ヘルパー（実行者の権限で動くので、RLS がそのまま効く） ---------
create schema t;
grant usage on schema t to anon, authenticated;

-- 指定した SQL が「失敗する」ことを確認する
create function t.expect_error(label text, q text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    raise notice 'OK   (拒否された)  %  → %', label, sqlerrm;
    return;
  end;
  raise exception 'NG   拒否されるべきなのに通った: %', label;
end $$;

-- 指定した SELECT の件数が n であることを確認する
create function t.expect_count(label text, q text, n int) returns void language plpgsql as $$
declare c int;
begin
  execute 'select count(*) from (' || q || ') s' into c;
  if c <> n then
    raise exception 'NG   % : 期待 % 件 / 実際 % 件', label, n, c;
  end if;
  raise notice 'OK   %  (% 件)', label, c;
end $$;

-- 更新・削除が「0 行に効いた」ことを確認する（RLS は例外でなく黙って 0 行にする）
create function t.expect_affected(label text, q text, n int) returns void language plpgsql as $$
declare c int;
begin
  execute q;
  get diagnostics c = row_count;
  if c <> n then
    raise exception 'NG   % : 期待 % 行 / 実際 % 行', label, n, c;
  end if;
  raise notice 'OK   %  (% 行)', label, c;
end $$;
grant execute on all functions in schema t to anon, authenticated;

-- ---- 登場人物 ---------------------------------------------------------------
-- alice: 会員 / bob: 会員 / carol: 施術者(管理者) / dave: 同意していない会員
insert into auth.users (id, email) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'alice@example.com'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'bob@example.com'),
  ('cccccccc-0000-0000-0000-000000000003', 'carol@example.com'),
  ('dddddddd-0000-0000-0000-000000000004', 'dave@example.com');

-- トリガでプロフィールが自動作成されていること
do $$ begin
  if (select count(*) from public.profiles) <> 4 then
    raise exception 'NG   プロフィールが自動作成されていない';
  end if;
  raise notice 'OK   ユーザー作成時にプロフィールが自動作成される';
end $$;

update public.profiles set is_admin = true where email = 'carol@example.com';
update public.profiles set consented_at = now() where email in ('alice@example.com', 'bob@example.com');

-- ============================================================================
\echo '--- 1. 未ログイン（anon）には何も見せない'
set role anon;
select t.expect_error('anon は profiles を読めない',  'select * from public.profiles');
select t.expect_error('anon は body_logs を読めない', 'select * from public.body_logs');
select t.expect_error('anon は videos を読めない',    'select * from public.videos');
reset role;

-- ============================================================================
\echo '--- 2. 同意（consented_at）が済むまで、記録は書き込めない'
set role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-0000-0000-0000-000000000004', false);
select t.expect_error('dave(未同意)は体組成を書けない',
  $q$ insert into public.body_logs (logged_on, weight_kg) values (current_date, 55) $q$);
select t.expect_error('dave(未同意)は食事を書けない',
  $q$ insert into public.meal_logs (logged_on, meal_type, content) values (current_date, 'lunch', 'x') $q$);
select t.expect_error('dave(未同意)はトレーニングを書けない',
  $q$ insert into public.workout_logs (logged_on, exercise) values (current_date, 'x') $q$);
-- 同意すると書ける
update public.profiles set consented_at = now() where id = 'dddddddd-0000-0000-0000-000000000004';
insert into public.body_logs (logged_on, weight_kg) values (current_date, 55);
\echo 'OK   dave は同意したあとは書き込める'
reset role;

-- ============================================================================
\echo '--- 3. 会員は自分の記録だけ読み書きできる'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
insert into public.body_logs    (logged_on, weight_kg, body_fat_pct, note) values (current_date, 52.4, 24.1, 'メモ');
insert into public.meal_logs    (logged_on, meal_type, content)            values (current_date, 'breakfast', 'ごはん、味噌汁');
insert into public.workout_logs (logged_on, exercise, weight_kg, reps, sets) values (current_date, 'スクワット', 20, 10, 3);
select t.expect_count('alice は自分の体組成が見える', 'select 1 from public.body_logs', 1);

select t.expect_error('他人(bob)になりすまして書き込めない',
  $q$ insert into public.body_logs (user_id, logged_on, weight_kg)
      values ('bbbbbbbb-0000-0000-0000-000000000002', current_date, 60) $q$);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select t.expect_count('bob には alice の体組成が見えない',        'select 1 from public.body_logs where user_id = ''aaaaaaaa-0000-0000-0000-000000000001''', 0);
select t.expect_count('bob には alice の食事が見えない',          'select 1 from public.meal_logs', 0);
select t.expect_count('bob には alice のトレーニングが見えない',  'select 1 from public.workout_logs', 0);
select t.expect_affected('bob は alice の記録を更新できない（0行）', $q$ update public.body_logs set weight_kg = 99 $q$, 0);
select t.expect_affected('bob は alice の記録を削除できない（0行）', $q$ delete from public.body_logs $q$, 0);
select t.expect_count('bob には他人のプロフィールが見えない', 'select 1 from public.profiles where id <> ''bbbbbbbb-0000-0000-0000-000000000002''', 0);
reset role;

-- ============================================================================
\echo '--- 4. 会員は自分を管理者にできない'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select t.expect_error('alice は is_admin を書き換えられない',
  $q$ update public.profiles set is_admin = true where id = auth.uid() $q$);
select t.expect_error('alice は email を書き換えられない',
  $q$ update public.profiles set email = 'x@example.com' where id = auth.uid() $q$);
update public.profiles set display_name = 'アリス' where id = auth.uid();
\echo 'OK   alice は表示名は変えられる'
select t.expect_error('profiles は直接 insert できない',
  $q$ insert into public.profiles (id, is_admin) values (gen_random_uuid(), true) $q$);
reset role;

-- ============================================================================
\echo '--- 5. 施術者(carol)は会員の記録を「読むだけ」'
set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
select t.expect_count('carol は全員の体組成が見える',   'select 1 from public.body_logs', 2);
select t.expect_count('carol は alice の食事が見える',   'select 1 from public.meal_logs', 1);
select t.expect_count('carol は全員のプロフィールが見える', 'select 1 from public.profiles', 4);
select t.expect_affected('carol は会員の記録を更新できない（0行）', $q$ update public.body_logs set weight_kg = 1 $q$, 0);
select t.expect_affected('carol は会員の記録を削除できない（0行）', $q$ delete from public.meal_logs $q$, 0);
select t.expect_error('carol は会員に成りすまして書き込めない',
  $q$ insert into public.body_logs (user_id, logged_on, weight_kg)
      values ('aaaaaaaa-0000-0000-0000-000000000001', current_date, 50) $q$);
reset role;

-- ============================================================================
\echo '--- 6. 入力値の検証（DB側の制約）'
set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select t.expect_error('体組成が全部空は不可',
  $q$ insert into public.body_logs (logged_on) values (current_date) $q$);
select t.expect_error('体重 500kg は不可',
  $q$ insert into public.body_logs (logged_on, weight_kg) values (current_date, 500) $q$);
select t.expect_error('体脂肪率 95% は不可',
  $q$ insert into public.body_logs (logged_on, body_fat_pct) values (current_date, 95) $q$);
select t.expect_error('食事の種類が不正',
  $q$ insert into public.meal_logs (logged_on, meal_type, content) values (current_date, 'brunch', 'x') $q$);
select t.expect_error('食事の内容が空は不可',
  $q$ insert into public.meal_logs (logged_on, meal_type, content) values (current_date, 'lunch', '') $q$);
select t.expect_error('回数 0 は不可',
  $q$ insert into public.workout_logs (logged_on, exercise, reps) values (current_date, 'x', 0) $q$);
reset role;

-- ============================================================================
\echo '--- 7. 動画：公開中・割り当て・管理者だけが書ける'
-- carol(管理者) が動画を登録する
set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
insert into public.videos (id, title, provider, video_ref, visibility, published) values
  ('11111111-0000-0000-0000-000000000001', '全員向け',         'youtube', 'dQw4w9WgXcQ', 'all',      true),
  ('11111111-0000-0000-0000-000000000002', 'aliceだけ',        'youtube', 'abcdefghijk', 'assigned', true),
  ('11111111-0000-0000-0000-000000000003', '非公開',           'vimeo',   '123456789',   'all',      false),
  ('11111111-0000-0000-0000-000000000004', '割当だが非公開',   'youtube', 'zzzzzzzzzzz', 'assigned', false);
insert into public.video_assignments (video_id, user_id) values
  ('11111111-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('11111111-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000001');
select t.expect_count('carol は全ての動画が見える', 'select 1 from public.videos', 4);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-0000-0000-0000-000000000001', false);
select t.expect_count('alice：全員向け＋自分に割当（公開中のみ）= 2件', 'select 1 from public.videos', 2);
select t.expect_count('alice は非公開の動画が見えない',
  $q$ select 1 from public.videos where title in ('非公開', '割当だが非公開') $q$, 0);
select t.expect_count('alice は自分への割当だけ見える', 'select 1 from public.video_assignments', 2);
select t.expect_error('alice は動画を登録できない',
  $q$ insert into public.videos (title, provider, video_ref) values ('x', 'youtube', 'abcdefghijk') $q$);
select t.expect_error('alice は自分に動画を割り当てられない',
  $q$ insert into public.video_assignments (video_id, user_id)
      values ('11111111-0000-0000-0000-000000000001', auth.uid()) $q$);
select t.expect_affected('alice は動画を更新できない（0行）', $q$ update public.videos set title = 'x' $q$, 0);
select t.expect_affected('alice は動画を削除できない（0行）', $q$ delete from public.videos $q$, 0);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-0000-0000-0000-000000000002', false);
select t.expect_count('bob：全員向けの1件だけ見える', 'select 1 from public.videos', 1);
select t.expect_count('bob には alice への割当が見えない', 'select 1 from public.video_assignments', 0);
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
select t.expect_error('provider の不正値は不可',
  $q$ insert into public.videos (title, provider, video_ref) values ('x', 'nicovideo', 'sm9') $q$);
select t.expect_error('visibility の不正値は不可',
  $q$ insert into public.videos (title, provider, video_ref, visibility) values ('x', 'youtube', 'abcdefghijk', 'public') $q$);
reset role;

-- ============================================================================
\echo '--- 8. ユーザー削除で、関連データがすべて消える（削除依頼への対応）'
delete from auth.users where email = 'alice@example.com';
do $$ begin
  if (select count(*) from public.profiles      where email = 'alice@example.com') <> 0
  or (select count(*) from public.body_logs     where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 0
  or (select count(*) from public.meal_logs     where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 0
  or (select count(*) from public.workout_logs  where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 0
  or (select count(*) from public.video_assignments where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') <> 0
  then raise exception 'NG   ユーザー削除で関連データが残っている'; end if;
  raise notice 'OK   ユーザー削除でプロフィール・記録・割当がすべて消える';
end $$;

\echo ''
\echo '=== すべてのアクセス制御テストに合格 ==='
