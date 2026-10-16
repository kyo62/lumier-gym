-- =============================================================================
-- カルテのアクセス制御テスト（rls_test.sql の続き。同じ登場人物を使う）
-- alice は rls_test の最後で削除済みなので、erin を新しく作る
-- =============================================================================
\set ON_ERROR_STOP on
\o /dev/null

insert into auth.users (id, email) values
  ('eeeeeeee-0000-0000-0000-000000000005', 'erin@example.com'),
  ('ffffffff-0000-0000-0000-000000000006', 'frank@example.com');
update public.profiles set consented_at = now() where email in ('erin@example.com', 'frank@example.com');

\echo ''
\echo '--- K1. 施術者(carol)はカルテを作れる'
set role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-0000-0000-0000-000000000003', false);
insert into public.clients (id, code, name, plan, remain, carry, carry_expire, homework, radar, posture, referrer, internal_note, ticket_date)
values
 ('11111111-1111-1111-1111-111111111111', 'TNK-0001', '山田 花子', 'm4', 3, 1, current_date + 10,
  '肩を回す', '{"呼吸":3}', '【見立て】巻き肩', '紹介者A', '内部メモ', null),
 ('22222222-2222-2222-2222-222222222222', 'TNK-0002', '田中 みどり', 'ticket', 2, 0, null,
  null, '{}', null, null, null, current_date - 20);
insert into public.sessions (client_id, session_date, type, status, menu, homecare, condition, fee)
values
 ('11111111-1111-1111-1111-111111111111', current_date - 7, 'regular', 'attended', '胸まわりのストレッチ', '呼吸を1日3回', '内部の状態メモ', 0),
 ('11111111-1111-1111-1111-111111111111', current_date - 3, 'regular', 'noshow', null, null, null, 1000),
 ('22222222-2222-2222-2222-222222222222', current_date - 1, 'regular', 'attended', '田中さんのメニュー', null, null, 0);
\echo 'OK   carol はカルテと施術記録を作れる'
select t.expect_error('carol でもコード形式の不正は不可',
  $q$ insert into public.clients (code, name) values ('X-1', 'x') $q$);
select public.link_client('11111111-1111-1111-1111-111111111111', 'erin@example.com');
\echo 'OK   carol は link_client で会員ログインをひもづけられる'
select t.expect_error('存在しないメールはひもづけ不可',
  $q$ select public.link_client('22222222-2222-2222-2222-222222222222', 'nobody@example.com') $q$);
reset role;

\echo '--- K2. 会員はカルテのテーブルを直接読めない・書けない'
set role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000005', false);
select t.expect_count('erin は clients が見えない',  'select 1 from public.clients', 0);
select t.expect_count('erin は sessions が見えない', 'select 1 from public.sessions', 0);
select t.expect_error('erin は clients を書けない',
  $q$ insert into public.clients (code, name) values ('TNK-9999', 'x') $q$);
select t.expect_affected('erin は残り回数を書き換えられない（0行）', $q$ update public.clients set remain = 99 $q$, 0);
select t.expect_error('erin は link_client を使えない',
  $q$ select public.link_client('22222222-2222-2222-2222-222222222222', 'erin@example.com') $q$);
reset role;

\echo '--- K3. 会員は自分の分の、見せてよい項目だけ受け取る'
set role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000005', false);
select t.expect_count('erin の my_status は1行', 'select * from public.my_status()', 1);
select t.expect_count('erin の my_status は山田さんの分', $q$select 1 from public.my_status() where name = '山田 花子' and remain = 3 and carry = 1 and homework = '肩を回す'$q$, 1);
select t.expect_count('erin の my_sessions は、来店した1件だけ（無断キャンセルは出ない）', 'select * from public.my_sessions()', 1);
select t.expect_count('メニューは見える', $q$select 1 from public.my_sessions() where menu = '胸まわりのストレッチ' and homecare = '呼吸を1日3回'$q$, 1);
do $$ begin
  -- 関数の戻り列に、内部項目が含まれていないこと
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname in ('my_status', 'my_sessions')
               and pg_get_function_result(p.oid) ~ '(posture|referrer|internal_note|condition|fee|amount|phone|email|body_pins)') then
    raise exception 'NG   会員向け関数に内部項目が含まれている';
  end if;
  raise notice 'OK   会員向け関数の戻り列に、見立て・紹介者・内部メモ・料金などは含まれない';
end $$;
reset role;

\echo '--- K4. ひもづいていない会員・他人には何も出ない'
set role authenticated;
select set_config('request.jwt.claim.sub', 'ffffffff-0000-0000-0000-000000000006', false);
select t.expect_count('frank(ひもづけなし)の my_status は0行',   'select * from public.my_status()', 0);
select t.expect_count('frank(ひもづけなし)の my_sessions は0行', 'select * from public.my_sessions()', 0);
reset role;

\echo '--- K5. 共有を切ったセッションは、会員に出ない'
update public.sessions set share = false where menu = '胸まわりのストレッチ';
set role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000005', false);
select t.expect_count('share=false のセッションは出ない', 'select * from public.my_sessions()', 0);
reset role;

\echo '--- K6. 繰越の期限が切れたら、my_status の繰越は0になる'
update public.clients set carry_expire = current_date - 1 where code = 'TNK-0001';
set role authenticated;
select set_config('request.jwt.claim.sub', 'eeeeeeee-0000-0000-0000-000000000005', false);
select t.expect_count('期限切れの繰越は0', 'select 1 from public.my_status() where carry = 0', 1);
reset role;

\echo '--- K7. 未ログイン(anon)には何も見せない'
set role anon;
select t.expect_error('anon は clients を読めない',  'select * from public.clients');
select t.expect_error('anon は sessions を読めない', 'select * from public.sessions');
select t.expect_error('anon は my_status を呼べない',  'select * from public.my_status()');
select t.expect_error('anon は my_sessions を呼べない', 'select * from public.my_sessions()');
reset role;

\echo '--- K8. 会員を削除しても、カルテは残る（ひもづけだけ外れる）'
delete from auth.users where email = 'erin@example.com';
do $$ begin
  if (select count(*) from public.clients where code = 'TNK-0001' and user_id is null) <> 1 then
    raise exception 'NG   会員の削除で、カルテが消えた／ひもづけが残った';
  end if;
  raise notice 'OK   会員を削除しても、カルテは残り、ひもづけだけ外れる';
end $$;

\echo ''
\echo '=== カルテのアクセス制御テストにも合格 ==='
