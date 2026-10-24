-- 已經執行過舊版 schema 時，只跑這支：把座位改成新的 14 個座位配置。
-- 注意：舊座位會被移到新位置；正在入座的人會跟著座位一起移動，不會被踢掉。
-- 座標需與前端 src/components/cafe/layout.js 的 TABLES 對得上。
-- pos_y = 椅面高度：高腳凳 0.72／一般椅 0.45／皮沙發 0.42。rot_y：0 面向 +Z，π 面向 -Z，±π/2 面向 ±X。
with c as (
  insert into public.cafes (slug, name, description)
  values ('main-street', '街角自習咖啡廳', '深焙咖啡色調的夜間咖啡廳')
  on conflict (slug) do update set name = excluded.name, description = excluded.description
  returning id
)
insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, s.y, s.z, s.r
from c, (values
  -- 吧台高腳凳（面向後牆）
  (0, 0.5, 0.72, -3.8, 3.14159), (1, 2.5, 0.72, -3.8, 3.14159), (2, 4.5, 0.72, -3.8, 3.14159), (3, 6.5, 0.72, -3.8, 3.14159),
  -- 中央實木長桌（兩側各兩位）
  (4, 0.0, 0.45, -0.05, 0.0), (5, 2.0, 0.45, -0.05, 0.0), (6, 0.0, 0.45, 2.05, 3.14159), (7, 2.0, 0.45, 2.05, 3.14159),
  -- 黑色大理石圓桌
  (8, 5.5, 0.45, 3.01, 0.0), (9, 5.5, 0.45, 4.99, 3.14159),
  -- 工業風方桌
  (10, -0.14, 0.45, 5.2, 1.5708), (11, 1.74, 0.45, 5.2, -1.5708),
  -- 沙發區（單人皮沙發 + 矮茶几）
  (12, -6.51, 0.42, 5.0, 1.5708), (13, -4.69, 0.42, 5.0, -1.5708)
) as s(i, x, y, z, r)
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;
