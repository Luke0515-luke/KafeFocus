import { SEAT_LAYOUT, TABLES, PLANT_SPOTS } from './layout';

/**
 * 走路用的尋路：把房間切成 0.2 公尺的格子，桌椅等障礙物依角色半徑「膨脹」後標成不可走，
 * 用 A* 找路，再把路徑拉直成少數幾個轉折點。障礙物與 CafeDecor 的擺設要對得上。
 */
const CELL = 0.2;
const X0 = -9; const X1 = 9; const Z0 = -5; const Z1 = 9;
const W = Math.round((X1 - X0) / CELL);
const H = Math.round((Z1 - Z0) / CELL);
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
  const o = [
    rect(-8.8, -4.0, -4.9, -3.84),   // 咖啡師吧台
    rect(-3.15, -1.25, -4.9, -4.25), // 矮櫃
    rect(-8.7, -7.65, 0.2, 2.6),     // 沙發（CafeDecor SofaCorner：中心 z=1.4）
    circ(-7.9, 3.15, 0.2),           // 沙發旁立燈
    rect(-8.85, -8.35, 6.7, 8.5),    // 書櫃
  ];
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

function blockedAt(x, z, obs) {
  if (x < X0 + WALL || x > X1 - WALL || z < Z0 + WALL || z > Z1 - WALL) return true;
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
  const obs = obstaclesFor(theme);
  const blocked = new Uint8Array(W * H);
  for (let j = 0; j < H; j += 1) {
    for (let i = 0; i < W; i += 1) {
      blocked[j * W + i] = blockedAt(X0 + (i + 0.5) * CELL, Z0 + (j + 0.5) * CELL, obs) ? 1 : 0;
    }
  }
  const free = (i, j) => i >= 0 && j >= 0 && i < W && j < H && !blocked[j * W + i];
  const cellOf = (x, z) => [
    Math.min(W - 1, Math.max(0, Math.floor((x - X0) / CELL))),
    Math.min(H - 1, Math.max(0, Math.floor((z - Z0) / CELL))),
  ];
  const center = (i, j) => ({ x: X0 + (i + 0.5) * CELL, z: Z0 + (j + 0.5) * CELL });
  const isFree = (x, z) => { const [i, j] = cellOf(x, z); return free(i, j); };

  /** 離 (x,z) 最近的可走位置（本身可走就原樣回傳） */
  function nearestFree(x, z) {
    const [ci, cj] = cellOf(x, z);
    if (free(ci, cj)) return { x, z };
    let best = null; let bestD = Infinity;
    for (let r = 1; r <= 25 && !best; r += 1) {
      for (let dj = -r; dj <= r; dj += 1) {
        for (let di = -r; di <= r; di += 1) {
          if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !free(ci + di, cj + dj)) continue;
          const c = center(ci + di, cj + dj);
          const d = Math.hypot(c.x - x, c.z - z);
          if (d < bestD) { bestD = d; best = c; }
        }
      }
    }
    return best ?? { x, z };
  }

  function lineClear(a, b) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (CELL * 0.5)));
    for (let k = 0; k <= n; k += 1) {
      const tt = k / n;
      const [i, j] = cellOf(a.x + (b.x - a.x) * tt, a.z + (b.z - a.z) * tt);
      if (!free(i, j)) return false;
    }
    return true;
  }

  /** 回傳路徑點（不含起點）；找不到路回傳 null */
  function findPath(from, to) {
    const s = nearestFree(from.x, from.z);
    const g = nearestFree(to.x, to.z);
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
          if (!free(ni, nj)) continue;
          if (di && dj && (!free(ci + di, cj) || !free(ci, cj + dj))) continue; // 不斜切牆角
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
      while (j > i + 1 && !lineClear(cells[i], cells[j])) j -= 1;
      pts.push(cells[j]); i = j;
    }
    if (Math.hypot(pts[0].x - from.x, pts[0].z - from.z) < 0.05) pts.shift();
    return pts;
  }

  return { findPath, nearestFree, isFree };
}
