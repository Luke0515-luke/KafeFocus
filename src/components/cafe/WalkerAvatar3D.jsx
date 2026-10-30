import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { animateWalk, createWalkRig } from './walkPose';
import SpeechBubble from './Bubble';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';
import { sanitizeAvatarUrl } from '../../lib/avatarUrl';
import { openProfile } from '../../lib/openProfile';
import { applyOutfitToRig, outfitKey, resolveOutfit } from '../../lib/outfit';
import AvatarHead from './AvatarHead';

const dampAngle = (cur, target, lambda, dt) => {
  let d = ((target - cur + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return cur + d * (1 - Math.exp(-lambda * dt));
};

/** 走路角色頭頂的名字與聊天泡泡 */
function NameTag({ name, isSelf, y, bubble, uid }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pointer-events-none flex select-none flex-col items-center gap-1 whitespace-nowrap">
        <SpeechBubble bubble={bubble} />
        <div
          onClick={() => openProfile(uid)} role="button" tabIndex={0}
          className={`pointer-events-auto cursor-pointer rounded-md px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${
            isSelf ? 'bg-amber-700/90 text-amber-50' : 'bg-stone-900/80 text-stone-100 ring-1 ring-stone-600/60'
          }`}
        >
          {name ?? '同學'}{isSelf ? '（你）' : ''}
        </div>
      </div>
    </Html>
  );
}

/** 一隻會擺動的手臂：肩膀擺動 → 手肘彎曲。上臂是衣服色（短袖），前臂與手是膚色。 */
function Arm({ side, armRef, foreRef, outfit, mat }) {
  return (
    <group ref={armRef} position={[side * 0.215, 1.22, 0]}>
      <mesh position={[0, -0.15, 0]} castShadow>
        <capsuleGeometry args={[0.052, 0.2, 4, 10]} />
        <meshStandardMaterial color={outfit.shirt} {...mat} />
      </mesh>
      <group ref={foreRef} position={[0, -0.3, 0]}>
        <mesh position={[0, -0.14, 0]} castShadow>
          <capsuleGeometry args={[0.042, 0.18, 4, 10]} />
          <meshStandardMaterial color={outfit.skin} {...mat} />
        </mesh>
        <mesh position={[0, -0.3, 0.01]} castShadow>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshStandardMaterial color={outfit.skin} {...mat} />
        </mesh>
      </group>
    </group>
  );
}

/** 沒有頭像 / 載入中 / 載入失敗時的簡約人形：會擺腿、擺手（手臂與腿反向擺動），顏色用自訂外觀 */
function PlaceholderWalker({ motion, name, isSelf, bubble, dim = false, uid, outfit: rawOutfit }) {
  const o = useMemo(() => resolveOutfit(rawOutfit, uid), [outfitKey(rawOutfit), uid]); // eslint-disable-line react-hooks/exhaustive-deps
  const legL = useRef(); const legR = useRef();
  const armL = useRef(); const armR = useRef(); const foreL = useRef(); const foreR = useRef();
  const mat = { transparent: dim, opacity: dim ? 0.5 : 1, roughness: 0.85 };
  useFrame(() => {
    const { phase, amt } = motion.current;
    const s = Math.sin(phase);
    if (legL.current) legL.current.rotation.x = s * 0.5 * amt;
    if (legR.current) legR.current.rotation.x = -s * 0.5 * amt;
    // 手臂與同側的腿反向：左腿往後時左手往前（負角度 = 往前）
    if (armL.current) armL.current.rotation.x = -s * 0.7 * amt;
    if (armR.current) armR.current.rotation.x = s * 0.7 * amt;
    const bendL = -(0.12 + 0.3 * amt + 0.25 * Math.max(0, s) * amt);
    const bendR = -(0.12 + 0.3 * amt + 0.25 * Math.max(0, -s) * amt);
    if (foreL.current) foreL.current.rotation.x = bendL;
    if (foreR.current) foreR.current.rotation.x = bendR;
  });
  return (
    <group>
      {/* 軀幹（上衣） */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <capsuleGeometry args={[0.16, 0.3, 6, 14]} />
        <meshStandardMaterial color={o.shirt} {...mat} />
      </mesh>
      {/* 頭（頭型 / 臉 / 髮型可自選） */}
      <AvatarHead outfit={o} mat={mat} position={[0, 1.5, 0.01]} />
      {/* 雙臂：側面看得到，不會再「消失」 */}
      <Arm side={1} armRef={armL} foreRef={foreL} outfit={o} mat={mat} />
      <Arm side={-1} armRef={armR} foreRef={foreR} outfit={o} mat={mat} />
      {/* 雙腿（褲子）與鞋子 */}
      {[[legL, -0.08], [legR, 0.08]].map(([ref, x], i) => (
        <group key={i} ref={ref} position={[x, 0.78, 0]}>
          <mesh position={[0, -0.36, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.6, 4, 10]} />
            <meshStandardMaterial color={o.pants} {...mat} />
          </mesh>
          <mesh position={[0, -0.74, 0.04]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.18]} />
            <meshStandardMaterial color="#1c1a19" {...mat} />
          </mesh>
        </group>
      ))}
      <NameTag name={name} isSelf={isSelf} y={1.95} bubble={bubble} uid={uid} />
    </group>
  );
}

function WalkerModel({ url, motion, name, isSelf, bubble, uid, outfit }) {
  const { scene } = useGLTF(url);
  const rig = useMemo(() => {
    const root = cloneSkinned(scene);
    root.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; }
    });
    applyOutfitToRig(root, resolveOutfit(outfit, uid)); // 只有使用者自訂過才會動材質
    return { root, info: createWalkRig(root) };
  }, [scene, outfitKey(outfit), uid]); // eslint-disable-line react-hooks/exhaustive-deps
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
      <NameTag name={name} isSelf={isSelf} y={labelY} bubble={bubble} uid={uid} />
    </group>
  );
}

