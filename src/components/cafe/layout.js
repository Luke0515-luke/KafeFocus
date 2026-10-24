/**
 * 桌子的固定擺設（座位本身仍存在資料庫）。
 * 座標需與 DB 的座位對得上：座位到桌緣約 0.49 公尺。換座位座標時記得一起改這裡。
 * 對應的座位 SQL 在 layout_14_seats.sql。
 */
export const TABLES = [
  // 靠後牆的吧台高腳桌（seat 0-3，高腳凳）
  { id: 'bar',        type: 'bar',    position: [3.5, 0, -4.55], length: 7.0, depth: 0.55, height: 1.05 },
  // 中央實木長桌（seat 4-7，兩側各兩位）
  { id: 'communal',   type: 'slab',   position: [1.0, 0, 1.0],   length: 3.4, depth: 1.1,  height: 0.75 },
  // 黑色大理石圓桌（seat 8-9）
  { id: 'bistro',     type: 'marble', position: [5.5, 0, 4.0],   radius: 0.5,              height: 0.75 },
  // 工業風方桌（seat 10-11）
  { id: 'industrial', type: 'square', position: [0.8, 0, 5.2],   size: 0.9,                height: 0.75 },
  // 沙發區矮茶几（seat 12-13，單人皮沙發）
  { id: 'lounge',     type: 'low',    position: [-5.6, 0, 5.0],  radius: 0.42,             height: 0.45 },
];

/** 依座位編號決定椅子款式 */
export function seatStyle(seat) {
  const i = seat.seat_index;
  if (i <= 3) return 'stool';
  if (i <= 7) return 'chair';
  if (i <= 9) return 'bistro';
  if (i <= 11) return 'industrial';
  return 'armchair';
}
