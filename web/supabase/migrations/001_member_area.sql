-- =============================================================================
-- TONEKA 会員ページ：テーブルとアクセス制御
--
-- 使い方：Supabase ダッシュボードの「SQL Editor」に、このファイルの中身を
-- そのまま貼って実行してください（1回だけ）。
--
-- 守っていること
--   * 会員は、自分の記録しか読み書きできない
--   * 施術者（is_admin = true）は、会員の記録を「読むだけ」。書き換えられない
--   * 同意（consented_at）が済むまで、記録は1件も書き込めない（DB側で強制）
--   * 会員が自分を管理者にすることはできない（列単位で更新を禁止）
--   * 動画は、公開中のものだけ／割り当てられた会員だけに見える
--   * ログインしていない人（anon）には、何も見せない
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 会員プロフィール
-- -----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  display_name text check (char_length(display_name) <= 40),
  is_admin     boolean not null default false,
  consented_at timestamptz,
  created_at   timestamptz not null default now()
);

-- ユーザー作成時にプロフィールを自動で作る
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- すでに作成済みのユーザーがいれば、プロフィールを補う
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 判定用の関数
-- RLSの中から profiles を直接引くと再帰するため、security definer で包む
-- -----------------------------------------------------------------------------
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false)
$$;

create function public.has_consented()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select p.consented_at is not null from public.profiles p where p.id = auth.uid()), false)
$$;

revoke all on function public.is_admin() from public;
revoke all on function public.has_consented() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.has_consented() to authenticated;

-- -----------------------------------------------------------------------------
-- 記録：体組成 / 食事 / トレーニング
-- -----------------------------------------------------------------------------
create table public.body_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on    date not null,
  weight_kg    numeric(5, 2) check (weight_kg between 20 and 300),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 1 and 80),
  muscle_kg    numeric(5, 2) check (muscle_kg between 5 and 200),
  note         text check (char_length(note) <= 500),
  created_at   timestamptz not null default now(),
  check (weight_kg is not null or body_fat_pct is not null or muscle_kg is not null)
);
create index body_logs_user_date_idx on public.body_logs (user_id, logged_on desc);

create table public.meal_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on  date not null,
  meal_type  text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  content    text not null check (char_length(content) between 1 and 500),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index meal_logs_user_date_idx on public.meal_logs (user_id, logged_on desc);

create table public.workout_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  logged_on  date not null,
  exercise   text not null check (char_length(exercise) between 1 and 60),
  weight_kg  numeric(6, 2) check (weight_kg between 0 and 1000),
  reps       integer check (reps between 1 and 1000),
  sets       integer check (sets between 1 and 100),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index workout_logs_user_date_idx on public.workout_logs (user_id, logged_on desc);

-- -----------------------------------------------------------------------------
-- 動画
-- -----------------------------------------------------------------------------
create table public.videos (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 100),
  description text check (char_length(description) <= 1000),
  category    text check (char_length(category) <= 30),
  provider    text not null check (provider in ('youtube', 'vimeo', 'url')),
  video_ref   text not null check (char_length(video_ref) between 1 and 500),
  visibility  text not null default 'all' check (visibility in ('all', 'assigned')),
  published   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.video_assignments (
  video_id    uuid not null references public.videos (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (video_id, user_id)
);
create index video_assignments_user_idx on public.video_assignments (user_id);

-- -----------------------------------------------------------------------------
-- 権限：まず全部外してから、必要なものだけ渡す
-- -----------------------------------------------------------------------------
revoke all on public.profiles, public.body_logs, public.meal_logs, public.workout_logs,
              public.videos, public.video_assignments
  from anon, authenticated;

grant select on public.profiles to authenticated;
-- 会員が変えてよいのは、表示名と同意日時だけ。is_admin と email は変えられない
grant update (display_name, consented_at) on public.profiles to authenticated;

grant select, insert, update, delete on public.body_logs, public.meal_logs, public.workout_logs
  to authenticated;
grant select, insert, update, delete on public.videos, public.video_assignments to authenticated;

-- -----------------------------------------------------------------------------
-- 行レベルセキュリティ（RLS）
-- -----------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.body_logs         enable row level security;
alter table public.meal_logs         enable row level security;
alter table public.workout_logs      enable row level security;
alter table public.videos            enable row level security;
alter table public.video_assignments enable row level security;

-- profiles：自分のものだけ。施術者は全員分を読める
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- 記録：本人だけが読み書きできる。書き込みは同意済みのときだけ。
--       施術者は「読むだけ」（insert / update / delete の権限は与えない）
create policy body_logs_select on public.body_logs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy body_logs_insert on public.body_logs
  for insert to authenticated with check (user_id = auth.uid() and public.has_consented());
create policy body_logs_update on public.body_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy body_logs_delete on public.body_logs
  for delete to authenticated using (user_id = auth.uid());

create policy meal_logs_select on public.meal_logs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy meal_logs_insert on public.meal_logs
  for insert to authenticated with check (user_id = auth.uid() and public.has_consented());
create policy meal_logs_update on public.meal_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy meal_logs_delete on public.meal_logs
  for delete to authenticated using (user_id = auth.uid());

create policy workout_logs_select on public.workout_logs
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy workout_logs_insert on public.workout_logs
  for insert to authenticated with check (user_id = auth.uid() and public.has_consented());
create policy workout_logs_update on public.workout_logs
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy workout_logs_delete on public.workout_logs
  for delete to authenticated using (user_id = auth.uid());

-- 動画：公開中で、(全員向け or 自分に割り当て) のものだけ。施術者は全部読み書きできる
create policy videos_select on public.videos
  for select to authenticated
  using (
    public.is_admin()
    or (
      published
      and (
        visibility = 'all'
        or exists (
          select 1 from public.video_assignments a
          where a.video_id = videos.id and a.user_id = auth.uid()
        )
      )
    )
  );
create policy videos_admin_insert on public.videos
  for insert to authenticated with check (public.is_admin());
create policy videos_admin_update on public.videos
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy videos_admin_delete on public.videos
  for delete to authenticated using (public.is_admin());

create policy video_assignments_select on public.video_assignments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy video_assignments_admin_insert on public.video_assignments
  for insert to authenticated with check (public.is_admin());
create policy video_assignments_admin_update on public.video_assignments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy video_assignments_admin_delete on public.video_assignments
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 施術者（管理者）を設定する：メールアドレスを書き換えて、別途実行してください
-- -----------------------------------------------------------------------------
-- update public.profiles set is_admin = true
--  where id = (select id from auth.users where email = 'あなたのメールアドレス');
