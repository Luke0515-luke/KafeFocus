/**
 * 咖啡廳的座位與桌子配置（座位座標的唯一來源）。
 * 資料庫的座位座標由 scripts/gen-seats-sql.mjs 從這份檔案產生，確保兩邊一致：
 *   node scripts/gen-seats-sql.mjs
 * 座位到桌緣約 0.49 公尺。rot：0 面向 +Z，π 面向 -Z，π/2 面向 +X，-π/2 面向 -X。
 */
const PI = Math.PI;

export const SEAT_LAYOUT = [
  // 0-3 吧台高腳凳（面向後牆）
  { i: 0, x: 0.5, y: 0.72, z: -3.8, rot: PI, style: 'stool' },
  { i: 1, x: 2.5, y: 0.72, z: -3.8, rot: PI, style: 'stool' },
  { i: 2, x: 4.5, y: 0.72, z: -3.8, rot: PI, style: 'stool' },
  { i: 3, x: 6.5, y: 0.72, z: -3.8, rot: PI, style: 'stool' },
  // 4-7 中央實木長桌
  { i: 4, x: 0.0, y: 0.45, z: -0.05, rot: 0, style: 'chair' },
  { i: 5, x: 2.0, y: 0.45, z: -0.05, rot: 0, style: 'chair' },
  { i: 6, x: 0.0, y: 0.45, z: 2.05, rot: PI, style: 'chair' },
  { i: 7, x: 2.0, y: 0.45, z: 2.05, rot: PI, style: 'chair' },
  // 8-9 黑色大理石圓桌
  { i: 8, x: 5.5, y: 0.45, z: 3.01, rot: 0, style: 'bistro' },
  { i: 9, x: 5.5, y: 0.45, z: 4.99, rot: PI, style: 'bistro' },
  // 10-11 工業風方桌
  { i: 10, x: -0.14, y: 0.45, z: 5.2, rot: PI / 2, style: 'industrial' },
  { i: 11, x: 1.74, y: 0.45, z: 5.2, rot: -PI / 2, style: 'industrial' },
  // 12-13 沙發區（單人皮沙發）
  { i: 12, x: -6.51, y: 0.42, z: 5.0, rot: PI / 2, style: 'armchair' },
  { i: 13, x: -4.69, y: 0.42, z: 5.0, rot: -PI / 2, style: 'armchair' },
  // 14-15 左牆卡座
  { i: 14, x: -7.84, y: 0.45, z: -2.7, rot: PI / 2, style: 'booth' },
  { i: 15, x: -7.84, y: 0.45, z: -1.3, rot: PI / 2, style: 'booth' },
  // 16-19 兩張木質圓桌（各兩位）
  { i: 16, x: -3.0, y: 0.45, z: 0.06, rot: 0, style: 'bentwood' },
  { i: 17, x: -3.0, y: 0.45, z: 1.94, rot: PI, style: 'bentwood' },
  { i: 18, x: -3.0, y: 0.45, z: 3.06, rot: 0, style: 'bentwood' },
  { i: 19, x: -3.0, y: 0.45, z: 4.94, rot: PI, style: 'bentwood' },
  // 20-23 右側高腳長桌（兩側各兩位）
  { i: 20, x: 6.76, y: 0.72, z: 0.9, rot: PI / 2, style: 'stool' },
  { i: 21, x: 6.76, y: 0.72, z: 2.1, rot: PI / 2, style: 'stool' },
  { i: 22, x: 8.44, y: 0.72, z: 0.9, rot: -PI / 2, style: 'stool' },
  { i: 23, x: 8.44, y: 0.72, z: 2.1, rot: -PI / 2, style: 'stool' },
];

export const TABLES = [
  { id: 'bar',        type: 'bar',    position: [3.5, 0, -4.55], length: 7.0, depth: 0.55, height: 1.05 },
  { id: 'communal',   type: 'slab',   position: [1.0, 0, 1.0],   length: 3.4, depth: 1.1,  height: 0.75 },
  { id: 'bistro',     type: 'marble', position: [5.5, 0, 4.0],   radius: 0.5,              height: 0.75 },
  { id: 'industrial', type: 'square', position: [0.8, 0, 5.2],   size: 0.9,                height: 0.75 },
  { id: 'lounge',     type: 'low',    position: [-5.6, 0, 5.0],  radius: 0.42,             height: 0.45 },
  { id: 'booth',      type: 'slab',   position: [-7.0, 0, -2.0], rotationY: PI / 2, length: 1.8, depth: 0.7, height: 0.75 },
  { id: 'round-a',    type: 'cafe',   position: [-3.0, 0, 1.0],  radius: 0.45,             height: 0.75 },
  { id: 'round-b',    type: 'cafe',   position: [-3.0, 0, 4.0],  radius: 0.45,             height: 0.75 },
  { id: 'hightop',    type: 'slab',   position: [7.6, 0, 1.5],   rotationY: PI / 2, length: 2.2, depth: 0.7, height: 1.05 },
];

/** 大型植栽位置 [x, y, z, 縮放]（CafeDecor 擺設、nav.js 尋路避障共用） */
export const PLANT_SPOTS = [
  [-8.3, 0, -4.3, 1.5], [8.3, 0, 6.0, 1.3], [8.3, 0, -1.2, 1.3], [-1.2, 0, 8.3, 1.2],
  [4.0, 0, 8.4, 1.3], [-8.3, 0, 5.0, 1.2], [-5.0, 0, 8.3, 1.3],
];

