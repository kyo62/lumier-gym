-- =============================================================================
-- 会員の「次回のご予約」を、カルテに持たせる（2026-11-27）
--
-- 使い方：003_tickets.sql のあとに、SQL Editor へ貼って1回だけ実行してください。
--
-- 変えること
-- * clients に next_visit_on（日付）と next_visit_time（時刻）を足す。空なら未定
-- * 会員の my_status() が、この2つも返す
-- 守っていること（変わらない）
-- * 会員は my_status() を通して、自分の分だけ受け取る
-- =============================================================================

alter table public.clients
  add column next_visit_on date,
  add column next_visit_time time;

drop function public.my_status();
create function public.my_status()
returns table (
  name text, tickets jsonb, target_label text, target_date date,
  next_visit_on date, next_visit_time time, homework text,
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
    c.target_label, c.target_date, c.next_visit_on, c.next_visit_time,
    c.homework, c.purpose, c.goal, c.hobby, c.intake_body
  from public.clients c
  where c.user_id = auth.uid()
$$;
revoke all on function public.my_status() from public;
grant execute on function public.my_status() to authenticated;
