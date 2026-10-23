import * as THREE from 'three';

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
export function applySittingPose(root) {
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
    aimBone(bone(`${side}UpLeg`),  bone(`${side}Leg`),     new THREE.Vector3(sx * 0.08, 0, 1));      // 大腿水平向前
    aimBone(bone(`${side}Leg`),    bone(`${side}Foot`),    new THREE.Vector3(0, -1, 0.05));          // 小腿垂直向下
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

  return { hipHeight, headHeight, nod };
}
