-- 精靈樹洞咖啡館：新增「二樓・樹枝咖啡廳」的 14 個座位（編號 24–37）。
-- 貼到 Supabase → SQL Editor 執行一次即可，可重複執行（已存在的座位只更新座標，不動佔用者）。
-- 需要先執行過 new_treehouse_cafe.sql（建立 treehouse-hollow 這間咖啡廳與 0–23 號座位）。
-- 座位座標由 src/components/cafe/layout.js 的 UPPER_SEAT_LAYOUT 產生：node scripts/gen-seats-sql.mjs
-- pos_y 是「椅面高度」（和一樓一樣 0.45）；二樓地板高度 5.24 由程式（seatFloorY）加上去，不寫在資料庫。
insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, s.y, s.z, s.r
from public.cafes c
cross join (values
  (24, -12.42, 0.45, -2.04, -1.8858),
  (25, -14.21, 0.45, -2.62, 1.2591),
  (26, -11.31, 0.45, -4.53, -2.0966),
  (27, -12.94, 0.45, -5.47, 1.0503),
  (28, -9.71, 0.45, -6.74, -2.3108),
  (29, -11.1, 0.45, -8, 0.838),
  (30, -7.68, 0.45, -8.57, -2.5151),
  (31, -8.78, 0.45, -10.09, 0.6264),
  (32, -8.64, 0.45, -1.85, -1.9869),
  (33, -10.36, 0.45, -2.61, 1.1547),
  (34, -7.56, 0.45, -3.69, -2.2207),
  (35, -9.06, 0.45, -4.82, 0.9294),
  (36, -6.08, 0.45, -5.25, -2.4469),
  (37, -7.29, 0.45, -6.69, 0.7029)
) as s(i, x, y, z, r)
where c.slug = 'treehouse-hollow'
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;
