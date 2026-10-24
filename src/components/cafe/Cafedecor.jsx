import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ---------- 程式產生的木地板貼圖（不需要外部圖檔） ---------- */
function useWoodTexture() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const palette = ['#c9996b', '#bf8d5f', '#d1a373', '#b98458', '#c69265'];
    const plankH = 32;
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let row = 0; row < 8; row += 1) {
      let x = -rnd() * 128;
      while (x < 256) {
        const w = 90 + rnd() * 110;
        g.fillStyle = palette[Math.floor(rnd() * palette.length)];
        g.fillRect(x, row * plankH, w, plankH);
        g.strokeStyle = 'rgba(90,55,30,0.35)';
        g.lineWidth = 2;
        g.strokeRect(x, row * plankH, w, plankH);
        x += w;
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 3.5);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/* ---------- 小物件 ---------- */
function Plant({ position, scale = 1 }) {
  const leaves = [[0, 0.75, 0, 0.32], [0.18, 0.6, 0.1, 0.22], [-0.17, 0.62, -0.08, 0.24], [0.05, 1.0, -0.05, 0.22], [-0.1, 0.9, 0.14, 0.18]];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.19, 0.4, 16]} />
        <meshStandardMaterial color="#d98e73" roughness={0.9} />
      </mesh>
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 1]} />
          <meshStandardMaterial color={i % 2 ? '#6fa26b' : '#85b87c'} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/** 吊燈：燈罩 + 發光燈泡 + 暖色點光源 */
function PendantLamp({ position, intensity = 14 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 1.8, 6]} />
        <meshStandardMaterial color="#3b2f2a" />
      </mesh>
      <mesh>
        <coneGeometry args={[0.38, 0.3, 24, 1, true]} />
        <meshStandardMaterial color="#f2b880" side={THREE.DoubleSide} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshBasicMaterial color="#fff1d0" toneMapped={false} />
      </mesh>
      <pointLight position={[0, -0.25, 0]} color="#ffcf94" intensity={intensity} distance={8} decay={2} />
    </group>
  );
}

