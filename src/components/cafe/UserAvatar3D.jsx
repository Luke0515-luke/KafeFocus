import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, useGLTF } from '@react-three/drei';
import { openProfile } from '../../lib/openProfile';
import * as THREE from 'three';
// SkinnedMesh 的 .clone() 不會重新綁定骨架，多人共用同一個 glb 會互相拉扯；
// SkeletonUtils.clone 等同 .clone()，但會正確複製骨架。幾何與材質仍與快取共用，記憶體不會倍增。
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { BookOpen, Coffee } from 'lucide-react';
import { applySittingPose } from './sitPose';
import { reachArm, setSwing, solveElbow } from './rigUtils';
import { createSeatedState, stepActivity, SIT } from './seatedMotion';
import SeatProps from './SeatProps';
import AvatarHead from './AvatarHead';
import SpeechBubble from './Bubble';
import { effectiveStyle, seatHeight, seatFloorY } from './layout';
import { usePalette } from './palette';
import { applyOutfitToRig, outfitKey, resolveOutfit } from '../../lib/outfit';
import { AvatarErrorBoundary } from './AvatarErrorBoundary';
import { useCountdown, formatMMSS } from '../../hooks/useCountdown';
import { sanitizeAvatarUrl } from '../../lib/avatarUrl';

const FALLBACK_HIP_HEIGHT = 0.95;
const _q = new THREE.Quaternion();
const _UP = new THREE.Vector3(0, 1, 0);
const _dirv = new THREE.Vector3();

/** 提早預載（在座位資料抵達、角色真的渲染之前）。不合法網址會被略過。 */
export function preloadAvatar(rawUrl) {
  const url = sanitizeAvatarUrl(rawUrl);
  if (url) useGLTF.preload(url);
}

