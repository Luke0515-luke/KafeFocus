import { SEAT_LAYOUT, TABLES, PLANT_SPOTS, UPPER_SEAT_LAYOUT, UPPER_TABLES, FLOOR2_Y } from './layout';
import { TREE, GROUND_R, STAIR_MOUTH, STAIR_TOP, STAIR_PATH, mushroomObstacles, insideUpperRegion } from './treeLayout';

/**
 * 走路用的尋路：把房間切成 0.2 公尺的格子，桌椅等障礙物依角色半徑「膨脹」後標成不可走，
 * 用 A* 找路，再把路徑拉直成少數幾個轉折點。障礙物與 CafeDecor 的擺設要對得上。
 *
 * 精靈樹洞咖啡館（theme.decor === 'tree'）有兩層：
 *   第 0 層 = 一樓（半徑 GROUND_R 的圓形地面），第 1 層 = 二樓（環形平台 + 通往各間樹枝咖啡廳的通道，高度 FLOOR2_Y）。
 *   兩層之間靠螺旋樓梯（STAIR_PATH）連接。路徑點都帶 y，走路模擬會沿著 y 爬樓梯。
 */
const CELL = 0.2;
const ROOM_BOUNDS = { X0: -9, X1: 9, Z0: -5, Z1: 9 };
const TREE_BOUNDS = { X0: TREE.cx - 33, X1: TREE.cx + 33, Z0: TREE.cz - 33, Z1: TREE.cz + 33 }; // 要包含懸在樹幹外面的樹枝咖啡廳
const AGENT = 0.24;     // 角色半徑
const WALL = 0.45;      // 離牆至少這麼遠

const rect = (x0, x1, z0, z1) => ({ t: 'r', x0, x1, z0, z1 });
const circ = (x, z, r) => ({ t: 'c', x, z, r });
const SEAT_R = { stool: 0.22, armchair: 0.45 };

function tableShape(t) {
  const [x, , z] = t.position;
  if (t.type === 'bar') return rect(x - t.length / 2, x + t.length / 2, z - t.depth / 2 - 0.3, z + t.depth / 2 + 0.15);
  if (t.type === 'slab') {
    const swap = Math.abs(Math.sin(t.rotationY ?? 0)) > 0.5;
    const hx = (swap ? t.depth : t.length) / 2;
    const hz = (swap ? t.length : t.depth) / 2;
    return rect(x - hx, x + hx, z - hz, z + hz);
  }
  if (t.type === 'square') { const h = t.size / 2; return rect(x - h, x + h, z - h, z + h); }
  return circ(x, z, t.radius);
}

export function obstaclesFor(theme) {
  const f = theme.features;
  const tree = theme.decor === 'tree';
  const o = [
    rect(-8.8, -4.0, -4.9, -3.84),   // 咖啡師吧台
    rect(-8.7, -7.65, 0.2, 2.6),     // 沙發（CafeDecor SofaCorner：中心 z=1.4）
    circ(-7.9, 3.15, 0.2),           // 沙發旁立燈
  ];
  if (!tree) {
    o.push(rect(-3.15, -1.25, -4.9, -4.25)); // 矮櫃（樹屋沒有）
    o.push(rect(-8.85, -8.35, 6.7, 8.5));    // 書櫃（樹屋沒有）
  } else {
    o.push(rect(-9.1, -3.7, -5.15, -4.65));  // 吧台後面的木牆板（TreeDecor CounterBacking）
    mushroomObstacles().forEach((m) => o.push(circ(m.x, m.z, m.r)));
  }
  if (f.piano) o.push(rect(7.2, 8.8, -4.9, -4.2), circ(8.0, -3.55, 0.25));
  if (theme.decor === 'ocean') o.push(rect(7.4, 8.6, -4.9, -3.75));   // 後牆右角的寶箱（OceanDecor）
  TABLES.forEach((t) => o.push(tableShape(t)));
  SEAT_LAYOUT.forEach((s) => {
    if (s.style === 'booth') o.push(rect(s.x - 0.65, s.x + 0.4, s.z - 0.62, s.z + 0.62));
    else o.push(circ(s.x, s.z, SEAT_R[s.style] ?? 0.3));
  });
  PLANT_SPOTS.slice(0, f.plants).forEach(([x, , z, sc]) => o.push(circ(x, z, 0.36 * sc)));
  return o;
}