/** 後牆拉花燈 */
function FairyLights() {
  const bulbs = useMemo(
    () => Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      return [-8 + t * 16, 4.1 - Math.sin(t * Math.PI * 3) * 0.0 - Math.abs(Math.sin(t * Math.PI * 4)) * 0.25, -4.85];
    }),
    [],
  );
  return (
    <group>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshBasicMaterial color={i % 3 === 0 ? '#ffd9a0' : '#fff3da'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Window({ x }) {
  return (
    <group position={[x, 2.5, -4.88]}>
      <mesh>
        <planeGeometry args={[2.2, 1.7]} />
        <meshBasicMaterial color="#ffeccb" toneMapped={false} />
      </mesh>
      {[[0, 0.88, 2.4, 0.1], [0, -0.88, 2.4, 0.1], [-1.15, 0, 0.1, 1.86], [1.15, 0, 0.1, 1.86], [0, 0, 0.06, 1.7], [0, 0, 2.2, 0.06]].map(([px, py, w, h], i) => (
        <mesh key={i} position={[px, py, 0.03]}>
          <boxGeometry args={[w, h, 0.08]} />
          <meshStandardMaterial color="#8a5a3b" roughness={0.8} />
        </mesh>
      ))}
      <pointLight position={[0, 0, 1.2]} color="#ffe2b3" intensity={18} distance={10} decay={2} />
    </group>
  );
}

function Counter() {
  return (
    <group position={[-6, 0, -4.1]}>
      <RoundedBox args={[4.6, 1.1, 0.8]} radius={0.05} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#8a5a3b" roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[4.8, 0.08, 0.95]} radius={0.03} position={[0, 1.14, 0.02]} castShadow>
        <meshStandardMaterial color="#e8d3b4" roughness={0.5} />
      </RoundedBox>
      {/* 咖啡機 */}
      <RoundedBox args={[0.7, 0.5, 0.45]} radius={0.05} position={[-1.4, 1.43, 0]} castShadow>
        <meshStandardMaterial color="#c8553d" roughness={0.4} metalness={0.2} />
      </RoundedBox>
      {/* 玻璃罐點心 */}
      {[0.2, 0.9].map((x, i) => (
        <mesh key={i} position={[x, 1.33, 0.05]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.3, 16]} />
          <meshStandardMaterial color={i ? '#f6d6e0' : '#f9e4b7'} transparent opacity={0.85} />
        </mesh>
      ))}
    </group>
  );
}

function Shelf() {
  const bookColors = ['#e07a5f', '#81b29a', '#f2cc8f', '#a0c4ff', '#cdb4db', '#ffafcc', '#9c6644'];
  return (
    <group position={[6, 0, -4.7]}>
      <RoundedBox args={[3.2, 2.8, 0.4]} radius={0.04} position={[0, 1.4, 0]} castShadow>
        <meshStandardMaterial color="#8a5a3b" roughness={0.85} />
      </RoundedBox>
      {[0.55, 1.35, 2.15].map((y, row) => (
        <group key={y} position={[0, y, 0.12]}>
          <mesh position={[0, -0.02, 0]}>
            <boxGeometry args={[3.0, 0.05, 0.3]} />
            <meshStandardMaterial color="#6e4528" />
          </mesh>
          {bookColors.map((c, i) => (
            <mesh key={i} position={[-1.2 + i * 0.36 + row * 0.04, 0.26, 0]} castShadow>
              <boxGeometry args={[0.2, 0.46 - ((i + row) % 3) * 0.06, 0.22]} />
              <meshStandardMaterial color={c} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** 睡在地毯上的貓咪（有呼吸起伏） */
function SleepingCat({ position }) {
  const body = useRef();
  useFrame(({ clock }) => {
    if (body.current) body.current.scale.y = 0.72 + Math.sin(clock.elapsedTime * 1.8) * 0.04;
  });
  const fur = '#f4a259';
  return (
    <group position={position} rotation={[0, -0.6, 0]}>
      <mesh ref={body} position={[0, 0.14, 0]} scale={[1.25, 0.72, 0.85]} castShadow>
        <sphereGeometry args={[0.22, 20, 16]} />
        <meshStandardMaterial color={fur} roughness={0.95} />
      </mesh>
      <mesh position={[0.28, 0.15, 0.04]} castShadow>
        <sphereGeometry args={[0.14, 20, 16]} />
        <meshStandardMaterial color={fur} roughness={0.95} />
      </mesh>
      {[-0.07, 0.07].map((z, i) => (
        <mesh key={i} position={[0.27, 0.29, 0.04 + z]} rotation={[0, 0, -0.2]}>
          <coneGeometry args={[0.045, 0.1, 4]} />
          <meshStandardMaterial color={fur} />
        </mesh>
      ))}
      {[-0.05, 0.05].map((z, i) => (
        <mesh key={i} position={[0.4, 0.17, 0.04 + z]}>
          <boxGeometry args={[0.012, 0.008, 0.035]} />
          <meshBasicMaterial color="#4a2f23" />
        </mesh>
      ))}
      <mesh position={[-0.3, 0.1, 0.12]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.12, 0.035, 8, 16, Math.PI * 1.1]} />
        <meshStandardMaterial color={fur} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ---------- 整間店 ---------- */
export default function CafeDecor() {
  const wood = useWoodTexture();
  return (
    <group>
      {/* 地板：x -9~9、z -5~9 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial map={wood} roughness={0.85} />
      </mesh>

      {/* 後牆 + 木質腰板 + 踢腳板 */}
      <mesh position={[0, 2.6, -5]} receiveShadow>
        <boxGeometry args={[18, 5.2, 0.2]} />
        <meshStandardMaterial color="#f1dcc0" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.6, -4.88]}>
        <boxGeometry args={[18, 1.2, 0.06]} />
        <meshStandardMaterial color="#a8c4a2" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.07, -4.85]}>
        <boxGeometry args={[18, 0.14, 0.1]} />
        <meshStandardMaterial color="#8a5a3b" />
      </mesh>

      <Window x={-1.8} />
      <Window x={1.8} />
      <FairyLights />
      <Counter />
      <Shelf />

      {/* 中央地毯 + 貓 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 1.8]} receiveShadow>
        <circleGeometry args={[1.25, 40]} />
        <meshStandardMaterial color="#d98e73" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 1.8]}>
        <ringGeometry args={[0.9, 1.0, 40]} />
        <meshStandardMaterial color="#f6e3c8" roughness={1} />
      </mesh>
      <SleepingCat position={[0.1, 0.02, 1.8]} />

      <Plant position={[-8.2, 0, -4]} scale={1.5} />
      <Plant position={[8.2, 0, -3.6]} scale={1.3} />
      <Plant position={[-8, 0, 7.2]} scale={1.2} />
      <Plant position={[8, 0, 7.2]} scale={1.4} />

      <PendantLamp position={[-2.4, 3.6, -0.9]} />
      <PendantLamp position={[2.4, 3.6, -0.9]} />
      <PendantLamp position={[0, 3.6, 4.6]} />
    </group>
  );
}
