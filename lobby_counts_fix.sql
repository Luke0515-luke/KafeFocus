-- ============================================================
-- lobby_counts_fix.sql — 大廳顯示有人，進去卻沒人
--
-- 原因：專注中的人如果關掉網頁 / 斷線，座位會被「保留到專注倒數結束」（focus_log_fix.sql 的設計，
--       為了手機鎖屏不被誤踢），所以資料庫裡還有人。大廳直接數資料庫 → 顯示有人；
--       進咖啡廳後畫面用 Presence（真正在線的人）過濾 → 看不到這些幽靈座位。
-- 修法：大廳改用這個函式，只計算「最近有心跳」的人，數字就會和進去看到的一致。
-- 使用：Supabase Dashboard → SQL Editor 執行一次即可（可重複執行）。
-- ============================================================
create or replace function public.cafe_seat_counts(p_seconds int default 120)
returns table (cafe_id uuid, total bigint, taken bigint)
language sql stable security definer set search_path = public as $$
  select s.cafe_id,
         count(*) as total,
         count(*) filter (
           where s.occupant_id is not null
             and exists (select 1 from public.seat_heartbeats h
                         where h.user_id = s.occupant_id
                           and h.beat_at > now() - make_interval(secs => p_seconds))
         ) as taken
  from public.cafe_seats s
  group by s.cafe_id;
$$;

revoke execute on function public.cafe_seat_counts(int) from public;
grant  execute on function public.cafe_seat_counts(int) to anon, authenticated;   -- 訪客也能看大廳人數
