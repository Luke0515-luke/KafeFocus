import { TREE, FLOOR2_Y, UPPER_SEAT_LAYOUT, UPPER_TABLES } from './layout';

/**
 * 精靈樹洞咖啡館的幾何資料（純資料，不含 three）：TreeDecor.jsx 畫場景、nav.js 做尋路障礙都從這裡讀，
 * 這樣「看到的」和「走得到的」才會一致。
 *   一樓：整個苔蘚地面（半徑 GROUND_R 的圓）都能走，原本的 18 × 14 木平台只是其中一塊。
 *   樓梯：原本沿樹壁往上盤旋的樓梯，前 9 階（STAIR.count）現在是真的能走的路，通到二樓。
 *   二樓：樹枝咖啡廳，貼著樹壁的弧形木平台 UPPER（角度單位：度；x = cx + r·cosφ，z = cz + r·sinφ）。
 */
export { TREE, FLOOR2_Y, UPPER_SEAT_LAYOUT, UPPER_TABLES };

export const GROUND_R = 12.0;                                   // 一樓可走範圍的半徑（以樹心為圓心）
export const UPPER = { phi0: 188, phi1: 240, ri: 8.6, ro: 15.9, thick: 0.3 };
export const STAIR = { r: 13.4, w: 2.2, phi0: 165, dphi: 2.9, count: 9, y0: 0.56, rise: 0.52 };

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
