-- =============================================================================
--  姿勢改善サロン 予約システム 初期スキーマ
--
--  Supabase の SQL Editor にこのファイルの内容を貼り付けて実行してください。
--  （または supabase CLI で `npx supabase db push`）
-- =============================================================================

-- 排他制約に等値条件（将来ベッドを2台にする等）を混ぜる場合に必要。
-- 1部屋・1名運用のうちは無くても動くが、入れておいて損はない。
create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- 定期営業日テンプレート（例：火・木・土の10:00-19:00）
-- 管理画面から編集できる。
-- -----------------------------------------------------------------------------
create table if not exists business_hours (
  id         uuid primary key default gen_random_uuid(),
  weekday    int  not null check (weekday between 0 and 6), -- 0=日曜
  start_time time not null,
  end_time   time not null,
  is_open    boolean not null default true,
  created_at timestamptz not null default now(),
  constraint business_hours_time_order check (start_time < end_time)
);

-- -----------------------------------------------------------------------------
-- 臨時の休業・臨時営業（曜日テンプレートを日付単位で上書きする）
--   kind='closed' … 休業。時刻がNULLなら終日休業、指定があればその時間帯だけ閉じる
--   kind='open'   … 臨時営業。その日の営業時間をこの内容で置き換える
-- -----------------------------------------------------------------------------
create table if not exists schedule_overrides (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  kind       text not null check (kind in ('closed', 'open')),
  start_time time,
  end_time   time,
  note       text,
  created_at timestamptz not null default now(),
  constraint schedule_overrides_time_order
    check (start_time is null or end_time is null or start_time < end_time),
  constraint schedule_overrides_open_needs_time
    check (kind <> 'open' or (start_time is not null and end_time is not null))
);

create index if not exists schedule_overrides_date_idx on schedule_overrides (date);

-- -----------------------------------------------------------------------------
-- 予約
--
--   ends_at は「施術時間 + 前後のバッファ」を含んだ占有終了時刻。
--   お客様に案内する施術時間は menu_duration_min を使う。
-- -----------------------------------------------------------------------------
create table if not exists bookings (
  id            uuid primary key default gen_random_uuid(),

  -- 予約時点のメニュー内容を控えておく（後でメニューを変更しても履歴が壊れない）
  menu_id           text not null,
  menu_name         text not null,
  menu_duration_min int  not null,
  menu_price        int  not null,

  starts_at     timestamptz not null,
  ends_at       timestamptz not null,

  customer_name text not null,
  customer_kana text,
  phone         text not null,
  email         text not null,
  concern       text,          -- 現在の身体の悩み
  note          text,          -- ご要望・連絡事項

  status        text not null default 'confirmed'
                check (status in ('confirmed', 'cancelled', 'done')),
  cancel_token  uuid not null default gen_random_uuid(),  -- お客様用キャンセルURL
  cancelled_at  timestamptz,
  admin_memo    text,          -- 管理者用メモ（お客様には見せない）
  created_at    timestamptz not null default now(),

  constraint bookings_time_order check (starts_at < ends_at),

  -- ★このシステムの心臓部★
  -- 有効な予約どうしの時間帯の重なりを、DBが物理的に拒否する。
  -- アプリ側の「空きを確認してから書き込む」処理は同時アクセスで破綻するため、
  -- 最終的な整合性は必ずここで担保する。
  constraint bookings_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmed')
);

create index if not exists bookings_starts_at_idx on bookings (starts_at);
create unique index if not exists bookings_cancel_token_idx on bookings (cancel_token);

-- -----------------------------------------------------------------------------
-- 予約枠のブロック（私用・移動時間・設備メンテなど）
-- -----------------------------------------------------------------------------
create table if not exists slot_blocks (
  id         uuid primary key default gen_random_uuid(),
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  reason     text,
  created_at timestamptz not null default now(),
  constraint slot_blocks_time_order check (starts_at < ends_at)
);

create index if not exists slot_blocks_starts_at_idx on slot_blocks (starts_at);

-- =============================================================================
--  行単位セキュリティ（RLS）
--
--  方針：匿名ユーザー（ブラウザ）からの直接アクセスは全テーブルで禁止する。
--        読み書きはすべて Next.js のサーバー側（service_role キー）を経由させる。
--        service_role キーは RLS を迂回するため、下記のポリシーの影響を受けない。
--
--  これにより、他のお客様の氏名・連絡先・お悩みがブラウザに漏れる経路が無くなる。
-- =============================================================================
alter table business_hours     enable row level security;
alter table schedule_overrides enable row level security;
alter table bookings           enable row level security;
alter table slot_blocks        enable row level security;

-- ポリシーを1つも作らない = 匿名・ログイン済みユーザーからは一切アクセスできない。
-- （念のため、既存ポリシーがあれば落としておく）
drop policy if exists "public read business_hours" on business_hours;
drop policy if exists "public read schedule_overrides" on schedule_overrides;
drop policy if exists "public read bookings" on bookings;
drop policy if exists "public read slot_blocks" on slot_blocks;

-- =============================================================================
--  初期データ（=== TODO: 実際の営業日に合わせて変更してください）
--  0=日 1=月 2=火 3=水 4=木 5=金 6=土
-- =============================================================================
insert into business_hours (weekday, start_time, end_time, is_open)
select * from (values
  (2, time '10:00', time '19:00', true),  -- 火
  (4, time '10:00', time '19:00', true),  -- 木
  (6, time '09:00', time '17:00', true)   -- 土
) as seed(weekday, start_time, end_time, is_open)
where not exists (select 1 from business_hours);
