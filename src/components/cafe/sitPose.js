import * as THREE from 'three';
import { boneDist, makeSwing } from './rigUtils';

/** Q 版比例：頭放大。1 = 完全寫實；想要更 Q 可調到 1.3 以上。 */
export const CHIBI_HEAD_SCALE = 1.12;

const _p1 = new THREE.Vector3();
const _p2 = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _target = new THREE.Vector3();
const _parentQ = new THREE.Quaternion();
const _delta = new THREE.Quaternion();
const _local = new THREE.Quaternion();

/**
 * 讓 bone（朝向 child 的那一段骨頭）轉向 targetDir（模型空間，+Y 向上、+Z 面向前方）。
 * 先量「目前實際方向」再算旋轉，所以不論模型原本是 T-pose 或 A-pose、骨骼 local 軸向如何都成立。
 */
function aimBone(bone, child, targetDir) {
  if (!bone || !child || !bone.parent) return;
  bone.getWorldPosition(_p1);
  child.getWorldPosition(_p2);
  _dir.subVectors(_p2, _p1).normalize();
  _target.copy(targetDir).normalize();
  _delta.setFromUnitVectors(_dir, _target);           // 模型空間旋轉
  bone.parent.getWorldQuaternion(_parentQ);
  _local.copy(_parentQ).invert().multiply(_delta).multiply(_parentQ); // 轉成父骨 local 空間
  bone.quaternion.premultiply(_local);
}

/**
 * 對「已 clone 且尚未加入場景」的 Ready Player Me 骨架套上坐姿（直接改骨骼，不需要動畫檔）。
 * 回傳站姿時 Hips / Head 的高度（供定位與標籤使用）與頭部點頭用的資料；找不到 Hips 回傳 null。
 */
export function applySittingPose(root, kneel = false) {
  const bone = (name) => root.getObjectByName(name);
  const hips = bone('Hips');
  if (!hips) return null;

  root.updateMatrixWorld(true);
  const hipHeight = hips.getWorldPosition(new THREE.Vector3()).y;
  const head = bone('Head');
  const headHeight = head ? head.getWorldPosition(new THREE.Vector3()).y : hipHeight + 0.65;

  // 順序很重要：先父骨再子骨
  for (const side of ['Left', 'Right']) {
    const sx = side === 'Left' ? 1 : -1; // 角色面向 +Z 時，Left 在 +X
    if (kneel) {
      // 跪坐：大腿向前、小腿反折貼地收在大腿下方，腳尖朝後
      aimBone(bone(`${side}UpLeg`), bone(`${side}Leg`),  new THREE.Vector3(sx * 0.1, -0.12, 1));
      aimBone(bone(`${side}Leg`),   bone(`${side}Foot`), new THREE.Vector3(-sx * 0.04, -0.06, -1));
      aimBone(bone(`${side}Foot`),  bone(`${side}ToeBase`), new THREE.Vector3(0, -0.15, -1));
    } else {
      aimBone(bone(`${side}UpLeg`),  bone(`${side}Leg`),     new THREE.Vector3(sx * 0.08, 0, 1));      // 大腿水平向前
      aimBone(bone(`${side}Leg`),    bone(`${side}Foot`),    new THREE.Vector3(0, -1, 0.05));          // 小腿垂直向下
    }
    aimBone(bone(`${side}Arm`),    bone(`${side}ForeArm`), new THREE.Vector3(sx * 0.12, -1, 0.1));   // 上臂放下
    aimBone(bone(`${side}ForeArm`), bone(`${side}Hand`),   new THREE.Vector3(-sx * 0.1, -0.45, 1));  // 前臂伸向桌面
  }

  // 頭部點頭：預先算好「模型 X 軸」在父骨空間的軸向，之後每幀只需 setFromAxisAngle
  let nod = null;
  if (head?.parent) {
    head.parent.getWorldQuaternion(_parentQ);
    nod = {
      bone: head,
      base: head.quaternion.clone(),
      axis: new THREE.Vector3(1, 0, 0).applyQuaternion(_parentQ.invert()).normalize(),
    };
  }

  // Q 版：放大頭部（頭髮、臉、配件都掛在 Head 骨底下，會一起放大）
  if (head) head.scale.setScalar(CHIBI_HEAD_SCALE);

  // 手臂 IK 用：坐姿擺好之後的基準旋轉與骨長（reachArm 每幀都從這個基準出發），以及上身前傾用的脊椎
  root.updateMatrixWorld(true);
  const limb = (side) => {
    const arm = bone(`${side}Arm`); const fore = bone(`${side}ForeArm`); const hand = bone(`${side}Hand`);
    if (!arm || !fore || !hand) return null;
    return {
      arm, fore, hand,
      a: boneDist(arm, fore), b: boneDist(fore, hand),
      baseArm: arm.quaternion.clone(), baseFore: fore.quaternion.clone(),
    };
  };
  const limbs = { L: limb('Left'), R: limb('Right') };
  const lean = { spine: makeSwing(root, 'Spine'), spine1: makeSwing(root, 'Spine1') };

  return { hipHeight, headHeight: headHeight + 0.1 * (CHIBI_HEAD_SCALE - 1) * 3, nod, limbs, lean };
}
