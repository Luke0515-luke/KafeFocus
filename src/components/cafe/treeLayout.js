import {
  TREE, FLOOR2_Y, FLOOR3_Y, UPPER_SEAT_LAYOUT, UPPER_TABLES, BRANCH, BRANCH_ROOMS, BARK_PHIS,
  RING3, BOOK_HALL, FLOOR3_SEAT_LAYOUT, FLOOR3_TABLES,
} from './layout';

/**
 * 精靈樹洞咖啡館的幾何資料（純資料，不含 three）：TreeDecor.jsx 畫場景、nav.js 做尋路障礙都從這裡讀，
 * 這樣「看到的」和「走得到的」才會一致。
 *   一樓：整個苔蘚地面（半徑 GROUND_R 的圓）都能走，原本的 18 × 14 木平台只是其中一塊。
 *   樓梯：原本沿樹壁往上盤旋的樓梯，前 9 階（STAIR.count）現在是真的能走的路，通到二樓。
 *   二樓：貼著樹壁的一圈中空圓弧平台 UPPER（缺口是樓梯；角度單位：度；x = cx + r·cosφ，z = cz + r·sinφ），
 *         平台外側的樹壁上有圓拱通道（BRANCH_ROOMS），每條通往一整條長在樹幹外面的空心大樹枝（樹枝咖啡廳）；BARK_PHIS 是被樹皮封住的圓拱。
 */
export {
  TREE, FLOOR2_Y, FLOOR3_Y, UPPER_SEAT_LAYOUT, UPPER_TABLES, BRANCH, BRANCH_ROOMS, BARK_PHIS,
  BOOK_HALL, FLOOR3_SEAT_LAYOUT, FLOOR3_TABLES,
};

export const GROUND_R = 12.0;                                   // 一樓可走範圍的半徑（以樹心為圓心）
// 圓弧平台從 188° 繞一圈到 158°（=518°），158°–188° 是缺口，樓梯從那裡爬上來
export const UPPER = { phi0: 188, phi1: 518, ri: 10.4, ro: 15.9, thick: 0.3 };
// 三樓環形平台（在二樓平台正上方；缺口是第二段樓梯）
export const UPPER3 = { ...RING3, thick: 0.3 };
export const STAIR = { r: 13.4, w: 2.2, phi0: 165, dphi: 2.9, count: 9, y0: 0.56, rise: 0.52 };
// 第二段樓梯：從二樓平台往上盤旋到三樓（比較窄，二樓平台兩側還能走）
export const STAIR2 = { r: 13.4, w: 1.6, phi0: 318, dphi: 2.9, count: 9, y0: FLOOR2_Y + 0.52, rise: 0.52 };

const rad = (deg) => (deg * Math.PI) / 180;
export const polar = (phiDeg, r, y = 0) => [TREE.cx + Math.cos(rad(phiDeg)) * r, y, TREE.cz + Math.sin(rad(phiDeg)) * r];

export function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** 樓梯每一階的踏面中心（y 是踏面高度）；前 STAIR.count 階是樓梯，最後一點是踏進二樓地板的第一步 */
export const STAIR_STEPS = Array.from({ length: STAIR.count }, (_, i) => {
  const phi = STAIR.phi0 + i * STAIR.dphi;
  const [x, , z] = polar(phi, STAIR.r);
  return { i, phi, x, z, y: STAIR.y0 + i * STAIR.rise };
});

/** 走樓梯的路徑點：從一樓入口 → 每一階 → 二樓地板（高度 = FLOOR2_Y） */
const MOUTH = (() => { const [x, , z] = polar(STAIR.phi0 - 7, GROUND_R - 0.9); return { x, z, y: 0 }; })();
const TOP = (() => { const [x, , z] = polar(STAIR.phi0 + STAIR.count * STAIR.dphi, STAIR.r); return { x, z, y: FLOOR2_Y }; })();
export const STAIR_MOUTH = MOUTH;
export const STAIR_TOP = TOP;
export const STAIR_PATH = [...STAIR_STEPS.map((s) => ({ x: s.x, z: s.z, y: s.y })), TOP];

export const STAIR2_STEPS = Array.from({ length: STAIR2.count }, (_, i) => {
  const phi = STAIR2.phi0 + i * STAIR2.dphi;
  const [x, , z] = polar(phi, STAIR2.r);
  return { i, phi, x, z, y: STAIR2.y0 + i * STAIR2.rise };
});
export const STAIR2_MOUTH = (() => { const [x, , z] = polar(STAIR2.phi0 - 7, STAIR2.r); return { x, z, y: FLOOR2_Y }; })();
export const STAIR2_TOP = (() => { const [x, , z] = polar(STAIR2.phi0 + STAIR2.count * STAIR2.dphi, STAIR2.r); return { x, z, y: FLOOR3_Y }; })();
export const STAIR2_PATH = [...STAIR2_STEPS.map((s) => ({ x: s.x, z: s.z, y: s.y })), STAIR2_TOP];

