import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { smoothstep, solveElbow } from './rigUtils';

/**
 * 鋼琴前的琴師（駐店 NPC，裝飾用）：坐在琴凳上，雙手交替在琴鍵上彈奏，被按到的琴鍵會往下沉，
 * 上半身隨節奏搖擺、點頭，右腳偶爾踩延音踏板，頭上飄出音符。
 *
 * 座標：整個元件放在鋼琴的位置（Piano 的 position）。鋼琴的琴鍵面向 +Z，琴師坐在 +Z 側、面向 -Z。
 * 琴師的「本體座標」：原點在椅面、+Z 是面前、+X 是琴師的左手邊（所以低音鍵在 +X，高音鍵在 -X）。
 */
const ARM_A = 0.34;
const ARM_B = 0.38;
const BACK = 0.12;                // 身體相對椅面中心往後退（和一般座位的坐姿一樣）
const SEAT_Y = 0.485;             // 琴凳面高度
const SEAT_Z = 0.9;               // 琴師坐的位置（琴凳中心在 1.0，往琴鍵靠近一點好搆到）
const KEY_TOP = 0.82 - SEAT_Y;    // 琴鍵上表面相對椅面的高度
const KEY_Z = 0.66;               // 琴鍵（手放的位置）離琴師的距離
const KEYS = 14;
const kx = (i) => 0.554 - 0.092 * i;           // 第 i 個白鍵在琴師本體座標的 x
const keyWorldX = (i) => -0.554 + 0.092 * i;   // 同一個鍵在鋼琴座標的 x

const STEP = 0.22;                                          // 每個音的長度（秒）
const MELODY = [8, 10, 11, 10, 8, 6, 7, 8, 10, 8, 7, 6, 8, 11, 10, 8, 9, 10, 8, 7, 6, 7, 8, 8];
const BASS = [[0, 2], [2, 4], [1, 3], [2, 4], [0, 2], [3, 5], [1, 3], [2, 4]];

const JACKET = '#2b2b34'; const SHIRT = '#efe9dc'; const SKIN = '#e8b997'; const HAIR = '#241912'; const PANTS = '#1c1c22';
const _S = new THREE.Vector3(); const _E = new THREE.Vector3(); const _H = new THREE.Vector3(); const _T = new THREE.Vector3();
const _UP = new THREE.Vector3(0, 1, 0); const _d = new THREE.Vector3();
const POLE = { L: new THREE.Vector3(0.7, -1, -0.15), R: new THREE.Vector3(-0.7, -1, -0.15) };

