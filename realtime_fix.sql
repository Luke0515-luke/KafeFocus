-- ============================================================
-- realtime_fix.sql — 讓座位異動即時推送給所有人（換位 / 入座 / 離座不用重新進入）
-- 貼到 Supabase Dashboard → SQL Editor 執行一次即可（可重複執行）。
-- ============================================================

-- 1. 確保 cafe_seats 在 Realtime 的 publication 裡（schema.sql 那行如果當初漏跑或報錯，就會沒有即時推送）
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cafe_seats'
  ) then
    alter publication supabase_realtime add table public.cafe_seats;
  end if;
end $$;

-- 2. 讓 UPDATE / DELETE 事件帶完整資料（依 cafe_id 過濾的訂閱才不會漏）
alter table public.cafe_seats replica identity full;

-- 檢查：應該回傳一列 cafe_seats
select schemaname, tablename from pg_publication_tables
where pubname = 'supabase_realtime' and tablename = 'cafe_seats';
