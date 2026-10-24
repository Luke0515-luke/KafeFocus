import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { animateWalk, createWalkRig } from './walkPose';
import SpeechBubble from './Bubble';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';
import { sanitizeAvatarUrl } from '../../lib/avatarUrl';

const dampAngle = (cur, target, lambda, dt) => {
  let d = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-lambda * dt));
};

/** 走路角色頭頂的名字與聊天泡泡 */
function NameTag({ name, isSelf, y, bubble }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pointer-events-none flex select-none flex-col items-center gap-1 whitespace-nowrap">
        <SpeechBubble bubble={bubble} />
        <div
          className={`rounded-md px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${
            isSelf ? 'bg-amber-700/90 text-amber-50' : 'bg-stone-900/80 text-stone-100 ring-1 ring-stone-600/60'
          }`}
        >
          {name ?? '同學'}{isSelf ? '（你）' : ''}
        </div>
      </div>
    </Html>
  );
}

/** 沒有頭像 / 載入中 / 載入失敗時的簡約人形（也會擺腿） */
function PlaceholderWalker({ motion, name, isSelf, bubble, dim = false }) {
  const legL = useRef(); const legR = useRef();
  const mat = { transparent: dim, opacity: dim ? 0.5 : 1, roughness: 0.85 };
  useFrame(() => {
    const s = Math.sin(motion.current.phase) * 0.5 * motion.current.amt;
    if (legL.current) legL.current.rotation.x = s;
    if (legR.current) legR.current.rotation.x = -s;
  });
  return (
    <group>
      <mesh position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.3, 6, 14]} />
        <meshStandardMaterial color={isSelf ? '#7a5a3a' : '#4a5a52'} {...mat} />
      </mesh>
      <mesh position={[0, 1.5, 0.01]} castShadow>
        <sphereGeometry args={[0.11, 22, 18]} />
        <meshStandardMaterial color="#d2a984" {...mat} />
      </mesh>
      <mesh position={[0, 1.525, -0.005]} castShadow>
        <sphereGeometry args={[0.118, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#241912" {...mat} />
      </mesh>
      {[[legL, -0.08], [legR, 0.08]].map(([ref, x], i) => (
        <group key={i} ref={ref} position={[x, 0.78, 0]}>
          <mesh position={[0, -0.36, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.6, 4, 10]} />
            <meshStandardMaterial color="#2f3236" {...mat} />
          </mesh>
        </group>
      ))}
      <NameTag name={name} isSelf={isSelf} y={1.95} bubble={bubble} />
    </group>
  );
}

function WalkerModel({ url, motion, name, isSelf, bubble }) {
  const { scene } = useGLTF(url);
  const rig = useMemo(() => {
    const root = cloneSkinned(scene);
    root.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    });
    return { root, info: createWalkRig(root) };
  }, [scene]);
  const bob = useRef();

  useFrame(({ clock }) => {
    const m = motion.current;
    if (rig.info) animateWalk(rig.info, m.phase, m.amt, clock.elapsedTime);
    if (bob.current) bob.current.position.y = Math.abs(Math.sin(m.phase)) * 0.02 * m.amt;
  });

  const labelY = (rig.info?.headHeight ?? 1.65) + 0.4;
  return (
    <group ref={bob}>
      <primitive object={rig.root} />
      <NameTag name={name} isSelf={isSelf} y={labelY} bubble={bubble} />
    </group>
  );
}

/**
 * 站著 / 走路的角色。
 * stateRef.current = { x, z, rot, moving }：本人由模擬直接更新；別人（smooth）則會平滑地追向網路傳來的位置。
 */
export default function WalkerAvatar3D({ stateRef, url: rawUrl, name, isSelf = false, bubble, smooth = false }) {
  const url = useMemo(() => sanitizeAvatarUrl(rawUrl), [rawUrl]);
  const outer = useRef();
  const vis = useRef(null);
  const motion = useRef({ phase: 0, amt: 0 });

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s || !outer.current) return;
    const dt = Math.min(delta, 0.05);
    if (!vis.current) vis.current = { x: s.x, z: s.z, rot: s.rot };
    const v = vis.current;
    let moving = !!s.moving;
    if (smooth) {
      const px = v.x; const pz = v.z;
      const k = 1 - Math.exp(-10 * dt);
      v.x += (s.x - v.x) * k;
      v.z += (s.z - v.z) * k;
      const speed = Math.hypot(v.x - px, v.z - pz) / Math.max(dt, 1e-4);
      moving = speed > 0.25;
      if (moving) v.rot = dampAngle(v.rot, Math.atan2(v.x - px, v.z - pz), 10, dt);
      else v.rot = dampAngle(v.rot, s.rot, 6, dt);
    } else {
      v.x = s.x; v.z = s.z; v.rot = s.rot;
    }
    outer.current.position.set(v.x, 0, v.z);
    outer.current.rotation.y = v.rot;
    const m = motion.current;
    m.amt = THREE.MathUtils.damp(m.amt, moving ? 1 : 0, 8, dt);
    m.phase += dt * 8.5 * (moving ? 1 : m.amt);
  });

  const placeholder = <PlaceholderWalker motion={motion} name={name} isSelf={isSelf} bubble={bubble} />;
  return (
    <group ref={outer}>
      {url ? (
        <AvatarErrorBoundary key={url} fallback={placeholder}>
          <Suspense fallback={<PlaceholderWalker motion={motion} name={name} isSelf={isSelf} bubble={bubble} dim />}>
            <WalkerModel url={url} motion={motion} name={name} isSelf={isSelf} bubble={bubble} />
          </Suspense>
        </AvatarErrorBoundary>
      ) : (
        placeholder
      )}
    </group>
  );
}