function place(mesh, p, q, baseLen) {
  if (!mesh) return;
  _d.subVectors(q, p);
  const len = _d.length();
  if (len < 1e-5) return;
  mesh.position.set((p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2);
  mesh.quaternion.setFromUnitVectors(_UP, _d.divideScalar(len));
  mesh.scale.set(1, len / baseLen, 1);
}

/** 按下去的量：0（放開）→ 1（按到底）→ 0 */
const press = (u) => smoothstep(0, 0.18, u) * (1 - smoothstep(0.55, 0.85, u));

export default function PianoPlayer({ position }) {
  const body = useRef(); const head = useRef(); const pedal = useRef();
  const arms = useRef({});
  const setArm = (k) => (m) => { arms.current[k] = m; };
  const keys = useRef([]);
  const hand = useMemo(() => ({ L: new THREE.Vector3(0.3, KEY_TOP + 0.03, KEY_Z), R: new THREE.Vector3(-0.2, KEY_TOP + 0.03, KEY_Z) }), []);

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;
    const k = 1 - Math.exp(-16 * dt);

    // --- 右手彈旋律：每 STEP 秒一個音 ---
    const sr = t / STEP;
    const ri = Math.floor(sr) % MELODY.length;
    const ru = sr - Math.floor(sr);
    const rKey = MELODY[ri];
    const rPress = press(ru);
    // --- 左手彈和弦：每兩個音一次，同時按兩個鍵 ---
    const sl = t / (STEP * 2);
    const li = Math.floor(sl) % BASS.length;
    const lu = sl - Math.floor(sl);
    const [lk1, lk2] = BASS[li];
    const lPress = press(lu);

    const goalRx = kx(rKey);
    const goalLx = (kx(lk1) + kx(lk2)) / 2;
    hand.R.x += (goalRx - hand.R.x) * k;
    hand.L.x += (goalLx - hand.L.x) * k;
    hand.R.y = KEY_TOP + 0.045 - 0.04 * rPress;
    hand.L.y = KEY_TOP + 0.045 - 0.04 * lPress;
    hand.R.z = KEY_Z + 0.02 * Math.sin(t * 2.1);
    hand.L.z = KEY_Z + 0.02 * Math.sin(t * 1.7 + 1);

    // --- 琴鍵下沉 ---
    for (let i = 0; i < KEYS; i += 1) {
      const m = keys.current[i];
      if (!m) continue;
      let down = 0;
      if (i === rKey) down = Math.max(down, rPress);
      if (i === lk1 || i === lk2) down = Math.max(down, lPress);
      m.position.y = 0.809 - 0.012 * down;
      m.material.color.setRGB(0.93 - 0.05 * down, 0.9 - 0.09 * down, 0.85 - 0.2 * down);
    }

    // --- 身體：前傾、隨節奏點頭、左右輕搖 ---
    const lean = 0.34 + 0.03 * Math.sin(t * 3.0);
    const c = Math.cos(lean); const sn = Math.sin(lean);
    if (body.current) {
      body.current.rotation.x = lean;
      body.current.rotation.z = Math.sin(t * 0.9) * 0.05;
      body.current.position.y = Math.sin(t * 6.0) * 0.004;
    }
    if (head.current) {
      head.current.rotation.x = 0.1 + 0.07 * Math.sin(t * (Math.PI / STEP) * 0.5 + 0.6);
      head.current.rotation.z = Math.sin(t * 0.9 + 1.2) * 0.1;
    }
    if (pedal.current) pedal.current.rotation.x = -0.16 * Math.max(0, Math.sin(t * 1.4)) ** 2;

    // --- 雙臂 IK（本體座標 = 椅面座標往後退 BACK） ---
    for (const [side, sx, target] of [['L', 1, hand.L], ['R', -1, hand.R]]) {
      _S.set(sx * 0.2, 0.52 * c, 0.52 * sn);
      _T.copy(target); _T.z += BACK;
      solveElbow(_S, _T, ARM_A, ARM_B, POLE[side], _E, _H);
      place(arms.current[`${side}u`], _S, _E, ARM_A);
      place(arms.current[`${side}f`], _E, _H, ARM_B);
      if (arms.current[`${side}h`]) arms.current[`${side}h`].position.copy(_H);
    }
  });

  return (
    <group position={position}>
      {/* 琴鍵：蓋在鋼琴原本那片白鍵上，每個鍵獨立，會被按下去 */}
      {Array.from({ length: KEYS }).map((_, i) => (
        <mesh key={i} ref={(m) => { keys.current[i] = m; }} position={[keyWorldX(i), 0.809, 0.41]}>
          <boxGeometry args={[0.086, 0.014, 0.1]} />
          <meshStandardMaterial color="#ede6d9" roughness={0.4} />
        </mesh>
      ))}

      {/* 琴師 */}
      <group position={[0, SEAT_Y, SEAT_Z]} rotation={[0, Math.PI, 0]}>
        <group position={[0, 0, -BACK]}>
          <group ref={body}>
            <mesh position={[0, 0.34, 0]} castShadow>
              <capsuleGeometry args={[0.16, 0.26, 6, 14]} />
              <meshStandardMaterial color={JACKET} roughness={0.8} />
            </mesh>
            {/* 白襯衫領口與紅領結 */}
            <mesh position={[0, 0.58, 0.07]}>
              <boxGeometry args={[0.1, 0.07, 0.07]} />
              <meshStandardMaterial color={SHIRT} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.575, 0.11]}>
              <boxGeometry args={[0.07, 0.03, 0.02]} />
              <meshStandardMaterial color="#9d2b2b" roughness={0.6} />
            </mesh>
            <group ref={head} position={[0, 0.62, 0]}>
              <mesh position={[0, 0.08, 0.01]} castShadow>
                <sphereGeometry args={[0.11, 22, 18]} />
                <meshStandardMaterial color={SKIN} roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.105, -0.005]} castShadow>
                <sphereGeometry args={[0.118, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={HAIR} roughness={0.9} />
              </mesh>
            </group>
          </group>

          {/* 雙臂：上臂是外套、前臂是襯衫袖、手是膚色 */}
          {['L', 'R'].map((side) => (
            <group key={side}>
              <mesh ref={setArm(`${side}u`)} castShadow>
                <capsuleGeometry args={[0.042, ARM_A - 0.084, 4, 10]} />
                <meshStandardMaterial color={JACKET} roughness={0.8} />
              </mesh>
              <mesh ref={setArm(`${side}f`)} castShadow>
                <capsuleGeometry args={[0.036, ARM_B - 0.072, 4, 10]} />
                <meshStandardMaterial color={SHIRT} roughness={0.8} />
              </mesh>
              <mesh ref={setArm(`${side}h`)} castShadow>
                <boxGeometry args={[0.1, 0.03, 0.12]} />
                <meshStandardMaterial color={SKIN} roughness={0.85} />
              </mesh>
            </group>
          ))}
        </group>

        {/* 雙腿：大腿水平、小腿垂到地面；右腳踩踏板 */}
        {[-1, 1].map((sx) => (
          <group key={sx} position={[sx * 0.1, 0, 0.06]}>
            <mesh position={[0, 0.075, 0.18]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <capsuleGeometry args={[0.07, 0.3, 4, 10]} />
              <meshStandardMaterial color={PANTS} roughness={0.85} />
            </mesh>
            <group ref={sx === -1 ? pedal : undefined} position={[0, 0.075, 0.4]}>
              <mesh position={[0, -(SEAT_Y + 0.075) / 2 + 0.03, 0]} castShadow>
                <capsuleGeometry args={[0.055, SEAT_Y - 0.04, 4, 10]} />
                <meshStandardMaterial color={PANTS} roughness={0.85} />
              </mesh>
              <mesh position={[0, -(SEAT_Y + 0.075) + 0.03, 0.06]} castShadow>
                <boxGeometry args={[0.1, 0.06, 0.2]} />
                <meshStandardMaterial color="#141214" roughness={0.5} />
              </mesh>
            </group>
          </group>
        ))}
      </group>

      {/* 飄出來的音符 */}
      <Html position={[0, 1.55, 0.5]} center distanceFactor={7} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="kf-notes pointer-events-none select-none text-2xl text-amber-200" aria-hidden="true">
          <span style={{ animationDelay: '0s' }}>♪</span>
          <span style={{ animationDelay: '1.1s' }}>♫</span>
          <span style={{ animationDelay: '2.2s' }}>♪</span>
        </div>
      </Html>
    </group>
  );
}
