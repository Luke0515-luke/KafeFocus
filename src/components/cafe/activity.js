import * as THREE from 'three';
import { smoothstep } from './rigUtils';

/**
 * 坐著時的活動動畫：打電腦 / 看書 / 喝咖啡。
 * 活動由「狀態 + 座位使用者 ID」決定性地算出來（不存資料庫），所以每個人看到的都一樣：
 *   專注中：每人固定偏好「打電腦」或「看書」，並每隔約 1 分鐘喝一口咖啡；
 *   休息中：慢慢喝咖啡。
 * 所有座標都是「座位座標系」：原點在椅面中心，+Z 是面向前方，+X 是角色的左手邊。
 */

/** 桌面高度（相對椅面）與桌緣到筆電的距離；armchair 是放在大腿上 */
export const DESK = {
  stool:      { y: 0.33, z: 0.69 },
  chair:      { y: 0.30, z: 0.69 },
  bistro:     { y: 0.30, z: 0.69 },
  industrial: { y: 0.30, z: 0.69 },
  bentwood:   { y: 0.30, z: 0.69 },
  booth:      { y: 0.30, z: 0.69 },
  armchair:   { y: 0.17, z: 0.22 },
};
export const deskFor = (style) => DESK[style] ?? DESK.chair;

export function hash01(id = '') {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** 握杯的手相對於頭骨的位置（手腕在嘴巴前下方）。若杯子位置看起來偏掉，調這個。 */
export const MOUTH = new THREE.Vector3(-0.02, 0.02, 0.12);

export function pickActivity(seat, nowSec) {
  const h = hash01(seat.occupant_id ?? '');
  if (seat.status !== 'studying') {
    const P = 11;
    return { kind: 'drink', u: ((nowSec + h * P) % P) / P, h };
  }
  const P = 60 + h * 25;
  const ph = (nowSec + h * P) % P;
  if (ph < 7) return { kind: 'drink', u: ph / 7, h };
  return { kind: h < 0.5 ? 'type' : 'read', u: 0, h };
}

// 輸出物件（重複使用，避免每幀配置記憶體）
const out = {
  L: new THREE.Vector3(), R: new THREE.Vector3(),
  poleL: new THREE.Vector3(), poleR: new THREE.Vector3(),
  laptop: false, book: false, cup: false, lift: 0,
};

/** 算出兩隻手的目標位置（座位座標系）與要顯示哪些道具。headSF：頭骨在座位座標系的位置（喝咖啡時需要）。 */
export function computeTargets(act, t, desk, headSF) {
  const h = act.h;
  out.laptop = false; out.book = false; out.cup = false; out.lift = 0;
  out.poleL.set(0.6, -1, -0.3);
  out.poleR.set(-0.6, -1, -0.3);

  if (act.kind === 'type') {
    out.laptop = true;
    const bobL = Math.max(0, Math.sin(t * 12.5 + h * 6));
    const bobR = Math.max(0, Math.sin(t * 10.7 + 2 + h * 3));
    out.L.set(0.075 + 0.02 * Math.sin(t * 3.1), desk.y + 0.05 + 0.012 * bobL, desk.z - 0.03 + 0.015 * Math.sin(t * 2.3));
    out.R.set(-0.075 + 0.02 * Math.sin(t * 2.7), desk.y + 0.05 + 0.012 * bobR, desk.z - 0.03 + 0.015 * Math.sin(t * 1.9));
  } else if (act.kind === 'read') {
    out.book = true;
    const p = t % 9;                                   // 每 9 秒翻一頁
    const e = smoothstep(7.6, 8.2, p) - smoothstep(8.2, 8.8, p);
    out.L.set(0.14, 0.36, 0.30);
    out.R.set(-0.14 - 0.03 * e, 0.36 + 0.10 * e, 0.30);
  } else {
    out.cup = true;
    const u = act.u;
    const e = smoothstep(0.15, 0.4, u) - smoothstep(0.62, 0.85, u);   // 0 = 放在桌上，1 = 舉到嘴邊
    out.lift = e;
    out.L.set(0.13, desk.y + 0.05, desk.z - 0.25);
    const rx = -0.17, ry = desk.y + 0.05, rz = desk.z - 0.2;
    out.R.set(
      rx + (headSF.x + MOUTH.x - rx) * e,
      ry + (headSF.y + MOUTH.y - ry) * e,
      rz + (headSF.z + MOUTH.z - rz) * e,
    );
    out.poleR.set(-0.5, -1, 0);
  }
  return out;
}
