import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCafeTextures } from './textures';
import Tables from './Tables';

const BLACK_METAL = { color: '#1b1b1d', roughness: 0.45, metalness: 0.7 };
const BRASS = { color: '#a8844f', roughness: 0.35, metalness: 0.85 };
const LEATHER = { color: '#4b2b18', roughness: 0.45 };

const ROOM = { x0: -9, x1: 9, z0: -5, z1: 9, h: 5.2 };

/* ---------- 兩面牆：後牆（紅磚）+ 左牆（木條板） ---------- */
function Walls({ tex }) {
  const depth = ROOM.z1 - ROOM.z0;
  const width = ROOM.x1 - ROOM.x0;
  return (
    <group>
      {/* 後牆 */}
      <mesh position={[0, ROOM.h / 2, ROOM.z0]} receiveShadow>
        <boxGeometry args={[width, ROOM.h, 0.2]} />
        <meshStandardMaterial map={tex.brick} roughness={0.95} />
      </mesh>
      {/* 左牆 */}
      <mesh position={[ROOM.x0, ROOM.h / 2, ROOM.z0 + depth / 2]} receiveShadow>
        <boxGeometry args={[0.2, ROOM.h, depth]} />
        <meshStandardMaterial map={tex.slats} roughness={0.8} />
      </mesh>
      {/* 踢腳板與牆角柱 */}
      <mesh position={[0, 0.09, ROOM.z0 + 0.12]}>
        <boxGeometry args={[width, 0.18, 0.06]} />
        <meshStandardMaterial color="#1c120c" roughness={0.6} />
      </mesh>
      <mesh position={[ROOM.x0 + 0.12, 0.09, ROOM.z0 + depth / 2]}>
        <boxGeometry args={[0.06, 0.18, depth]} />
        <meshStandardMaterial color="#1c120c" roughness={0.6} />
      </mesh>
      <mesh position={[ROOM.x0 + 0.05, ROOM.h / 2, ROOM.z0 + 0.05]}>
        <boxGeometry args={[0.22, ROOM.h, 0.22]} />
        <meshStandardMaterial color="#1c120c" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 黑鐵框格子窗，外面是黃昏夜景 */
function Window({ position, rotationY = 0, w = 2.4, h = 1.8, dusk }) {
  const bars = [];
  for (let i = 1; i < 3; i += 1) bars.push([ -w / 2 + (w / 3) * i, 0, 0.04, h]);
  for (let i = 1; i < 3; i += 1) bars.push([0, -h / 2 + (h / 3) * i, w, 0.04]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={dusk} toneMapped={false} />
      </mesh>
      {[[0, h / 2, w + 0.1, 0.08], [0, -h / 2, w + 0.1, 0.08], [-w / 2, 0, 0.08, h], [w / 2, 0, 0.08, h], ...bars].map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0.03]}>
          <boxGeometry args={[bw, bh, 0.07]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
      ))}
      <mesh position={[0, -h / 2 - 0.05, 0.1]}>
        <boxGeometry args={[w + 0.25, 0.06, 0.2]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.6} />
      </mesh>
    </group>
  );
}

/** 愛迪生吊燈：黑鐵燈罩 + 燈絲燈泡 + 暖色光 */
function PendantLamp({ position, intensity = 18, long = false }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 2.4, 6]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <coneGeometry args={[long ? 0.34 : 0.22, 0.2, 28, 1, true]} />
        <meshStandardMaterial color="#141414" roughness={0.5} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.055, 14, 14]} />
        <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, -0.2, 0]} color="#ffb06a" intensity={intensity} distance={9} decay={2} />
    </group>
  );
}

/** 後牆左側：咖啡師吧台 + 菜單黑板 + 杯架 */
function BaristaCounter({ menu }) {
  return (
    <group position={[-6.4, 0, -4.35]}>
      <RoundedBox args={[4.6, 1.1, 0.8]} radius={0.03} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#2a1a11" roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[4.8, 0.06, 0.95]} radius={0.015} position={[0, 1.13, 0.03]} castShadow>
        <meshStandardMaterial color="#6b6258" roughness={0.25} metalness={0.2} />
      </RoundedBox>
      {/* 義式咖啡機 */}
      <RoundedBox args={[0.9, 0.5, 0.5]} radius={0.04} position={[-1.2, 1.41, -0.05]} castShadow>
        <meshStandardMaterial color="#8d8d90" roughness={0.25} metalness={0.9} />
      </RoundedBox>
      <mesh position={[-1.2, 1.1, 0.25]}>
        <boxGeometry args={[0.85, 0.02, 0.2]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      {/* 磨豆機、玻璃罐 */}
      <mesh position={[-0.3, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 16]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      {[0.5, 1.0].map((x) => (
        <mesh key={x} position={[x, 1.26, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.24, 16]} />
          <meshStandardMaterial color="#c9a36b" transparent opacity={0.7} roughness={0.15} />
        </mesh>
      ))}
      {/* 菜單黑板 */}
      <mesh position={[0, 2.9, -0.43]}>
        <planeGeometry args={[2.6, 1.3]} />
        <meshBasicMaterial map={menu} toneMapped={false} />
      </mesh>
      {/* 杯架 */}
      <mesh position={[0, 2.05, -0.38]}>
        <boxGeometry args={[3.4, 0.05, 0.28]} />
        <meshStandardMaterial color="#2a1a11" roughness={0.6} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-1.4 + i * 0.35, 2.13, -0.38]} castShadow>
          <cylinderGeometry args={[0.045, 0.036, 0.1, 14]} />
          <meshStandardMaterial color={i % 3 ? '#e9e2d6' : '#3a3a3c'} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** 左牆沙發 + 立燈 */
function SofaCorner() {
  return (
    <group position={[-8.15, 0, 1.4]}>
      <RoundedBox args={[0.95, 0.38, 2.3]} radius={0.06} position={[0, 0.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...LEATHER} />
      </RoundedBox>
      <RoundedBox args={[0.3, 0.7, 2.3]} radius={0.08} position={[-0.38, 0.65, 0]} castShadow>
        <meshStandardMaterial {...LEATHER} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.95, 0.3, 0.2]} radius={0.06} position={[0, 0.55, s * 1.1]} castShadow>
          <meshStandardMaterial {...LEATHER} />
        </RoundedBox>
      ))}
      {[-0.5, 0.5].map((z) => (
        <RoundedBox key={z} args={[0.6, 0.12, 0.9]} radius={0.05} position={[0.08, 0.54, z]} castShadow>
          <meshStandardMaterial color="#5a3420" roughness={0.5} />
        </RoundedBox>
      ))}
      {/* 立燈 */}
      <group position={[0.25, 0, 1.75]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.6, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.03, 20]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.16, 0.24, 0.26, 24, 1, true]} />
          <meshStandardMaterial color="#e8c48f" emissive="#b97a3a" emissiveIntensity={0.7} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 1.6, 0]} color="#ffb06a" intensity={9} distance={6} decay={2} />
      </group>
    </group>
  );
}

