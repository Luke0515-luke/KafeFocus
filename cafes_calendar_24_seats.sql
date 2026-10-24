-- =====================================================================
-- KafeFocus：多間咖啡廳（各 24 個座位）+ 行事曆 + 專注紀錄
-- 貼到 Supabase Dashboard → SQL Editor 執行一次即可（可重複執行，不會重複建立）。
-- 座位座標由 scripts/gen-seats-sql.mjs 從 src/components/cafe/layout.js 產生。
-- =====================================================================

-- 0. ON CONFLICT 需要的唯一索引（若已存在則略過）
create unique index if not exists cafes_slug_uq on public.cafes(slug);
create unique index if not exists cafe_seats_cafe_seat_uq on public.cafe_seats(cafe_id, seat_index);

-- 1. 四間咖啡廳（介紹文字與主題放在前端 src/config/themes.js，不依賴 description 欄位）
insert into public.cafes (slug, name) values
  ('main-street',    '街角自習咖啡廳'),
  ('jazz-night',     '爵士夜曲'),
  ('morning-light',  '晨光窗邊'),
  ('forest-reading', '森林書屋')
on conflict (slug) do update set name = excluded.name;

-- 2. 每間咖啡廳的 24 個座位（舊座位只更新座標，不動佔用者）
insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, s.y, s.z, s.r
from public.cafes c
cross join (values
  (0, 0.5, 0.72, -3.8, 3.14159),
  (1, 2.5, 0.72, -3.8, 3.14159),
  (2, 4.5, 0.72, -3.8, 3.14159),
  (3, 6.5, 0.72, -3.8, 3.14159),
  (4, 0, 0.45, -0.05, 0),
  (5, 2, 0.45, -0.05, 0),
  (6, 0, 0.45, 2.05, 3.14159),
  (7, 2, 0.45, 2.05, 3.14159),
  (8, 5.5, 0.45, 3.01, 0),
  (9, 5.5, 0.45, 4.99, 3.14159),
  (10, -0.14, 0.45, 5.2, 1.5708),
  (11, 1.74, 0.45, 5.2, -1.5708),
  (12, -6.51, 0.42, 5, 1.5708),
  (13, -4.69, 0.42, 5, -1.5708),
  (14, -7.84, 0.45, -2.7, 1.5708),
  (15, -7.84, 0.45, -1.3, 1.5708),
  (16, -3, 0.45, 0.06, 0),
  (17, -3, 0.45, 1.94, 3.14159),
  (18, -3, 0.45, 3.06, 0),
  (19, -3, 0.45, 4.94, 3.14159),
  (20, 6.76, 0.72, 0.9, 1.5708),
  (21, 6.76, 0.72, 2.1, 1.5708),
  (22, 8.44, 0.72, 0.9, -1.5708),
  (23, 8.44, 0.72, 2.1, -1.5708)
) as s(i, x, y, z, r)
where c.slug in ('main-street', 'jazz-night', 'morning-light', 'forest-reading')
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;

-- 3. 行事曆事件（只有本人看得到、改得動）
create table if not exists public.calendar_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 80),
  note       text check (note is null or char_length(note) <= 500),
  event_date date not null,
  start_time time,
  color      text not null default 'amber' check (color in ('amber','emerald','sky','rose','violet')),
  done       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists calendar_events_user_date_idx on public.calendar_events(user_id, event_date);

alter table public.calendar_events enable row level security;
drop policy if exists "own events select" on public.calendar_events;
create policy "own events select" on public.calendar_events for select to authenticated using (user_id = auth.uid());
drop policy if exists "own events insert" on public.calendar_events;
create policy "own events insert" on public.calendar_events for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own events update" on public.calendar_events;
create policy "own events update" on public.calendar_events for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "own events delete" on public.calendar_events;
create policy "own events delete" on public.calendar_events for delete to authenticated using (user_id = auth.uid());

-- 4. 專注紀錄：每個「完整跑完」的專注階段一筆，行事曆用來顯示每天專注分鐘數
create table if not exists public.focus_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cafe_id    uuid references public.cafes(id) on delete set null,
  task       text check (task is null or char_length(task) <= 40),
  minutes    int not null check (minutes between 1 and 240),
  started_at timestamptz not null,
  unique (user_id, started_at)
);
create index if not exists focus_logs_user_started_idx on public.focus_logs(user_id, started_at);

alter table public.focus_logs enable row level security;
drop policy if exists "own logs select" on public.focus_logs;
create policy "own logs select" on public.focus_logs for select to authenticated using (user_id = auth.uid());
drop policy if exists "own logs insert" on public.focus_logs;
create policy "own logs insert" on public.focus_logs for insert to authenticated with check (user_id = auth.uid());