/** 二樓的障礙物：桌子與椅子 */
export function upperObstacles() {
  const o = [];
  UPPER_TABLES.forEach((t) => o.push(tableShape(t)));
  UPPER_SEAT_LAYOUT.forEach((s) => o.push(circ(s.x, s.z, SEAT_R[s.style] ?? 0.3)));
  return o;
}

function hitsObstacle(x, z, obs) {
  for (const o of obs) {
    if (o.t === 'r') {
      if (x > o.x0 - AGENT && x < o.x1 + AGENT && z > o.z0 - AGENT && z < o.z1 + AGENT) return true;
    } else if (Math.hypot(x - o.x, z - o.z) < o.r + AGENT) return true;
  }
  return false;
}

class MinHeap {
  constructor() { this.a = []; }
  push(f, i) {
    const a = this.a; a.push([f, i]);
    let k = a.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (a[p][0] <= a[k][0]) break;
      [a[p], a[k]] = [a[k], a[p]]; k = p;
    }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let k = 0;
      for (;;) {
        let m = k; const l = 2 * k + 1; const r = l + 1;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === k) break;
        [a[m], a[k]] = [a[k], a[m]]; k = m;
      }
    }
    return top;
  }
  get size() { return this.a.length; }
}

export function buildNav(theme) {
  const tree = theme.decor === 'tree';
  const B = tree ? TREE_BOUNDS : ROOM_BOUNDS;
  const { X0, X1, Z0, Z1 } = B;
  const W = Math.round((X1 - X0) / CELL);
  const H = Math.round((Z1 - Z0) / CELL);

  // ---- 每一層各自一張格子地圖 ----
  const makeLevel = (obs, inside) => {
    const blocked = new Uint8Array(W * H);
    for (let j = 0; j < H; j += 1) {
      for (let i = 0; i < W; i += 1) {
        const x = X0 + (i + 0.5) * CELL; const z = Z0 + (j + 0.5) * CELL;
        blocked[j * W + i] = !inside(x, z) || hitsObstacle(x, z, obs) ? 1 : 0;
      }
    }
    return blocked;
  };
  const inGround = tree
    ? (x, z) => Math.hypot(x - TREE.cx, z - TREE.cz) <= GROUND_R - WALL
    : (x, z) => !(x < X0 + WALL || x > X1 - WALL || z < Z0 + WALL || z > Z1 - WALL);
  const levels = [makeLevel(obstaclesFor(theme), inGround)];
  if (tree) levels.push(makeLevel(upperObstacles(), insideUpperRegion));

  const levelOf = (y) => (tree && (y ?? 0) > FLOOR2_Y / 2 ? 1 : 0);
  const levelY = (lv) => (lv === 1 ? FLOOR2_Y : 0);
  const gridOf = (lv) => levels[lv] ?? levels[0];

  const free = (lv, i, j) => i >= 0 && j >= 0 && i < W && j < H && !gridOf(lv)[j * W + i];
  const cellOf = (x, z) => [
    Math.min(W - 1, Math.max(0, Math.floor((x - X0) / CELL))),
    Math.min(H - 1, Math.max(0, Math.floor((z - Z0) / CELL))),
  ];
  const center = (i, j) => ({ x: X0 + (i + 0.5) * CELL, z: Z0 + (j + 0.5) * CELL });
  const isFree = (x, z, lv = 0) => { const [i, j] = cellOf(x, z); return free(lv, i, j); };

  /** 離 (x,z) 最近的可走位置（本身可走就原樣回傳） */
  function nearestFree(x, z, lv = 0) {
    const [ci, cj] = cellOf(x, z);
    if (free(lv, ci, cj)) return { x, z };
    let best = null; let bestD = Infinity;
    for (let r = 1; r <= 25 && !best; r += 1) {
      for (let dj = -r; dj <= r; dj += 1) {
        for (let di = -r; di <= r; di += 1) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !free(lv, ci + di, cj + dj)) continue;
          const c = center(ci + di, cj + dj);
          const d = Math.hypot(c.x - x, c.z - z);
          if (d < bestD) { bestD = d; best = c; }
        }
      }
    }
    return best ?? { x, z };
  }

  function lineClear(lv, a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL * 0.5)));
    for (let k = 0; k <= n; k += 1) {
      const tt = k / n;
      const [i, j] = cellOf(a.x + (b.x - a.x) * tt, a.z + (b.z - a.z) * tt);
      if (!free(lv, i, j)) return false;
    }
    return true;
  }

  /** 同一層裡的 A*：回傳路徑點（不含起點、帶 y）；找不到路回傳 null */
  function findPathOnLevel(lv, from, to) {
    const y = levelY(lv);
    const s = nearestFree(from.x, from.z, lv);
    const g = nearestFree(to.x, to.z, lv);
    const [si, sj] = cellOf(s.x, s.z);
    const [gi, gj] = cellOf(g.x, g.z);
    const sIdx = sj * W + si; const gIdx = gj * W + gi;

    const gScore = new Float32Array(W * H).fill(Infinity);
    const parent = new Int32Array(W * H).fill(-1);
    const closed = new Uint8Array(W * H);
    const heap = new MinHeap();
    const hF = (i, j) => { const dx = Math.abs(i - gi); const dz = Math.abs(j - gj); return (dx + dz) + (1.4142 - 2) * Math.min(dx, dz); };
    gScore[sIdx] = 0; heap.push(hF(si, sj), sIdx);
    let found = false;
    while (heap.size) {
      const [, idx] = heap.pop();
      if (closed[idx]) continue;
      closed[idx] = 1;
      if (idx === gIdx) { found = true; break; }
      const ci = idx % W; const cj = (idx - ci) / W;
      for (let dj = -1; dj <= 1; dj += 1) {
        for (let di = -1; di <= 1; di += 1) {
          if (!di && !dj) continue;
          const ni = ci + di; const nj = cj + dj;
          if (!free(lv, ni, nj)) continue;
          if (di && dj && (!free(lv, ci + di, cj) || !free(lv, ci, cj + dj))) continue; // 不斜切牆角
          const nIdx = nj * W + ni;
          const ng = gScore[idx] + (di && dj ? 1.4142 : 1);
          if (ng < gScore[nIdx]) { gScore[nIdx] = ng; parent[nIdx] = idx; heap.push(ng + hF(ni, nj), nIdx); }
        }
      }
    }
    if (!found) return null;

    const cells = [];
    for (let k = gIdx; k !== -1; k = parent[k]) { const ci = k % W; cells.push(center(ci, (k - ci) / W)); }
    cells.reverse();
    cells[0] = s;
    cells[cells.length - 1] = g;

    // 拉直：能直線走到的就跳過中間點
    const pts = [cells[0]];
    let i = 0;
    while (i < cells.length - 1) {
      let j = cells.length - 1;
      while (j > i + 1 && !lineClear(lv, cells[i], cells[j])) j -= 1;
      pts.push(cells[j]); i = j;
    }
    if (Math.hypot(pts[0].x - from.x, pts[0].z - from.z) < 0.05) pts.shift();
    return pts.map((p) => ({ x: p.x, z: p.z, y }));
  }

  /**
   * 回傳路徑點（不含起點，每點 { x, z, y }）；找不到路回傳 null。
   * from / to 可以帶 y（沒帶就是一樓）。樹屋裡起點與終點在不同樓層時，會自動接上樓梯。
   */
  function findPath(from, to) {
    const lvTo = levelOf(to.y);
    if (!tree) return findPathOnLevel(0, from, to);

    const fy = from.y ?? 0;
    // 人正站在樓梯上：先順著樓梯走到想去的那一端
    if (fy > 0.3 && fy < FLOOR2_Y - 0.3) {
      let k = 0; let bestD = Infinity;
      STAIR_PATH.forEach((p, idx) => { const d = Math.hypot(p.x - from.x, p.z - from.z); if (d < bestD) { bestD = d; k = idx; } });
      if (lvTo === 1) {
        const rest = findPathOnLevel(1, STAIR_TOP, to);
        return rest ? [...STAIR_PATH.slice(k + 1), ...rest] : null;
      }
      const rest = findPathOnLevel(0, STAIR_MOUTH, to);
      return rest ? [...STAIR_PATH.slice(0, k).reverse(), STAIR_MOUTH, ...rest] : null;
    }

    const lvFrom = levelOf(fy);
    if (lvFrom === lvTo) return findPathOnLevel(lvFrom, from, to);
    if (lvFrom === 0) { // 一樓 → 二樓
      const a = findPathOnLevel(0, from, STAIR_MOUTH);
      const b = findPathOnLevel(1, STAIR_TOP, to);
      return a && b ? [...a, ...STAIR_PATH, ...b] : null;
    }
    // 二樓 → 一樓
    const a = findPathOnLevel(1, from, STAIR_TOP);
    const b = findPathOnLevel(0, STAIR_MOUTH, to);
    return a && b ? [...a, ...STAIR_PATH.slice(0, -1).reverse(), STAIR_MOUTH, ...b] : null;
  }

  return { findPath, nearestFree, isFree, levelOf, levelY };
}
