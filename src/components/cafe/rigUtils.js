import * as THREE from 'three';

// 骨骼運算小工具：讓骨頭「轉向某個方向」、兩段式手臂 IK、以及可重複套用的擺動骨頭。
// 所有方向／座標都以 frame（通常是 clone 出來的模型根節點）的區域座標表示：+Y 向上、+Z 為面向前方。

const _fq = new THREE.Quaternion();
const _fqi = new THREE.Quaternion();
const _pq = new THREE.Quaternion();
const _pm = new THREE.Quaternion();
const _delta = new THREE.Quaternion();
const _local = new THREE.Quaternion();
const _q = new THREE.Quaternion();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tgt = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _inv = new THREE.Matrix4();
const _s = new THREE.Vector3();
const _e = new THREE.Vector3();
const _e2 = new THREE.Vector3();
const _h = new THREE.Vector3();
const _d1 = new THREE.Vector3();
const _d2 = new THREE.Vector3();

export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** 兩根骨頭的世界座標距離（用來量上臂、前臂長度） */
export function boneDist(a, b) {
  return a.getWorldPosition(_a).distanceTo(b.getWorldPosition(_b));
}

/**
 * 讓 bone（朝向 child 的那一段）轉向 targetDir。
 * 先量「目前實際方向」再算旋轉，所以不論模型原本是 T-pose / A-pose、骨骼 local 軸向如何都成立。
 */
export function aimBoneIn(frame, bone, child, targetDir) {
  if (!bone || !child || !bone.parent) return;
  frame.getWorldQuaternion(_fq);
  _fqi.copy(_fq).invert();
  bone.getWorldPosition(_a);
  child.getWorldPosition(_b);
  _dir.subVectors(_b, _a).applyQuaternion(_fqi);
  if (_dir.lengthSq() < 1e-10) return;
  _dir.normalize();
  _tgt.copy(targetDir);
  if (_tgt.lengthSq() < 1e-10) return;
  _tgt.normalize();
  _delta.setFromUnitVectors(_dir, _tgt);            // frame 空間的旋轉
  bone.parent.getWorldQuaternion(_pq);
  _pm.copy(_fqi).multiply(_pq);                     // 父骨在 frame 空間的朝向
  _local.copy(_pm).invert().multiply(_delta).multiply(_pm); // 轉成父骨 local 空間
  bone.quaternion.premultiply(_local);
}

/** 建立「繞模型 X 軸擺動」的骨頭（點頭、腿、手臂擺動共用）；找不到骨頭回傳 null。 */
export function makeSwing(root, name) {
  const bone = root.getObjectByName(name);
  if (!bone || !bone.parent) return null;
  root.updateMatrixWorld(true);
  bone.parent.getWorldQuaternion(_pq);
  return {
    bone,
    base: bone.quaternion.clone(),
    axis: new THREE.Vector3(1, 0, 0).applyQuaternion(_pq.invert()).normalize(),
  };
}

/** 正角度 = 往前下方轉（點頭、腿往後擺為負…依骨骼而定，見 walkPose.js） */
export function setSwing(sw, angle) {
  if (!sw) return;
  _q.setFromAxisAngle(sw.axis, angle);
  sw.bone.quaternion.copy(_q).multiply(sw.base);
}

/** 兩段式 IK：給肩 S、目標 H、上臂長 a、前臂長 b、手肘偏向 pole，算出手肘位置與（夠不到時被夾住的）手位置。 */
export function solveElbow(S, H, a, b, pole, outElbow, outHand) {
  _dir.subVectors(H, S);
  const d = _dir.length();
  if (d < 1e-6) { outElbow.copy(S); outHand.copy(S); return; }
  _dir.divideScalar(d);
  const dist = clamp(d, Math.abs(a - b) + 1e-3, a + b - 1e-3);
  const x = (a * a - b * b + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(a * a - x * x, 0));
  _pole.copy(pole).addScaledVector(_dir, -pole.dot(_dir));
  if (_pole.lengthSq() < 1e-8) _pole.crossVectors(_dir, _tgt.set(1, 0, 0));
  _pole.normalize();
  outElbow.copy(S).addScaledVector(_dir, x).addScaledVector(_pole, h);
  outHand.copy(S).addScaledVector(_dir, dist);
}

/**
 * 讓一隻手臂的「手」伸到 target（frame 座標）。limb = { arm, fore, hand, a, b, baseArm, baseFore }。
 * 每次都從基準姿勢出發，所以可以每幀呼叫。要先把脊椎／頭的動作設好再呼叫。
 */
export function reachArm(frame, limb, target, pole) {
  limb.arm.quaternion.copy(limb.baseArm);
  limb.fore.quaternion.copy(limb.baseFore);
  frame.updateWorldMatrix(true, false);
  _inv.copy(frame.matrixWorld).invert();
  limb.arm.getWorldPosition(_s).applyMatrix4(_inv);
  solveElbow(_s, target, limb.a, limb.b, pole, _e, _h);
  aimBoneIn(frame, limb.arm, limb.fore, _d1.subVectors(_e, _s));
  limb.fore.getWorldPosition(_e2).applyMatrix4(_inv);   // 上臂轉完後，手肘的實際位置
  aimBoneIn(frame, limb.fore, limb.hand, _d2.subVectors(_h, _e2));
}