/* ------------------------------------------------------------------------------------------
 * 精靈樹洞咖啡館「二樓：樹枝咖啡廳」（只有 treehouse-hollow 這間有，座位編號 24 起）
 * 二樓是一圈中空的圓弧木平台（貼著樹壁，高度 FLOOR2_Y，中間看得到一樓）；
 * 樹壁上開了幾個圓拱通道，每條通道通往一整條長在樹幹外面的空心大樹枝（樹枝咖啡廳）；另有幾個圓拱被樹皮封住。
 * 座位的 pos_y 仍然是「椅面高度」（和一樓一致），二樓的地板高度由 seatFloorY() 加上去。
 * 這個檔案不能 import 別的檔案（scripts/gen-seats-sql.mjs 會用 data: URL 直接載入它）。
 * ------------------------------------------------------------------------------------------ */
export const TREE = { cx: 0, cz: 2, R: 16, H: 46 };
export const FLOOR2_Y = 5.24;            // 二樓地板高度（螺旋樓梯第 10 階的高度）
export const UPPER_FIRST_INDEX = 24;     // 二樓座位的起始編號
// 樹壁上的圓拱 → 一小段通道（passHalf = 半寬）→ 一整條空心大樹枝（hallStart–hallEnd，半寬 hallHalf，尾端是半圓）。
// 沿著「朝外」方向的距離（along）都是從樹心算起。
export const BRANCH = { wallR: 15.9, passHalf: 1.05, hallStart: 19.0, hallHalf: 4.4, hallEnd: 34.2 };
// 4 條通往樹枝咖啡廳的通道（度）：避開圓形窗洞（見 TreeDecor 的 RoundWindow）
export const BRANCH_NAMES = ['月光枝', '螢火枝', '晨露枝', '蘑菇枝'];
const BRANCH_PHIS = [200, 270, 10, 60];
// 被樹皮封住的圓拱（只是裝飾，進不去）
export const BARK_PHIS = [232, 32, 100, 135];
const r2 = (n) => Math.round(n * 100) / 100;
const r4 = (n) => Math.round(n * 10000) / 10000;
/** 每間樹枝咖啡廳：方位 phi、朝外方向 d、側向 l */
export const BRANCH_ROOMS = BRANCH_PHIS.map((phi, k) => {
  const a = (phi * PI) / 180;
  return { k, phi, name: BRANCH_NAMES[k], d: [Math.cos(a), Math.sin(a)], l: [-Math.sin(a), Math.cos(a)] };
});
// 每條樹枝裡：左右兩排圓桌（3 列 × 2 排 = 6 張，每張沿「朝外」方向前後各一位）+ 盡頭一張大圓桌（4 位）→ 每間 16 個座位
const UPPER_TABLE_LIST = [];
const UPPER_SEAT_LIST = [];
BRANCH_ROOMS.forEach((room) => {
  const at = (a, b) => [r2(TREE.cx + room.d[0] * a + room.l[0] * b), r2(TREE.cz + room.d[1] * a + room.l[1] * b)];
  const addSeat = (tx, tz, a, b) => {
    const [sx, sz] = at(a, b);
    UPPER_SEAT_LIST.push({ i: UPPER_FIRST_INDEX + UPPER_SEAT_LIST.length, x: sx, y: 0.45, z: sz, rot: r4(Math.atan2(tx - sx, tz - sz)), style: 'bentwood' });
  };
  let m = 0;
  [23, 27, 31].forEach((a) => {
    [-1, 1].forEach((side) => {
      const [tx, tz] = at(a, side * 2.6);
      UPPER_TABLE_LIST.push({ id: `br-${room.k}-${m}`, type: 'cafe', position: [tx, 0, tz], radius: 0.45, height: 0.75 });
      m += 1;
      [-0.94, 0.94].forEach((off) => addSeat(tx, tz, a + off, side * 2.6));
    });
  });
  const [ex, ez] = at(35.0, 0);
  UPPER_TABLE_LIST.push({ id: `br-${room.k}-end`, type: 'cafe', position: [ex, 0, ez], radius: 0.45, height: 0.75 });
  [[-0.94, 0], [0.94, 0], [0, -0.94], [0, 0.94]].forEach(([da, db]) => addSeat(ex, ez, 35.0 + da, db));
});
export const UPPER_SEAT_LAYOUT = UPPER_SEAT_LIST;
export const UPPER_TABLES = UPPER_TABLE_LIST;

/** 座位所在樓層的地板高度（一樓 0、二樓 FLOOR2_Y） */
export const seatFloorY = (seat) => (seat.seat_index >= UPPER_FIRST_INDEX ? FLOOR2_Y : 0);

const STYLE_BY_INDEX = Object.fromEntries([...SEAT_LAYOUT, ...UPPER_SEAT_LAYOUT].map((s) => [s.i, s.style]));

/** 跪坐（榻榻米）主題：椅面只有座墊高度，姿勢改為跪坐 */
export const KNEEL_SEAT_Y = 0.09;
export const seatHeight = (seat, furniture) => (furniture === 'zen' ? KNEEL_SEAT_Y : seat.pos_y);
export const effectiveStyle = (seat, furniture) => (furniture === 'zen' ? 'kneel' : seatStyle(seat));

/** 依座位編號決定椅子款式 */
export function seatStyle(seat) {
  return STYLE_BY_INDEX[seat.seat_index] ?? 'chair';
}