/** 左牆掛畫 + 壁燈 */
function LeftWallDecor({ art }) {
  return (
    <group position={[ROOM.x0 + 0.12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {[-3.2, -1.7, 5.4, 6.9].map((z, i) => (
        <group key={z} position={[-z, 2.5, 0]}>
          <mesh>
            <boxGeometry args={[1.0, 1.25, 0.05]} />
            <meshStandardMaterial color="#120c08" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.86, 1.1]} />
            <meshStandardMaterial map={art[i % 3]} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[-0.4, 8.0].map((x) => (
        <group key={x} position={[-x, 2.8, 0.06]}>
          <mesh>
            <cylinderGeometry args={[0.07, 0.1, 0.18, 14, 1, true]} />
            <meshStandardMaterial {...BRASS} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.02, 0]}>
            <sphereGeometry args={[0.04, 10, 10]} />
            <meshBasicMaterial color="#ffd9a0" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 深綠大型植栽（葉片用拉長的橢球，不是卡通球） */
function Plant({ position, scale = 1, seed = 1 }) {
  const leaves = useMemo(() => {
    let s = seed * 9301;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 16 }, () => ({
      rot: [(rnd() - 0.5) * 1.1, rnd() * Math.PI * 2, (rnd() - 0.5) * 1.1],
      y: 0.6 + rnd() * 0.9,
      color: rnd() > 0.5 ? '#2f4a33' : '#3b5a3c',
    }));
  }, [seed]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 20]} />
        <meshStandardMaterial color="#24201d" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 1.0, 6]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={[0, l.y, 0]} rotation={l.rot}>
          <mesh position={[0, 0.25, 0.12]} scale={[0.35, 1, 0.12]} castShadow>
            <sphereGeometry args={[0.28, 12, 10]} />
            <meshStandardMaterial color={l.color} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Rug({ position, size }) {
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 0]} receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color="#4a1f1c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]}>
        <planeGeometry args={[size[0] - 0.4, size[1] - 0.4]} />
        <meshStandardMaterial color="#5b2a22" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <planeGeometry args={[size[0] - 0.8, size[1] - 0.8]} />
        <meshStandardMaterial color="#3a2a22" roughness={1} />
      </mesh>
    </group>
  );
}

export default function CafeDecor() {
  const tex = useCafeTextures();
  return (
    <group>
      {/* 地板 x -9~9、z -5~9 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial map={tex.floor} roughness={0.55} metalness={0.05} />
      </mesh>

      <Walls tex={tex} />
      <Window position={[1.8, 2.7, -4.88]} dusk={tex.dusk} />
      <Window position={[5.2, 2.7, -4.88]} dusk={tex.dusk} />
      <Window position={[-8.88, 2.6, 3.0]} rotationY={Math.PI / 2} w={2.6} dusk={tex.dusk} />
      <BaristaCounter menu={tex.menu} />
      <LeftWallDecor art={tex.art} />
      <SofaCorner />
      <Rug position={[-5.6, 0, 5.0]} size={[4.2, 3.2]} />
      <Tables textures={tex} />

      <Plant position={[-8.2, 0, -4.2]} scale={1.5} seed={1} />
      <Plant position={[8.2, 0, -4.2]} scale={1.4} seed={2} />
      <Plant position={[8.1, 0, 7.8]} scale={1.3} seed={3} />

      {/* 吊燈：每個桌區各一盞 */}
      <PendantLamp position={[3.5, 3.0, -3.6]} intensity={20} />
      <PendantLamp position={[1.0, 3.2, 1.0]} intensity={26} long />
      <PendantLamp position={[5.5, 3.2, 4.0]} intensity={16} />
      <PendantLamp position={[0.8, 3.2, 5.2]} intensity={16} />
    </group>
  );
}
