-- =============================================================================
-- TONEKA カルテを「回数券」中心に作り直す（月額プランの廃止・2026-11-25）
--
-- 使い方：002_karte.sql のあとに、SQL Editor へ貼って1回だけ実行してください。
--
-- 変えること
--   * 回数券を、1人に複数持てるテーブル（tickets）にする。期限は券ごと
--   * clients から、月額・繰越・ストレッチ回数券の列を外す（残りがある分は「その他の券」へ移す）
--   * sessions が「どの券を使ったか」を覚える（記録を消すと、その券に回数を戻せる）
--   * 会員の my_status() は、期限内で残りのある券だけを渡す
-- 守っていること（変わらない）
--   * 券の読み書きは施術者（is_admin）だけ。会員は my_status() を通して自分の分だけ受け取る
-- =============================================================================

create table public.tickets (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  kind         text not null check (kind in ('t2', 't4', 't8', 'other')),
  label        text not null check (char_length(label) between 1 and 60),
  total        integer not null check (total between 1 and 99),
  remain       integer not null check (remain between 0 and 99),
  minutes      integer not null default 60 check (minutes in (30, 60)),
  purchased_on date not null default current_date,
  expires_on   date,                                                    -- この日まで使える。null は期限なし
  created_at   timestamptz not null default now(),
  check (remain <= total)
);
create index tickets_client_idx on public.tickets (client_id, expires_on);

revoke all on public.tickets from anon, authenticated;
grant select, insert, update, delete on public.tickets to authenticated;
alter table public.tickets enable row level security;
create policy tickets_admin_all on public.tickets
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- これまでの残りは、「その他の券」として引き継ぐ（残りがあるものだけ）
insert into public.tickets (client_id, kind, label, total, remain, minutes, purchased_on, expires_on)
select id, 'other', '移行前の残り（今月分）', greatest(remain, 1), remain, 60, current_date, null
  from public.clients where remain > 0;
insert into public.tickets (client_id, kind, label, total, remain, minutes, purchased_on, expires_on)
select id, 'other', '移行前の繰越', greatest(carry, 1), carry, 60, current_date, carry_expire
  from public.clients where carry > 0;
insert into public.tickets (client_id, kind, label, total, remain, minutes, purchased_on, expires_on)
select id, 'other', 'ストレッチ回数券（移行前）', greatest(stretch_remain, 1), stretch_remain, 60, current_date, stretch_expire
  from public.clients where stretch_remain > 0;

alter table public.clients
  drop column plan, drop column ticket_count, drop column ticket_date,
  drop column remain, drop column carry, drop column carry_expire,
  drop column stretch_remain, drop column stretch_expire;

alter table public.sessions drop column consumed_from;
alter table public.sessions add column consumed_ticket uuid references public.tickets (id) on delete set null;

-- 会員向け：自分の、使える券だけ（期限が切れた券・残りのない券は渡さない）
drop function public.my_status();
create function public.my_status()
returns table (
  name text, tickets jsonb, target_label text, target_date date, homework text,
  purpose text, goal text, hobby text, intake_body text
)
language sql
stable
security definer
set search_path = public
as $$
  select c.name,
         coalesce((
           select jsonb_agg(jsonb_build_object(
                    'id', t.id, 'kind', t.kind, 'label', t.label, 'total', t.total, 'remain', t.remain,
                    'minutes', t.minutes, 'purchased_on', t.purchased_on, 'expires_on', t.expires_on)
                  order by t.expires_on nulls last, t.purchased_on)
             from public.tickets t
            where t.client_id = c.id and t.remain > 0
              and (t.expires_on is null or t.expires_on >= current_date)
         ), '[]'::jsonb),
         c.target_label, c.target_date, c.homework, c.purpose, c.goal, c.hobby, c.intake_body
  from public.clients c
  where c.user_id = auth.uid()
$$;
revoke all on function public.my_status() from public;
grant execute on function public.my_status() to authenticated;
