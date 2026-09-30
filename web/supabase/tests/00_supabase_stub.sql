-- Supabase の auth スキーマとロールを、テスト用に最小限で再現する
-- （本番の Supabase には最初から存在するので、このファイルは実行しない）
create role anon nologin;
create role authenticated nologin;

create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text);

-- 本物と同じ挙動：JWT の sub を返す。未ログインなら null
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

grant usage on schema auth   to anon, authenticated;
grant usage on schema public to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
