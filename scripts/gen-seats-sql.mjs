// 用法：node scripts/gen-seats-sql.mjs  →  印出「座位寫入」的 SQL（貼到 Supabase SQL Editor）
// 座位座標來源是 src/components/cafe/layout.js，改了座位就重新產生一次。
import { readFileSync } from 'node:fs';

const SLUGS = ['main-street', 'jazz-night', 'morning-light', 'bright-corner', 'forest-reading', 'neon-rain', 'zen-tea', 'nordic-cafe', 'seaside-sunset', 'treehouse-hollow', 'deep-sea'];
const src = readFileSync(new URL('../src/components/cafe/layout.js', import.meta.url), 'utf8');
const { SEAT_LAYOUT, UPPER_SEAT_LAYOUT } = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);

const f = (n) => Number(n.toFixed(5));
const rows = SEAT_LAYOUT.map((s) => `  (${s.i}, ${f(s.x)}, ${f(s.y)}, ${f(s.z)}, ${f(s.rot)})`).join(',\n');

console.log(`insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, s.y, s.z, s.r
from public.cafes c
cross join (values
${rows}
) as s(i, x, y, z, r)
where c.slug in (${SLUGS.map((x) => `'${x}'`).join(', ')})
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;`);

// 精靈樹洞咖啡館「二樓樹枝咖啡廳」的座位（編號 24 起，只寫進 treehouse-hollow）。pos_y 是椅面高度，二樓地板高度由程式的 seatFloorY() 加上去。
const upperRows = UPPER_SEAT_LAYOUT.map((s) => `  (${s.i}, ${f(s.x)}, ${f(s.y)}, ${f(s.z)}, ${f(s.rot)})`).join(',\n');
console.log(`
-- ===== 精靈樹洞咖啡館：二樓樹枝咖啡廳（${UPPER_SEAT_LAYOUT.length} 個座位）=====
insert into public.cafe_seats (cafe_id, seat_index, pos_x, pos_y, pos_z, rot_y)
select c.id, s.i, s.x, s.y, s.z, s.r
from public.cafes c
cross join (values
${upperRows}
) as s(i, x, y, z, r)
where c.slug = 'treehouse-hollow'
on conflict (cafe_id, seat_index) do update
  set pos_x = excluded.pos_x, pos_y = excluded.pos_y, pos_z = excluded.pos_z, rot_y = excluded.rot_y;`);
