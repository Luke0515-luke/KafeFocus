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

/* ------------------------- 頭頂 2D UI（深色霧面標籤） ------------------------- */
function AvatarHud({ seat, isSelf, y }) {
  const remaining = useCountdown(seat.phase_ends_at);
  const studying = seat.status === 'studying';
  const finished = remaining === 0;

  return (
    <Html position={[0, y, 0]} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pointer-events-none flex select-none flex-col items-center gap-1 whitespace-nowrap">
        <div
          className={`rounded-md px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${
            isSelf ? 'bg-amber-700/90 text-amber-50' : 'bg-stone-900/80 text-stone-100 ring-1 ring-stone-600/60'
          }`}
        >
          {seat.occupant_name ?? '同學'}{isSelf ? '（你）' : ''}
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-lg font-semibold shadow-lg ${
            studying ? 'bg-amber-600/90 text-stone-950' : 'bg-emerald-800/90 text-emerald-50'
          }`}
        >
          {studying ? <BookOpen size={15} /> : <Coffee size={15} />}
          {finished ? '時間到' : formatMMSS(remaining)}
        </div>
        {studying && seat.task && (
          <div className="max-w-[180px] truncate rounded-md bg-stone-900/80 px-2.5 py-0.5 text-xs text-stone-200 ring-1 ring-stone-600/60">
            {seat.task}
          </div>
        )}
      </div>
    </Html>
  );
}

/* ------------------------- 占位角色（沒頭像 / 載入中 / 載入失敗）：低調的人形 ------------------------- */
const CLOTHES = ['#5b4636', '#3f4f48', '#44465a', '#5d4343', '#51493a'];
const hashColor = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CLOTHES[h % CLOTHES.length];
};

function PlaceholderAvatar({ seat, isSelf, dim = false }) {
  const cloth = hashColor(seat.occupant_id ?? '');
  const mat = { transparent: dim, opacity: dim ? 0.5 : 1, roughness: 0.85 };
  const bob = useRef();
  useFrame(({ clock }) => {
    if (!bob.current) return;
    bob.current.position.y = Math.sin(clock.elapsedTime * 1.8) * 0.006;
    bob.current.rotation.x = seat.status === 'studying' ? 0.1 : 0;
  });

  return (
    <group position={[0, 0, -SIT.backShift]}>
      <group ref={bob}>
        {/* 軀幹 */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.26, 6, 14]} />
          <meshStandardMaterial color={cloth} {...mat} />
        </mesh>
        {/* 頭與頭髮 */}
        <mesh position={[0, 0.7, 0.01]} castShadow>
          <sphereGeometry args={[0.11, 22, 18]} />
          <meshStandardMaterial color="#d2a984" {...mat} />
        </mesh>
        <mesh position={[0, 0.725, -0.005]} castShadow>
          <sphereGeometry args={[0.118, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color="#241912" {...mat} />
        </mesh>
        {/* 雙臂伸向桌面 */}
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.2, 0.3, 0.17]} rotation={[Math.PI / 2 - 0.35, 0, sx * 0.08]} castShadow>
            <capsuleGeometry args={[0.04, 0.26, 4, 10]} />
            <meshStandardMaterial color={cloth} {...mat} />
          </mesh>
        ))}
      </group>
      <AvatarHud seat={seat} isSelf={isSelf} y={1.05} />
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
