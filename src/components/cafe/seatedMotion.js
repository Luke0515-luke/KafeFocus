import * as THREE from 'three';
import { computeTargets, deskFor, pickActivity } from './activity';
import { smoothstep } from './rigUtils';

const { damp, clamp } = THREE.MathUtils;

/** 坐著時，椅面中心到「角色根節點」的位移（和 UserAvatar3D 裡 primitive 的 position 一致）。 */
export const SIT = {
  hipAboveSeat: 0.07, // 髖部高出椅面
  backShift: 0.12,    // 往椅背方向退一點
  labelAboveHead: 0.4,
};

/** 每個座位一份的動作狀態（全在「座位座標系」：原點在椅面中心，+Z 前方，+X 是角色左手邊）。 */
export function createSeatedState() {
  return {
    ready: false,
    L: new THREE.Vector3(), R: new THREE.Vector3(),          // 平滑後的左右手目標
    poleL: new THREE.Vector3(), poleR: new THREE.Vector3(),
    restHandR: new THREE.Vector3(),                          // 右手放在杯子上的位置
    cupPos: new THREE.Vector3(), cupLift: 0,
    kind: 'type', mode: 'none',                              // kind：此刻在做什麼；mode：專注時固定的工作方式
    laptop: false, book: false, cupVisible: false,
    wCup: 0, wBook: 0,
    deskY: 0.3, deskZ: 0.69, laptopZ: 0.69,                   // deskZ：桌面小物的基準；laptopZ：依手臂長度收回後的筆電位置
    lean: 0, nod: 0,                                         // 目前的前傾 / 點頭角度（弧度）
    leanTarget: 0, nodTarget: 0,
    pageT: 0,                                                // 0~9 秒的翻頁計時
  };
}

const _d = new THREE.Vector3();
const REST_X = -0.17;   // 杯子平常放的位置（和 activity.js 右手休息位置一致）
const CUP_BACK = 0.2;

/**
 * 每幀：決定這個人現在在做什麼（打電腦 / 看書 / 喝咖啡），算出雙手目標與道具狀態。
 * @param s   { seat, style, t, dt, headSF, shoulderY, shoulderZ, reach }
 *            shoulderY/Z：肩膀在座位座標系的位置；reach：上臂 + 前臂長度
 */
export function stepActivity(st, s) {
  const { seat, style, t, dt, headSF, shoulderY, shoulderZ, reach } = s;
  const act = pickActivity(seat, Date.now() / 1000);
  const desk0 = deskFor(style);

  // 筆電放的位置不能超出手臂搆得到的範圍：依肩膀位置往回收（桌邊約在 0.49，不會收到椅子裡）
  let deskZ = desk0.z;
  if (reach && style !== 'armchair') {
    const dy = shoulderY - (desk0.y + 0.05);
    const h = Math.sqrt(Math.max(0, (reach - 0.05) ** 2 - dy * dy - 0.12 * 0.12));
    deskZ = clamp(shoulderZ + h + 0.03, 0.52, desk0.z);
  }
  // 只有「打字」會用收回後的位置；杯子、書一律放在原本的桌面基準（桌邊約 0.49，不會漂在半空）
  const deskType = { y: desk0.y, z: deskZ };
  st.deskY = desk0.y; st.deskZ = desk0.z; st.laptopZ = deskZ;

  const tg = computeTargets(act, t, act.kind === 'type' ? deskType : desk0, headSF);
  const k = 1 - Math.exp(-18 * dt);
  if (!st.ready) { st.L.copy(tg.L); st.R.copy(tg.R); st.ready = true; }
  st.L.lerp(tg.L, k);
  st.R.lerp(tg.R, k);
  st.poleL.copy(tg.poleL);
  st.poleR.copy(tg.poleR);

  const studying = seat.status === 'studying';
  st.kind = act.kind;
  st.mode = studying ? (act.h < 0.5 ? 'type' : 'read') : 'none';
  st.laptop = st.mode === 'type';
  st.book = st.mode === 'read';
  st.cupLift = tg.lift;

  st.wCup = damp(st.wCup, act.kind === 'drink' ? 1 : 0, 14, dt);
  st.wBook = damp(st.wBook, act.kind === 'read' ? 1 : 0, 10, dt);

  // 杯子：平常放桌上，喝的時候跟著右手走
  st.restHandR.set(REST_X, desk0.y + 0.05, desk0.z - CUP_BACK);
  _d.copy(st.R).sub(st.restHandR);
  st.cupPos.set(REST_X, desk0.y, desk0.z - CUP_BACK).addScaledVector(_d, st.wCup);
  st.cupVisible = style !== 'armchair' || st.wCup > 0.05;

  st.pageT = t % 9;

  // 上身前傾與低頭：工作時前傾（也讓手搆得到桌面），喝咖啡時稍微抬頭
  st.leanTarget = act.kind === 'type' ? 0.3 : act.kind === 'read' ? 0.12 : 0.1 * (1 - tg.lift);
  st.nodTarget = act.kind === 'type' ? 0.3 : act.kind === 'read' ? 0.28 : -0.1 * tg.lift;
  if (style === 'armchair') st.leanTarget *= 0.5;
  st.lean = damp(st.lean, st.leanTarget, 4, dt);
  st.nod = damp(st.nod, st.nodTarget, 5, dt);
  return st;
}

export { smoothstep };
