-- =============================================================================
-- TONEKA カルテ（施術者用の顧客管理）と、会員への「見せる部分」
--
-- 使い方：001_member_area.sql のあとに、SQL Editor へ貼って1回だけ実行してください。
--
-- 守っていること
--   * カルテ（clients）と施術記録（sessions）は、施術者（is_admin）だけが読み書きできる
--   * 会員（お客様）は、テーブルを直接は読めない。次の3つの関数を通して、
--     「自分の分の、見せてよい項目だけ」を受け取る
--        my_status()   残り回数・期限・目標・ホームケア・身体の記録（レーダー）
--        my_sessions() 受けたセッションの日付・種類・メニュー・ホームケア
--     見立て・内部メモ・キャンセル履歴・紹介者・料金は、会員には渡らない
--   * 未ログイン（anon）には、何も見せない
--   * カルテと会員ログインのひもづけは、施術者だけができる（link_client）
-- =============================================================================

create table public.clients (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code ~ '^TNK-[0-9]{4,}$'),
  user_id       uuid unique references auth.users (id) on delete set null,
  name          text not null check (char_length(name) between 1 and 60),
  kana          text check (char_length(kana) <= 60),
  gender        text check (gender in ('女性', '男性', '回答しない')),
  dob           date,
  height_cm     numeric(5,1) check (height_cm between 50 and 250),
  weight_kg     numeric(5,1) check (weight_kg between 20 and 300),
  phone         text check (char_length(phone) <= 30),
  email         text check (char_length(email) <= 200),
  referrer      text check (char_length(referrer) <= 100),           -- 内部のみ
  hobby         text check (char_length(hobby) <= 300),
  plan          text not null default 'trial'
                check (plan in ('m4', 'm2', 'pair4', 'fam6', 'fam8', 'ticket', 'sticket', 'visitor', 'online', 'trial')),
  ticket_count  integer check (ticket_count between 0 and 20),
  ticket_date   date,
  share_group   text check (char_length(share_group) <= 100),       -- 家族・ペアの相手（内部メモ）
  is_payer      boolean not null default true,
  remain        integer not null default 0 check (remain between 0 and 99),
  carry         integer not null default 0 check (carry between 0 and 99),
  carry_expire  date,
  target_label  text check (char_length(target_label) <= 100),
  target_date   date,
  consent_on    date,
  photo_ok      text check (char_length(photo_ok) <= 100),
  tea           text check (char_length(tea) <= 100),
  purpose       text check (char_length(purpose) <= 1000),
  goal          text check (char_length(goal) <= 1000),
  posture       text check (char_length(posture) <= 3000),           -- 見立て（内部のみ）
  homework      text check (char_length(homework) <= 3000),          -- ホームケア（会員に見せる）
  body_pins     jsonb not null default '[]'::jsonb,                   -- ボディマップ（内部のみ）
  radar         jsonb not null default '{}'::jsonb,                   -- 6視点の記録（会員に見せる）
  internal_note text check (char_length(internal_note) <= 3000),
  created_at    timestamptz not null default now()
);

create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid not null references public.clients (id) on delete cascade,
  session_date  date not null,
  type          text not null default 'regular' check (type in ('regular', 'trial', 'online', 'stretch', 'visitor')),
  status        text not null default 'attended'
                check (status in ('attended', 'cancel_same_day', 'cancel_advance', 'noshow')),
  consumed      integer not null default 0 check (consumed between 0 and 5),
  consumed_from text check (consumed_from in ('remain', 'carry')),
  fee           integer not null default 0 check (fee between 0 and 100000),
  amount        integer not null default 0 check (amount between 0 and 1000000),
  condition     text check (char_length(condition) <= 2000),          -- 状態メモ（内部のみ）
  menu          text check (char_length(menu) <= 2000),               -- 今日のメニュー（会員に見せる）
  homecare      text check (char_length(homecare) <= 2000),           -- ホームケア（会員に見せる）
  share         boolean not null default true,                        -- false にすると会員には出ない
  created_at    timestamptz not null default now()
);
create index sessions_client_idx on public.sessions (client_id, session_date desc);

-- 権限：全部外してから、必要なものだけ渡す
revoke all on public.clients, public.sessions from anon, authenticated;
grant select, insert, update, delete on public.clients, public.sessions to authenticated;

alter table public.clients  enable row level security;
alter table public.sessions enable row level security;

-- 施術者だけが、読み書きできる
create policy clients_admin_all on public.clients
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy sessions_admin_all on public.sessions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- -----------------------------------------------------------------------------
-- 会員向け：自分の分の、見せてよい項目だけ
-- -----------------------------------------------------------------------------
create function public.my_status()
returns table (
  name text, plan text, remain integer, carry integer, carry_expire date,
  ticket_expire date, target_label text, target_date date, homework text, radar jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select c.name, c.plan, c.remain,
         case when c.carry_expire is not null and c.carry_expire < current_date then 0 else c.carry end,
         c.carry_expire,
         case when c.ticket_date is not null then (c.ticket_date + interval '2 months')::date end,
         c.target_label, c.target_date, c.homework, c.radar
  from public.clients c
  where c.user_id = auth.uid()
$$;

create function public.my_sessions()
returns table (session_date date, type text, menu text, homecare text)
language sql
stable
security definer
set search_path = public
as $$
  select s.session_date, s.type, s.menu, s.homecare
  from public.sessions s
  join public.clients c on c.id = s.client_id
  where c.user_id = auth.uid()
    and s.status = 'attended'
    and s.share
  order by s.session_date desc, s.created_at desc
  limit 100
$$;

-- 施術者だけ：カルテと会員ログイン（メールアドレス）をひもづける
create function public.link_client(p_client uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare u uuid;
begin
  if not public.is_admin() then
    raise exception 'not allowed';
  end if;
  select id into u from auth.users where lower(email) = lower(p_email);
  if u is null then
    raise exception 'そのメールアドレスの会員が見つかりません';
  end if;
  update public.clients set user_id = u where id = p_client;
end $$;

revoke all on function public.my_status(), public.my_sessions(), public.link_client(uuid, text) from public;
grant execute on function public.my_status(), public.my_sessions(), public.link_client(uuid, text) to authenticated;
