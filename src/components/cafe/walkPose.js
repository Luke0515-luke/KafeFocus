import * as THREE from 'three';
import { aimBoneIn, makeSwing, setSwing } from './rigUtils';
import { CHIBI_HEAD_SCALE } from './sitPose';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/**
 * 站姿 + 走路用的骨架（對已 clone、尚未加入場景的 Ready Player Me 模型）。
 * 走路是程式算的擺動：腿與手臂繞「模型 X 軸」前後擺，膝蓋在後擺時彎曲。
 */
export function createWalkRig(root) {
  const bone = (n) => root.getObjectByName(n);
  const hips = bone('Hips');
  if (!hips) return null;
  root.updateMatrixWorld(true);
  const hipHeight = hips.getWorldPosition(new THREE.Vector3()).y;
  const head = bone('Head');
  const headHeight = head ? head.getWorldPosition(new THREE.Vector3()).y : hipHeight + 0.65;

  for (const side of ['Left', 'Right']) {
    const sx = side === 'Left' ? 1 : -1;
    aimBoneIn(root, bone(`${side}UpLeg`), bone(`${side}Leg`), V(0, -1, 0));
    aimBoneIn(root, bone(`${side}Leg`), bone(`${side}Foot`), V(0, -1, 0));
    aimBoneIn(root, bone(`${side}Arm`), bone(`${side}ForeArm`), V(sx * 0.1, -1, 0));
    aimBoneIn(root, bone(`${side}ForeArm`), bone(`${side}Hand`), V(sx * 0.04, -1, 0.18));
  }

  const sw = {
    lUp: makeSwing(root, 'LeftUpLeg'), rUp: makeSwing(root, 'RightUpLeg'),
    lKnee: makeSwing(root, 'LeftLeg'), rKnee: makeSwing(root, 'RightLeg'),
    lArm: makeSwing(root, 'LeftArm'), rArm: makeSwing(root, 'RightArm'),
    lFore: makeSwing(root, 'LeftForeArm'), rFore: makeSwing(root, 'RightForeArm'),
    head: makeSwing(root, 'Head'),
  };
  if (head) head.scale.setScalar(CHIBI_HEAD_SCALE);

  return { hipHeight, headHeight: headHeight + 0.1 * (CHIBI_HEAD_SCALE - 1) * 3, sw };
}

/** phase：步伐相位；amt：0（站著）~ 1（走路）；t：時間（秒，用來做呼吸） */
export function animateWalk(rig, phase, amt, t) {
  const s = Math.sin(phase);
  const { sw } = rig;
  // 往前 = 負角度（腿與手臂皆然）；左腿往前時右手往前
  setSwing(sw.lUp, -0.55 * s * amt);
  setSwing(sw.rUp, 0.55 * s * amt);
  setSwing(sw.lKnee, 0.9 * Math.max(0, -s) * amt);
  setSwing(sw.rKnee, 0.9 * Math.max(0, s) * amt);
  setSwing(sw.lArm, 0.45 * s * amt);
  setSwing(sw.rArm, -0.45 * s * amt);
  setSwing(sw.lFore, -0.3 * amt);
  setSwing(sw.rFore, -0.3 * amt);
  setSwing(sw.head, 0.03 + Math.sin(t * 1.6) * 0.012);
}
