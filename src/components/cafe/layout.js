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

const STYLE_BY_INDEX = Object.fromEntries(SEAT_LAYOUT.map((s) => [s.i, s.style]));

/** 依座位編號決定椅子款式 */
export function seatStyle(seat) {
  return STYLE_BY_INDEX[seat.seat_index] ?? 'chair';
}
