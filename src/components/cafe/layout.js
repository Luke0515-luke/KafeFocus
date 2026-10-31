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

/* ------------------------------------------------------------------------------------------
 * 三樓：分享書籍大廳（座位編號 88 起，只有 treehouse-hollow 這間有）
 * 在二樓平台的正上方又有一圈中空圓弧平台（高度 FLOOR3_Y），樹壁一整圈都是書架；
 * 平台外側的樹壁上有一個圓拱通道，通往一條更大的空心大樹枝：兩側是書架、中間是閱讀長桌，
 * 盡頭是「漂流書交換台」與一組沙發閱讀角。從二樓平台的第二段螺旋樓梯上來。
 * ------------------------------------------------------------------------------------------ */
export const FLOOR3_Y = 10.44;           // 三樓地板高度（第二段樓梯 = 二樓地板 + 10 階 × 0.52）
export const FLOOR3_FIRST_INDEX = 88;    // 三樓座位的起始編號
// 三樓環形平台（缺口 311°–341° 是第二段樓梯）：跟二樓平台同樣的半徑，上下疊在一起
export const RING3 = { phi0: 341.0, phi1: 671.0, ri: 10.4, ro: 15.9 };
const BH_PHI = 235;
export const BOOK_HALL = {
  name: '分享書籍大廳', phi: BH_PHI, d: [Math.cos((BH_PHI * PI) / 180), Math.sin((BH_PHI * PI) / 180)], l: [-Math.sin((BH_PHI * PI) / 180), Math.cos((BH_PHI * PI) / 180)],
  wallR: 15.9, passHalf: 1.05, hallStart: 19.0, hallHalf: 5.05, hallEnd: 40.0,
};
const FLOOR3_TABLE_LIST = [];
const FLOOR3_SEAT_LIST = [];
{
  const H = BOOK_HALL;
  const at = (a, b) => [r2(TREE.cx + H.d[0] * a + H.l[0] * b), r2(TREE.cz + H.d[1] * a + H.l[1] * b)];
  const addSeat = (tx, tz, sx, sz, style, y) => {
    FLOOR3_SEAT_LIST.push({ i: FLOOR3_FIRST_INDEX + FLOOR3_SEAT_LIST.length, x: sx, y, z: sz, rot: r4(Math.atan2(tx - sx, tz - sz)), style });
  };
  // 閱讀長桌 × 2（長 8、寬 1.2，沿樹枝方向），每張兩側各 4 位
  [-1, 1].forEach((side, m) => {
    const lat = side * 2.2;
    const [tx, tz] = at(27.5, lat);
    FLOOR3_TABLE_LIST.push({ id: `bk-long-${m}`, type: 'long', position: [tx, 0, tz], dir: H.d, w: 8.0, dd: 1.2, height: 0.75 });
    [-1, 1].forEach((face) => {
      [24.5, 26.5, 28.5, 30.5].forEach((a) => {
        const [sx, sz] = at(a, lat + face * 0.95);
        const [cx2, cz2] = at(a, lat);
        addSeat(cx2, cz2, sx, sz, 'bentwood', 0.45);
      });
    });
  });
  // 漂流書交換台（盡頭的櫃台，沿側向，長 4.2、深 0.9）
  const [kx, kz] = at(41.6, 0);
  FLOOR3_TABLE_LIST.push({ id: 'bk-counter', type: 'counter', position: [kx, 0, kz], dir: H.l, w: 4.2, dd: 0.9, height: 1.05 });
  // 沙發閱讀角：一張矮桌 + 四張單人沙發
  const [nx, nz] = at(36.2, 0);
  FLOOR3_TABLE_LIST.push({ id: 'bk-nook', type: 'cafe', position: [nx, 0, nz], radius: 0.45, height: 0.45 });
  [[1.35, 0], [-1.35, 0], [0, 1.35], [0, -1.35]].forEach(([da, db]) => {
    const [sx, sz] = at(36.2 + da, db);
    addSeat(nx, nz, sx, sz, 'armchair', 0.42);
  });
  // 環形平台上的閱讀角：8 張圓桌，每張沿半徑前後各一位
  for (let k = 0; k < 8; k += 1) {
    const phi = RING3.phi0 + 26 + k * 36;
    const a = (phi * PI) / 180;
    const rc = 12.8;
    const [tx, tz] = [r2(TREE.cx + Math.cos(a) * rc), r2(TREE.cz + Math.sin(a) * rc)];
    FLOOR3_TABLE_LIST.push({ id: `bk-ring-${k}`, type: 'cafe', position: [tx, 0, tz], radius: 0.45, height: 0.75 });
    [-0.94, 0.94].forEach((off) => {
      const [sx, sz] = [r2(TREE.cx + Math.cos(a) * (rc + off)), r2(TREE.cz + Math.sin(a) * (rc + off))];
      addSeat(tx, tz, sx, sz, 'bentwood', 0.45);
    });
  }
}
export const FLOOR3_SEAT_LAYOUT = FLOOR3_SEAT_LIST;
export const FLOOR3_TABLES = FLOOR3_TABLE_LIST;
/** 各樓層的地板高度（索引 = 樓層 0/1/2） */
export const FLOOR_YS = [0, FLOOR2_Y, FLOOR3_Y];

/** 座位所在樓層的地板高度（一樓 0、二樓 FLOOR2_Y、三樓 FLOOR3_Y） */
export const seatFloorY = (seat) => {
  if (seat.seat_index >= FLOOR3_FIRST_INDEX) return FLOOR3_Y;
  return seat.seat_index >= UPPER_FIRST_INDEX ? FLOOR2_Y : 0;
};

const STYLE_BY_INDEX = Object.fromEntries([...SEAT_LAYOUT, ...UPPER_SEAT_LAYOUT, ...FLOOR3_SEAT_LAYOUT].map((s) => [s.i, s.style]));

/** 跪坐（榻榻米）主題：椅面只有座墊高度，姿勢改為跪坐 */
export const KNEEL_SEAT_Y = 0.09;
export const seatHeight = (seat, furniture) => (furniture === 'zen' ? KNEEL_SEAT_Y : seat.pos_y);
export const effectiveStyle = (seat, furniture) => (furniture === 'zen' ? 'kneel' : seatStyle(seat));

/** 依座位編號決定椅子款式 */
export function seatStyle(seat) {
  return STYLE_BY_INDEX[seat.seat_index] ?? 'chair';
}