/**
 * 發光大蘑菇的位置（原本在 TreeDecor 裡，用同一組亂數種子，所以畫面不變）。
 * 為了讓一樓能走到更外圍，樓梯入口附近的蘑菇會被濾掉，並提供碰撞半徑給 nav.js 使用。
 */
export function mushroomSpots() {
  const rnd = rngFactory(77);
  const out = [];
  for (let i = 0; i < 24; i += 1) { // 樹壁底部一圈
    const a = rnd() * Math.PI * 2; const r = 12.6 + rnd() * 2.6;
    out.push({ p: [TREE.cx + Math.cos(a) * r, 0, TREE.cz + Math.sin(a) * r], s: 0.9 + rnd() * 1.9, c: i % 4 });
  }
  for (let i = 0; i < 10; i += 1) { // 吧台後方
    out.push({ p: [-9 + rnd() * 18, 0, -6.2 - rnd() * 3.2], s: 0.7 + rnd() * 1.4, c: (i + 1) % 4 });
  }
  // 樓梯入口與前幾階旁邊不要擺蘑菇
  const clear = [{ x: MOUTH.x, z: MOUTH.z }, ...STAIR_STEPS.slice(0, 4)];
  return out.filter((m) => !clear.some((c) => Math.hypot(m.p[0] - c.x, m.p[2] - c.z) < 2.0 + m.s * 0.7));
}

/** 蘑菇的碰撞圓：小蘑菇整顆擋路；大蘑菇的傘蓋在頭頂上方，只有菇柄擋路 */
export function mushroomObstacles() {
  return mushroomSpots().map((m) => ({ x: m.p[0], z: m.p[2], r: m.s >= 1.8 ? 0.3 * m.s : 0.85 * m.s * 0.95 }));
}

const norm360 = (phi, from) => { let p = phi; while (p < from) p += 360; return p; };

/** 圓弧平台（缺口在 phi1 與 phi0 之間）的內部判斷：離邊緣至少 wall */
function inRing(ring, dx, dz, wall) {
  const r = Math.hypot(dx, dz);
  if (r < ring.ri + wall || r > ring.ro - 0.3) return false;
  const phi = norm360((Math.atan2(dz, dx) * 180) / Math.PI, ring.phi0);
  if (phi > ring.phi1) return false;
  const d0 = Math.min(rad(phi - ring.phi0), Math.PI / 2); const d1 = Math.min(rad(ring.phi1 - phi), Math.PI / 2);
  return r * Math.sin(d0) >= 0.3 && r * Math.sin(d1) >= wall;
}

/** 通道 + 樹枝本體 + 尾端半圓（hall：{ d, l, passHalf, hallStart, hallEnd, hallHalf }） */
function inHall(hall, dx, dz, wall) {
  const along = dx * hall.d[0] + dz * hall.d[1];
  const lat = dx * hall.l[0] + dz * hall.l[1];
  if (along >= UPPER.ro - 0.6 && along <= hall.hallStart + 0.6 && Math.abs(lat) <= hall.passHalf - 0.25) return true;
  if (along >= hall.hallStart && along <= hall.hallEnd && Math.abs(lat) <= hall.hallHalf - wall) return true;
  return Math.hypot(along - hall.hallEnd, lat) <= hall.hallHalf - wall;
}

/** 第二段樓梯在二樓平台上佔的位置（踏階之上不能走；樓梯口在它前面） */
function inStair2Footprint(dx, dz) {
  const r = Math.hypot(dx, dz);
  if (r < STAIR2.r - STAIR2.w / 2 - 0.45 || r > STAIR2.r + STAIR2.w / 2 + 0.45) return false;
  const phi = norm360((Math.atan2(dz, dx) * 180) / Math.PI, STAIR2.phi0 - 10);
  return phi >= STAIR2.phi0 - 2.2 && phi <= STAIR2.phi0 + (STAIR2.count - 1) * STAIR2.dphi + 0.5;
}

/**
 * 二樓（第 1 層）可以站的地方：圓弧平台（扣掉第二段樓梯佔的位置）∪ 各條通道與樹枝（樹枝咖啡廳）。
 * nav.js 用它切格子，畫面（TreeDecor）的幾何和它對得上。
 */
export function insideUpperRegion(x, z, wall = 0.45) {
  const dx = x - TREE.cx; const dz = z - TREE.cz;
  if (inRing(UPPER, dx, dz, wall) && !inStair2Footprint(dx, dz)) return true;
  return BRANCH_ROOMS.some((b) => inHall({ ...BRANCH, d: b.d, l: b.l }, dx, dz, wall));
}

/** 三樓（第 2 層）可以站的地方：環形平台 ∪ 通往分享書籍大廳的通道與大樹枝 */
export function insideFloor3Region(x, z, wall = 0.45) {
  const dx = x - TREE.cx; const dz = z - TREE.cz;
  return inRing(UPPER3, dx, dz, wall) || inHall(BOOK_HALL, dx, dz, wall);
}
