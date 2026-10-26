-- 新增「夕照海岸咖啡館」咖啡廳（24 個座位）。貼到 Supabase SQL Editor 執行一次即可，可重複執行。
insert into public.cafes (slug, name) values ('seaside-sunset', '夕照海岸咖啡館')
on conflict (slug) do update set name = excluded.name;

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
where c.slug = 'seaside-sunset'
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;