/**
 * 站著 / 走路的角色。
 * stateRef.current = { x, z, y（樓層高度，沒有就是 0）, rot, moving }：本人由模擬直接更新；別人（smooth）則會平滑地追向網路傳來的位置。
 */
export default function WalkerAvatar3D({ stateRef, url: rawUrl, name, isSelf = false, bubble, smooth = false, uid, outfit }) {
  const url = useMemo(() => sanitizeAvatarUrl(rawUrl), [rawUrl]);
  const outer = useRef();
  const vis = useRef(null);
  const motion = useRef({ phase: 0, amt: 0 });

  useFrame((_, delta) => {
    const s = stateRef.current;
    if (!s || !outer.current) return;
    const dt = Math.min(delta, 0.05);
    if (!vis.current) vis.current = { x: s.x, y: s.y ?? 0, z: s.z, rot: s.rot };
    const v = vis.current;
    let moving = !!s.moving;
    if (smooth) {
      const px = v.x; const pz = v.z;
      const k = 1 - Math.exp(-10 * dt);
      v.x += (s.x - v.x) * k;
      v.y += ((s.y ?? 0) - v.y) * k;
      v.z += (s.z - v.z) * k;
      const speed = Math.hypot(v.x - px, v.z - pz) / Math.max(dt, 1e-4);
      moving = speed > 0.25;
      if (moving) v.rot = dampAngle(v.rot, Math.atan2(v.x - px, v.z - pz), 10, dt);
      else v.rot = dampAngle(v.rot, s.rot, 6, dt);
    } else {
      v.x = s.x; v.y = s.y ?? 0; v.z = s.z; v.rot = s.rot;
    }
    outer.current.position.set(v.x, v.y, v.z);
    outer.current.rotation.y = v.rot;
    const m = motion.current;
    m.amt = THREE.MathUtils.damp(m.amt, moving ? 1 : 0, 8, dt);
    m.phase += dt * 8.5 * (moving ? 1 : m.amt);
  });

  const placeholder = <PlaceholderWalker motion={motion} name={name} isSelf={isSelf} bubble={bubble} uid={uid} outfit={outfit} />;
  return (
    <group ref={outer}>
      {url ? (
        <AvatarErrorBoundary key={url} fallback={placeholder}>
          <Suspense fallback={<PlaceholderWalker motion={motion} name={name} isSelf={isSelf} bubble={bubble} uid={uid} outfit={outfit} dim />}>
            <WalkerModel url={url} motion={motion} name={name} isSelf={isSelf} bubble={bubble} uid={uid} outfit={outfit} />
          </Suspense>
        </AvatarErrorBoundary>
      ) : (
        placeholder
      )}
    </group>
  );
}
