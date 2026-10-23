import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
// SkinnedMesh 的 .clone() 不會重新綁定骨架，多人共用同一個 glb 會互相拉扯；
// SkeletonUtils.clone 等同 .clone()，但會正確複製骨架。幾何與材質仍與快取共用，記憶體不會倍增。
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BookOpen, Coffee } from 'lucide-react';
import { applySittingPose } from './sitPose';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';
import { useCountdown, formatMMSS } from '../../hooks/useCountdown';
import { sanitizeAvatarUrl } from '../../lib/avatarUrl';

const SIT = {
  hipAboveSeat: 0.07, // 髖部高出椅面
  backShift: 0.12,    // 往椅背方向退一點
  labelAboveHead: 0.4,
};
const FALLBACK_HIP_HEIGHT = 0.95;
const _q = new THREE.Quaternion();

/** 提早預載（在座位資料抵達、角色真的渲染之前）。不合法網址會被略過。 */
export function preloadAvatar(rawUrl) {
  const url = sanitizeAvatarUrl(rawUrl);
  if (url) useGLTF.preload(url);
}

/* ------------------------- 頭頂 2D UI ------------------------- */
function AvatarHud({ seat, isSelf, y }) {
  const remaining = useCountdown(seat.phase_ends_at);
  const studying = seat.status === 'studying';
  const finished = remaining === 0;

  return (
    <Html position={[0, y, 0]} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pointer-events-none flex select-none flex-col items-center gap-1 whitespace-nowrap">
        <div className="rounded-full bg-black/60 px-2.5 py-0.5 text-xs font-medium text-white">
          {seat.occupant_name ?? '同學'}{isSelf ? '（你）' : ''}
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-mono text-xl font-semibold text-white shadow-lg ${
            studying ? 'bg-amber-600/90' : 'bg-emerald-700/90'
          }`}
        >
          {studying ? <BookOpen size={16} /> : <Coffee size={16} />}
          {finished ? '時間到' : formatMMSS(remaining)}
        </div>
        {studying && seat.task && (
          <div className="max-w-[180px] truncate rounded-md bg-white/90 px-2 py-0.5 text-xs text-stone-800">
            {seat.task}
          </div>
        )}
      </div>
    </Html>
  );
}

/* ------------------------- 占位角色（沒有頭像 / 載入中 / 載入失敗） ------------------------- */
function PlaceholderAvatar({ seat, isSelf, dim = false }) {
  const color = isSelf ? '#f0a35e' : '#8aa4c8';
  return (
    <group position={[0, 0, -SIT.backShift]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.17, 0.4, 6, 12]} />
        <meshStandardMaterial color={color} transparent={dim} opacity={dim ? 0.5 : 1} />
      </mesh>
      <mesh position={[0, 0.95, 0.02]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#f1d5b8" transparent={dim} opacity={dim ? 0.5 : 1} />
      </mesh>
      <AvatarHud seat={seat} isSelf={isSelf} y={1.3} />
    </group>
  );
}

/* ------------------------- Ready Player Me 模型 ------------------------- */
function AvatarModel({ url, seat, isSelf }) {
  const { scene } = useGLTF(url); // 載入失敗會 throw，由外層 ErrorBoundary 接住

  // 每位玩家各自 clone 一份，並只做一次坐姿擺放
  const rig = useMemo(() => {
    const root = cloneSkinned(scene);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false; // 擺完姿勢後原本的包圍盒不準，關掉避免角色被誤剔除
      }
    });
    return { root, info: applySittingPose(root) };
  }, [scene]);

  const hipHeight = rig.info?.hipHeight ?? FALLBACK_HIP_HEIGHT;
  const headHeight = rig.info?.headHeight ?? hipHeight + 0.65;
  const labelY = headHeight - hipHeight + SIT.hipAboveSeat + SIT.labelAboveHead;

  // 專注時低頭、休息時抬頭，加一點呼吸起伏
  const nodAngle = useRef(0);
  useFrame(({ clock }, delta) => {
    const nod = rig.info?.nod;
    if (!nod) return;
    const target = seat.status === 'studying' ? 0.32 : 0.02;
    nodAngle.current = THREE.MathUtils.damp(nodAngle.current, target, 4, delta);
    const breathing = Math.sin(clock.elapsedTime * 1.6) * 0.012;
    _q.setFromAxisAngle(nod.axis, nodAngle.current + breathing);
    nod.bone.quaternion.copy(_q).multiply(nod.base);
  });

  return (
    <>
      <primitive object={rig.root} position={[0, SIT.hipAboveSeat - hipHeight, -SIT.backShift]} />
      <AvatarHud seat={seat} isSelf={isSelf} y={labelY} />
    </>
  );
}

/* ------------------------- 對外組件 ------------------------- */
export default function UserAvatar3D({ seat, isSelf = false }) {
  const url = useMemo(() => sanitizeAvatarUrl(seat.occupant_avatar_url), [seat.occupant_avatar_url]);
  const placeholder = <PlaceholderAvatar seat={seat} isSelf={isSelf} />;

  return (
    // 座標：seat.pos_* 是椅面中心；rot_y 決定面向
    <group position={[seat.pos_x, seat.pos_y, seat.pos_z]} rotation={[0, seat.rot_y, 0]}>
      {url ? (
        <AvatarErrorBoundary key={url} fallback={placeholder}>
          <Suspense fallback={<PlaceholderAvatar seat={seat} isSelf={isSelf} dim />}>
            <AvatarModel url={url} seat={seat} isSelf={isSelf} />
          </Suspense>
        </AvatarErrorBoundary>
      ) : (
        placeholder
      )}
    </group>
  );
}
