-- 精靈樹洞咖啡館：二樓「樹枝咖啡廳」的座位（4 間圓形樹枝咖啡廳 × 4 個座位 = 編號 24–39）。
-- 貼到 Supabase → SQL Editor 執行一次即可，可重複執行（已存在的座位只更新座標，不動佔用者）。
-- 如果你之前跑過舊版的 new_treehouse_upper.sql（14 個座位），再跑這份會把 24–37 號移到新位置並補上 38、39 號。
-- 需要先執行過 new_treehouse_cafe.sql（建立 treehouse-hollow 這間咖啡廳與 0–23 號座位）。
-- 座位座標由 src/components/cafe/layout.js 的 UPPER_SEAT_LAYOUT 產生：node scripts/gen-seats-sql.mjs
-- pos_y 是「椅面高度」（和一樓一樣 0.45）；二樓地板高度 5.24 由程式（seatFloorY）加上去，不寫在資料庫。
insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, s.y, s.z, s.r
from public.cafes c
cross join (values
  (24, -24.24, 0.45, -7.21, -2.001),
  (25, -25.94, 0.45, -8, 1.131),
  (26, -22.63, 0.45, -10.65, -2.0061),
  (27, -24.34, 0.45, -11.45, 1.131),
  (28, -1.9, 0.45, -23.86, 3.1416),
  (29, -1.9, 0.45, -25.74, 0),
  (30, 1.9, 0.45, -23.86, 3.1416),
  (31, 1.9, 0.45, -25.74, 0),
  (32, 25.69, 0.45, 5.52, 1.3671),
  (33, 27.53, 0.45, 5.91, -1.7849),
  (34, 24.9, 0.45, 9.24, 1.3671),
  (35, 26.74, 0.45, 9.63, -1.7849),
  (36, 18.08, 0.45, 20.59, 0.6947),
  (37, 19.29, 0.45, 22.03, -2.4387),
  (38, 15.17, 0.45, 23.03, 0.6947),
  (39, 16.38, 0.45, 24.47, -2.4387)
) as s(i, x, y, z, r)
where c.slug = 'treehouse-hollow'
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;