/* ------------------------- 頭頂 2D UI（深色霧面標籤） ------------------------- */
function AvatarHud({ seat, isSelf, y, bubble }) {
  const remaining = useCountdown(seat.phase_ends_at);
  const studying = seat.status === 'studying';
  const finished = remaining === 0;

  return (
    <Html position={[0, y, 0]} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className="pointer-events-none flex select-none flex-col items-center gap-1 whitespace-nowrap">
        <SpeechBubble bubble={bubble} />
        <div
          onClick={() => openProfile(seat.occupant_id)} role="button" tabIndex={0}
          className={`pointer-events-auto cursor-pointer rounded-md px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm ${
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
const ARM_A = 0.32; // 占位角色：上臂、前臂長度（卡通比例，稍長一點才搆得到桌面）
const ARM_B = 0.36;
const _S = new THREE.Vector3(); const _E = new THREE.Vector3(); const _H = new THREE.Vector3();
const _T = new THREE.Vector3(); const _headSF = new THREE.Vector3();

/** 讓一根膠囊（單位長度 = ARM_A / ARM_B 的那種）從 p 伸到 q */
function placeSegment(mesh, p, q, baseLen) {
  if (!mesh) return;
  _dirv.subVectors(q, p);
  const len = _dirv.length();
  if (len < 1e-5) return;
  mesh.position.set((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  mesh.quaternion.setFromUnitVectors(_UP, _dirv.divideScalar(len));
  mesh.scale.set(1, len / baseLen, 1);
}

function PlaceholderAvatar({ seat, isSelf, dim = false, bubble, st, style, outfit }) {
  const kneel = style === 'kneel';
  const o = useMemo(() => resolveOutfit(outfit, seat.occupant_id ?? ''), [outfitKey(outfit), seat.occupant_id]); // eslint-disable-line react-hooks/exhaustive-deps
  const legLen = Math.max(0.3, seat.pos_y - 0.06);
  const seatBaseY = kneel ? 0.09 : seat.pos_y;
  const mat = { transparent: dim, opacity: dim ? 0.5 : 1, roughness: 0.85 };
  const body = useRef();
  const armRefs = useRef({});
  const setArm = (k) => (m) => { armRefs.current[k] = m; };

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const lean = st.current.lean;
    const c = Math.cos(lean); const sn = Math.sin(lean);

    // 這一幀先用上一幀的前傾角算肩、頭的位置（座位座標系 = 這個群組座標 + (0,0,-backShift)）
    _headSF.set(0, 0.7 * c - 0.01 * sn, 0.7 * sn + 0.01 * c - SIT.backShift);
    stepActivity(st.current, {
      seat, style, t, dt, headSF: _headSF,
      shoulderY: 0.52 * c, shoulderZ: 0.52 * sn - SIT.backShift, reach: ARM_A + ARM_B,
    });

    if (body.current) {
      body.current.position.y = Math.sin(t * 1.8) * 0.006;
      body.current.rotation.x = st.current.lean;
    }
    // 雙臂：兩段式 IK，肩膀跟著前傾轉
    for (const [side, sx, target, pole] of [['L', 1, st.current.L, st.current.poleL], ['R', -1, st.current.R, st.current.poleR]]) {
      _S.set(sx * 0.2, 0.52 * c, 0.52 * sn);
      _T.copy(target); _T.z += SIT.backShift;
      solveElbow(_S, _T, ARM_A, ARM_B, pole, _E, _H);
      placeSegment(armRefs.current[`${side}u`], _S, _E, ARM_A);
      placeSegment(armRefs.current[`${side}f`], _E, _H, ARM_B);
    }
  });

  return (
    <group position={[0, 0, -SIT.backShift]}>
      <group ref={body}>
        {/* 軀幹 */}
        <mesh position={[0, 0.34, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.26, 6, 14]} />
          <meshStandardMaterial color={o.shirt} {...mat} />
        </mesh>
        {/* 頭（頭型 / 臉 / 髮型可自選） */}
        <AvatarHead outfit={o} mat={mat} position={[0, 0.7, 0.01]} />
      </group>
      {/* 雙腿：大腿水平向前、小腿垂到地面（褲子顏色） */}
      {kneel && [-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.1, 0, 0.06]}>
          <mesh position={[0, 0.075, 0.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.28, 4, 10]} />
            <meshStandardMaterial color={o.pants} {...mat} />
          </mesh>
          <mesh position={[0, 0.02, 0.0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.055, 0.3, 4, 10]} />
            <meshStandardMaterial color={o.pants} {...mat} />
          </mesh>
        </group>
      ))}
      {!kneel && [-1, 1].map((sx) => (
        <group key={sx} position={[sx * 0.1, 0, 0.06]}>
          <mesh position={[0, 0.075, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <capsuleGeometry args={[0.07, 0.3, 4, 10]} />
            <meshStandardMaterial color={o.pants} {...mat} />
          </mesh>
          <mesh position={[0, 0.075 - legLen / 2, 0.4]} castShadow>
            <capsuleGeometry args={[0.055, Math.max(0.05, legLen - 0.11), 4, 10]} />
            <meshStandardMaterial color={o.pants} {...mat} />
          </mesh>
          <mesh position={[0, -seatBaseY + 0.03, 0.46]} castShadow>
            <boxGeometry args={[0.1, 0.06, 0.2]} />
            <meshStandardMaterial color="#1c1a19" {...mat} />
          </mesh>
        </group>
      ))}
      {/* 雙臂（每幀由 IK 擺放） */}
      {['L', 'R'].map((side) => (
        <group key={side}>
          <mesh ref={setArm(`${side}u`)} castShadow>
            <capsuleGeometry args={[0.04, ARM_A - 0.08, 4, 10]} />
            <meshStandardMaterial color={o.shirt} {...mat} />
          </mesh>
          <mesh ref={setArm(`${side}f`)} castShadow>
            <capsuleGeometry args={[0.035, ARM_B - 0.07, 4, 10]} />
            <meshStandardMaterial color={o.skin} {...mat} />
          </mesh>
        </group>
      ))}
      <AvatarHud seat={seat} isSelf={isSelf} y={1.05} bubble={bubble} />
    </group>
  );
}

/* ------------------------- Ready Player Me 模型 ------------------------- */
function AvatarModel({ url, seat, isSelf, bubble, st, style, outfit }) {
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
    applyOutfitToRig(root, resolveOutfit(outfit, seat.occupant_id ?? '')); // 只有使用者自訂過才會動材質
    return { root, info: applySittingPose(root, style === 'kneel') };
  }, [scene, outfitKey(outfit), seat.occupant_id, style]); // eslint-disable-line react-hooks/exhaustive-deps

  const hipUp = style === 'kneel' ? 0.1 : SIT.hipAboveSeat;
  const hipHeight = rig.info?.hipHeight ?? FALLBACK_HIP_HEIGHT;
  const headHeight = rig.info?.headHeight ?? hipHeight + 0.65;
  const labelY = headHeight - hipHeight + hipUp + SIT.labelAboveHead;
  // 角色根節點在座位座標系的位置（和下面 <primitive position> 一致）
  const rootPos = useMemo(() => new THREE.Vector3(0, hipUp - hipHeight, -SIT.backShift), [hipHeight, hipUp]);
  const tmp = useMemo(() => ({ head: new THREE.Vector3(), sh: new THREE.Vector3(), tl: new THREE.Vector3(), tr: new THREE.Vector3() }), []);

  // 每幀：決定動作（打電腦 / 看書 / 喝咖啡）→ 前傾、點頭 → 雙手 IK 伸到目標
  useFrame(({ clock }, delta) => {
    const info = rig.info;
    if (!info) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const { limbs, nod, lean } = info;
    const s = st.current;

    // 頭與肩膀目前的位置（座位座標系）
    if (nod?.bone) { nod.bone.getWorldPosition(tmp.head); rig.root.worldToLocal(tmp.head).add(rootPos); } else tmp.head.set(0, 0.75, 0);
    let sy = 0.55; let sz = -0.1; let reach = 0;
    if (limbs.L && limbs.R) {
      limbs.L.arm.getWorldPosition(tmp.sh); rig.root.worldToLocal(tmp.sh).add(rootPos);
      sy = tmp.sh.y; sz = tmp.sh.z;
      limbs.R.arm.getWorldPosition(tmp.sh); rig.root.worldToLocal(tmp.sh).add(rootPos);
      sy = (sy + tmp.sh.y) / 2; sz = (sz + tmp.sh.z) / 2;
      reach = Math.min(limbs.L.a + limbs.L.b, limbs.R.a + limbs.R.b);
    }
    stepActivity(s, { seat, style, t, dt, headSF: tmp.head, shoulderY: sy, shoulderZ: sz, reach });

    // 上身前傾（工作時）與點頭，加一點呼吸起伏
    if (lean?.spine) setSwing(lean.spine, s.lean * 0.5);
    if (lean?.spine1) setSwing(lean.spine1, s.lean * 0.5);
    if (nod) {
      _q.setFromAxisAngle(nod.axis, s.nod + Math.sin(t * 1.6) * 0.012);
      nod.bone.quaternion.copy(_q).multiply(nod.base);
    }

    // 雙手伸向目標（座位座標 → 角色根節點座標）
    if (limbs.L && limbs.R) {
      reachArm(rig.root, limbs.L, tmp.tl.copy(s.L).sub(rootPos), s.poleL);
      reachArm(rig.root, limbs.R, tmp.tr.copy(s.R).sub(rootPos), s.poleR);
    }
  });

  return (
    <>
      <primitive object={rig.root} position={[0, hipUp - hipHeight, -SIT.backShift]} />
      <AvatarHud seat={seat} isSelf={isSelf} y={labelY} bubble={bubble} />
    </>
  );
}

/* ------------------------- 對外組件 ------------------------- */
export default function UserAvatar3D({ seat, isSelf = false, bubble, outfit }) {
  const url = useMemo(() => sanitizeAvatarUrl(seat.occupant_avatar_url), [seat.occupant_avatar_url]);
  const P = usePalette();
  const style = effectiveStyle(seat, P.furniture);
  const seatY = seatHeight(seat, P.furniture);
  const st = useRef(null);
  if (!st.current) st.current = createSeatedState();
  const placeholder = <PlaceholderAvatar seat={seat} isSelf={isSelf} bubble={bubble} st={st} style={style} outfit={outfit} />;

  return (
    // 座標：seat.pos_* 是椅面中心；rot_y 決定面向
    <group position={[seat.pos_x, seatY + seatFloorY(seat), seat.pos_z]} rotation={[0, seat.rot_y, 0]}>
      {url ? (
        <AvatarErrorBoundary key={url} fallback={placeholder}>
          <Suspense fallback={<PlaceholderAvatar seat={seat} isSelf={isSelf} dim bubble={bubble} st={st} style={style} outfit={outfit} />}>
            <AvatarModel url={url} seat={seat} isSelf={isSelf} bubble={bubble} st={st} style={style} outfit={outfit} />
          </Suspense>
        </AvatarErrorBoundary>
      ) : (
        placeholder
      )}
      <SeatProps stateRef={st} />
    </group>
  );
}
