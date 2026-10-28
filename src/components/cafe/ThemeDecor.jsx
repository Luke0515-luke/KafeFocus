import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/** 主題專屬擺飾：雨夜霓虹（neon）與櫻語茶屋（zen）。和街角 / 爵士 / 其他咖啡廳完全不同，不共用鋼琴、書櫃、植栽、吊燈。 */

function useCanvasTexture(draw, w, h) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

const Glow = ({ position, size, color, rotation }) => (
  <mesh position={position} rotation={rotation}>
    <boxGeometry args={size} />
    <meshBasicMaterial color={color} toneMapped={false} />
  </mesh>
);

/** 霓虹文字招牌（透明底 + 發光字） */
function NeonSign({ position, rotationY = 0, text, color, w = 2.6, h = 0.9, font = 'bold 120px "Arial Black", sans-serif' }) {
  const map = useCanvasTexture((g, W, H) => {
    g.clearRect(0, 0, W, H);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 30; g.fillStyle = color;
    g.fillText(text, W / 2, H / 2 + 6); g.fillText(text, W / 2, H / 2 + 6);
    g.shadowBlur = 0; g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.fillText(text, W / 2, H / 2 + 6);
  }, 512, 180);
  return (
    <mesh position={position} rotation={[0, rotationY, 0]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={map} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/** 自動販賣機（發光面板 + 三排飲料色塊） */
function VendingMachine({ position, rotationY = 0, color = '#22d3ee' }) {
  const cans = ['#ff2e93', '#facc15', '#34d399', '#a855f7', '#22d3ee', '#fb923c'];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.95, 0]} castShadow><boxGeometry args={[0.95, 1.9, 0.8]} /><meshStandardMaterial color="#14112a" roughness={0.4} metalness={0.6} /></mesh>
      <mesh position={[-0.12, 1.15, 0.41]}><planeGeometry args={[0.55, 1.1]} /><meshBasicMaterial color="#e8f7ff" toneMapped={false} /></mesh>
      {[0, 1, 2].map((r) => cans.map((c, i) => (
        <mesh key={`${r}${i}`} position={[-0.34 + (i % 3) * 0.2, 1.52 - r * 0.34 - Math.floor(i / 3) * 0.14, 0.42]}>
          <boxGeometry args={[0.1, 0.1, 0.02]} /><meshBasicMaterial color={c} toneMapped={false} />
        </mesh>
      ))).flat().slice(0, 12)}
      <mesh position={[0.33, 1.1, 0.41]}><planeGeometry args={[0.2, 0.6]} /><meshBasicMaterial color="#0a0716" /></mesh>
      <Glow position={[0, 1.93, 0.4]} size={[0.95, 0.05, 0.03]} color={color} />
      <pointLight position={[0, 1.2, 0.9]} color={color} intensity={2.2} distance={3.5} decay={2} />
    </group>
  );
}

/** 街機（螢幕會閃） */
function Arcade({ position, rotationY = 0 }) {
  const ref = useRef();
  useFrame(({ clock }) => { if (ref.current) ref.current.color.setHSL((clock.elapsedTime * 0.15) % 1, 0.9, 0.55); });
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[0.8, 1.6, 0.7]} /><meshStandardMaterial color="#1b1038" roughness={0.5} metalness={0.4} /></mesh>
      <mesh position={[0, 1.2, 0.36]}><planeGeometry args={[0.6, 0.5]} /><meshBasicMaterial ref={ref} color="#ff2e93" toneMapped={false} /></mesh>
      <mesh position={[0, 0.82, 0.5]} rotation={[-0.4, 0, 0]}><boxGeometry args={[0.7, 0.08, 0.3]} /><meshStandardMaterial color="#0e0a20" /></mesh>
      <Glow position={[-0.38, 0.8, 0.2]} size={[0.03, 1.4, 0.03]} color="#22d3ee" />
      <Glow position={[0.38, 0.8, 0.2]} size={[0.03, 1.4, 0.03]} color="#ff2e93" />
    </group>
  );
}

/** 全像投影菜單（半透明、有掃描線、緩慢上下漂浮） */
function HoloBoard({ position, rotationY = 0, w = 1.8, h = 1.1, color = '#22d3ee', lines = ['HOLO MENU', 'Espresso  ¥120', 'Neon Latte  ¥150', 'Cyber Cold Brew  ¥160'] }) {
  const ref = useRef();
  const map = useCanvasTexture((g, W, H) => {
    g.fillStyle = 'rgba(8,24,40,0.55)'; g.fillRect(0, 0, W, H);
    g.strokeStyle = color; g.lineWidth = 4; g.strokeRect(6, 6, W - 12, H - 12);
    g.fillStyle = color; g.font = 'bold 40px monospace'; g.fillText(lines[0], 24, 60);
    g.font = '28px monospace'; lines.slice(1).forEach((l, i) => g.fillText(l, 24, 118 + i * 46));
    g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < H; y += 6) g.fillRect(0, y, W, 2);
  }, 512, 320);
  useFrame(({ clock }) => { if (ref.current) ref.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2 + position[0]) * 0.04; });
  return (
    <group ref={ref} position={position} rotation={[0, rotationY, 0]}>
      <mesh><planeGeometry args={[w, h]} /><meshBasicMaterial map={map} transparent opacity={0.9} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    </group>
  );
}

/** 旋轉的全像咖啡杯 */
function HoloCup({ position }) {
  const ref = useRef();
  useFrame((_, dt) => { if (ref.current) ref.current.rotation.y += dt * 0.9; });
  return (
    <group position={position}>
      <group ref={ref}>
        <mesh><cylinderGeometry args={[0.22, 0.16, 0.34, 14, 1, true]} /><meshBasicMaterial color="#22d3ee" wireframe toneMapped={false} /></mesh>
        <mesh position={[0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.1, 0.018, 6, 14]} /><meshBasicMaterial color="#22d3ee" toneMapped={false} /></mesh>
        {[0.1, 0.2].map((y, i) => <mesh key={y} position={[i * 0.04 - 0.02, 0.3 + y, 0]}><sphereGeometry args={[0.025, 6, 6]} /><meshBasicMaterial color="#ff2e93" toneMapped={false} /></mesh>)}
      </group>
      <pointLight color="#22d3ee" intensity={1.6} distance={3} decay={2} />
    </group>
  );
}

/** 吊掛霓虹燈管（只有 `light` 的會真的打光） */
function HangingTube({ position, color, length = 1.8, light = false, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[-length / 2 + 0.05, 1.2, 0]}><cylinderGeometry args={[0.006, 0.006, 2.4, 5]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh position={[length / 2 - 0.05, 1.2, 0]}><cylinderGeometry args={[0.006, 0.006, 2.4, 5]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.035, 0.035, length, 10]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      {light && <pointLight position={[0, -0.3, 0]} color={color} intensity={14} distance={9} decay={2} />}
    </group>
  );
}

/** 雨水積在地板上的反光水窪 */
function Puddle({ position, r = 0.8, color = '#ff2e93' }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[1.5, 1, 1]}>
      <circleGeometry args={[r, 28]} />
      <meshStandardMaterial color="#0b0820" emissive={color} emissiveIntensity={0.18} roughness={0.04} metalness={0.9} transparent opacity={0.85} />
    </mesh>
  );
}

export function NeonDecor() {
  return (
    <group>
      {/* 後牆：霓虹招牌 + 燈管框 */}
      <NeonSign position={[-3.0, 3.6, -4.86]} text="OPEN 24H" color="#ff2e93" w={2.8} h={1.0} />
      <NeonSign position={[4.2, 3.9, -4.86]} text="コーヒー" color="#22d3ee" w={2.4} h={0.9} font="bold 110px sans-serif" />
      <NeonSign position={[-8.86, 3.4, 4.2]} rotationY={Math.PI / 2} text="NO RAIN NO GAIN" color="#a855f7" w={3.6} h={0.9} font="bold 70px 'Arial Black', sans-serif" />
      <Glow position={[0, 0.95, -4.86]} size={[17.6, 0.05, 0.05]} color="#22d3ee" />
      <Glow position={[0, 4.75, -4.86]} size={[17.6, 0.05, 0.05]} color="#ff2e93" />
      <Glow position={[-8.86, 0.95, 2]} size={[0.05, 0.05, 13.6]} color="#a855f7" />
      <Glow position={[-8.86, 4.75, 2]} size={[0.05, 0.05, 13.6]} color="#22d3ee" />
      <pointLight position={[-3, 3.4, -4.2]} color="#ff2e93" intensity={9} distance={9} decay={2} />
      <pointLight position={[4.2, 3.6, -4.2]} color="#22d3ee" intensity={9} distance={9} decay={2} />

      {/* 全像菜單與旋轉咖啡杯 */}
      <HoloBoard position={[0.9, 2.5, -4.6]} />
      <HoloBoard position={[-6.4, 2.6, -4.6]} color="#ff2e93" lines={['DAILY STUDY', '25/5  FOCUS', '50/10 DEEP', 'LV UP  +XP']} />
      <HoloCup position={[7.4, 2.3, -3.6]} />

      {/* 機台：自動販賣機、街機 */}
      <VendingMachine position={[8.35, 0, -4.2]} rotationY={-0.15} color="#22d3ee" />
      <VendingMachine position={[7.25, 0, -4.35]} rotationY={0.1} color="#ff2e93" />
      <Arcade position={[-8.35, 0, 7.6]} rotationY={Math.PI / 2 + 0.2} />
      <Arcade position={[-8.35, 0, 6.4]} rotationY={Math.PI / 2 - 0.1} />

      {/* 吊掛燈管（取代吊燈） */}
      <HangingTube position={[1.0, 3.2, 1.0]} color="#ff2e93" length={2.4} light />
      <HangingTube position={[5.5, 3.2, 4.0]} color="#22d3ee" length={1.8} light rotationY={0.6} />
      <HangingTube position={[0.8, 3.2, 5.2]} color="#a855f7" length={1.8} light />
      <HangingTube position={[-3.0, 3.2, 2.5]} color="#22d3ee" length={2.2} light rotationY={-0.4} />
      <HangingTube position={[3.5, 3.2, -3.4]} color="#facc15" length={1.6} />
      <HangingTube position={[7.4, 3.2, 1.5]} color="#ff2e93" length={1.4} />

      {/* 地上的積水反光 */}
      <Puddle position={[-1.5, 0.035, 7.4]} color="#ff2e93" />
      <Puddle position={[3.8, 0.035, 6.4]} r={0.6} color="#22d3ee" />
      <Puddle position={[-6.5, 0.035, 1.5]} r={0.7} color="#a855f7" />
    </group>
  );
}

/* ====================== 櫻語茶屋（和風） ====================== */
function Shoji({ position, w = 1.5, h = 2.4, rotationY = 0 }) {
  const bars = [];
  for (let i = 1; i < 3; i += 1) bars.push([-w / 2 + (w * i) / 3, 0, 0.012, h, 0.03]);
  for (let j = 1; j < 5; j += 1) bars.push([0, -h / 2 + (h * j) / 5, w, 0.012, 0.03]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh><planeGeometry args={[w, h]} /><meshStandardMaterial color="#f3e7c8" emissive="#ffd9a0" emissiveIntensity={0.35} roughness={0.9} /></mesh>
      {bars.map(([x, y, bw, bh], i) => <mesh key={i} position={[x, y, 0.02]}><boxGeometry args={[bw, bh, 0.03]} /><meshStandardMaterial color="#3a2616" roughness={0.7} /></mesh>)}
      {[[0, h / 2, w + 0.06, 0.06], [0, -h / 2, w + 0.06, 0.06], [-w / 2, 0, 0.06, h], [w / 2, 0, 0.06, h]].map(([x, y, bw, bh], i) => (
        <mesh key={`f${i}`} position={[x, y, 0.025]}><boxGeometry args={[bw, bh, 0.05]} /><meshStandardMaterial color="#2a1a0e" roughness={0.6} /></mesh>
      ))}
    </group>
  );
}

function Lantern({ position, light = false, color = '#ffb36b' }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.006, 0.006, 2.2, 5]} /><meshStandardMaterial color="#222" /></mesh>
      <mesh scale={[1, 1.25, 1]}><sphereGeometry args={[0.22, 16, 14]} /><meshStandardMaterial color="#fff1d6" emissive={color} emissiveIntensity={0.9} roughness={0.9} /></mesh>
      {[-0.1, 0.05, 0.2].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1, 1]}><torusGeometry args={[Math.sqrt(Math.max(0.0484 - (y / 1.25) ** 2, 0.001)) , 0.006, 5, 20]} /><meshStandardMaterial color="#6b3b1d" /></mesh>)}
      {light && <pointLight position={[0, 0, 0]} color={color} intensity={12} distance={8} decay={2} />}
    </group>
  );
}

function Bonsai({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.4, 0]}><boxGeometry args={[0.5, 0.8, 0.5]} /><meshStandardMaterial color="#3a2616" roughness={0.7} /></mesh>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.2, 0.15, 0.2, 12]} /><meshStandardMaterial color="#5a6a78" roughness={0.6} /></mesh>
      <mesh position={[0.03, 1.2, 0]} rotation={[0, 0, 0.25]}><cylinderGeometry args={[0.025, 0.04, 0.5, 6]} /><meshStandardMaterial color="#4a3020" /></mesh>
      {[[0.1, 1.5, 0, 0.26, '#e9a6b8'], [-0.12, 1.42, 0.08, 0.2, '#f1bccb'], [0.2, 1.38, -0.1, 0.18, '#e08aa2']].map(([x, y, z, r, c], i) => (
        <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 10, 8]} /><meshStandardMaterial color={c} roughness={0.9} /></mesh>
      ))}
    </group>
  );
}

function Noren({ position }) {
  const cols = ['#2b3a55', '#2b3a55', '#2b3a55', '#2b3a55', '#2b3a55'];
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.02, 0.02, 2.4, 8]} /><meshStandardMaterial color="#2a1a0e" /></mesh>
      {cols.map((c, i) => <mesh key={i} position={[-1 + i * 0.5, -0.45, 0]}><planeGeometry args={[0.46, 1.0]} /><meshStandardMaterial color={c} side={THREE.DoubleSide} roughness={0.95} /></mesh>)}
    </group>
  );
}

/** 立著的紅色鳥居（左右各一根柱 + 兩層橫梁） */
function Torii({ position }) {
  const red = { color: '#a32a2a', roughness: 0.6 };
  return (
    <group position={position}>
      {[-1.1, 1.1].map((x) => <mesh key={x} position={[x, 1.4, 0]}><cylinderGeometry args={[0.1, 0.12, 2.8, 12]} /><meshStandardMaterial {...red} /></mesh>)}
      <mesh position={[0, 2.9, 0]}><boxGeometry args={[3.0, 0.16, 0.2]} /><meshStandardMaterial color="#1a1010" roughness={0.6} /></mesh>
      <mesh position={[0, 2.45, 0]}><boxGeometry args={[2.5, 0.1, 0.12]} /><meshStandardMaterial {...red} /></mesh>
    </group>
  );
}

/** 床之間：凹進去的壁龕 + 掛軸（墨色圓相）+ 花器 */
function Tokonoma({ position }) {
  const scroll = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#efe3c4'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#6b2f2f'; g.fillRect(0, 0, W, 18); g.fillRect(0, H - 18, W, 18);
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.arc(W / 2, H * 0.42, W * 0.27, 0.4, Math.PI * 2 - 0.15); g.stroke();
    g.font = 'bold 54px serif'; g.fillStyle = '#1b1b1b'; g.textAlign = 'center'; g.fillText('靜', W / 2, H * 0.84);
  }, 200, 440);
  return (
    <group position={position}>
      <mesh position={[0, 2.0, 0.02]}><boxGeometry args={[1.5, 3.3, 0.06]} /><meshStandardMaterial color="#2a1a0e" roughness={0.6} /></mesh>
      <mesh position={[0, 2.0, 0.06]}><planeGeometry args={[1.3, 3.1]} /><meshStandardMaterial color="#cdb98f" roughness={0.95} /></mesh>
      <mesh position={[0, 2.35, 0.09]}><planeGeometry args={[0.62, 1.36]} /><meshStandardMaterial map={scroll} roughness={0.9} /></mesh>
      <mesh position={[0, 0.5, 0.2]}><boxGeometry args={[1.5, 0.12, 0.45]} /><meshStandardMaterial color="#3a2616" roughness={0.5} /></mesh>
      <mesh position={[0, 0.8, 0.2]}><cylinderGeometry args={[0.07, 0.1, 0.4, 12]} /><meshStandardMaterial color="#7a8a8a" roughness={0.4} /></mesh>
      {[[-0.1, 1.15, 0.5], [0.05, 1.3, -0.3], [0.12, 1.05, 0.6]].map(([x, y, r], i) => (
        <mesh key={i} position={[x, y, 0.2]} rotation={[0, 0, r]}><cylinderGeometry args={[0.006, 0.008, 0.5, 5]} /><meshStandardMaterial color="#5a4630" /></mesh>
      ))}
      {[[-0.18, 1.38], [0.1, 1.5], [0.2, 1.22]].map(([x, y], i) => <mesh key={i} position={[x, y, 0.2]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color="#f0a8bb" roughness={0.9} /></mesh>)}
    </group>
  );
}

/** 屏風：四折，金底墨竹 */
function Byobu({ position, rotationY = 0 }) {
  const map = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#d9b873'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#3b4a2a'; g.lineWidth = 6;
    for (let i = 0; i < 4; i += 1) { const x = 40 + i * 70; g.beginPath(); g.moveTo(x, H); g.lineTo(x + 6, 20); g.stroke(); for (let y = 60; y < H; y += 70) { g.beginPath(); g.moveTo(x - 10 + 3, y); g.lineTo(x + 14, y); g.stroke(); } }
  }, 300, 360);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[(i - 1.5) * 0.52, 0, (i % 2) * 0.16]} rotation={[0, (i % 2 ? -1 : 1) * 0.32, 0]}>
          <mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[0.54, 1.6, 0.04]} /><meshStandardMaterial color="#2a1a0e" roughness={0.6} /></mesh>
          <mesh position={[0, 0.8, 0.025]}><planeGeometry args={[0.46, 1.5]} /><meshStandardMaterial map={map} roughness={0.8} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** 行燈（和紙落地燈） */
function Andon({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]}><boxGeometry args={[0.32, 0.12, 0.32]} /><meshStandardMaterial color="#2a1a0e" roughness={0.6} /></mesh>
      <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.28, 0.66, 0.28]} /><meshStandardMaterial color="#fff0d0" emissive="#ffb36b" emissiveIntensity={0.85} roughness={0.9} /></mesh>
      {[-1, 1].flatMap((a) => [-1, 1].map((b) => <mesh key={`${a}${b}`} position={[a * 0.14, 0.5, b * 0.14]}><boxGeometry args={[0.025, 0.68, 0.025]} /><meshStandardMaterial color="#2a1a0e" /></mesh>))}
      <mesh position={[0, 0.86, 0]}><boxGeometry args={[0.34, 0.04, 0.34]} /><meshStandardMaterial color="#2a1a0e" /></mesh>
      <pointLight position={[0, 0.5, 0]} color="#ffb36b" intensity={5} distance={5} decay={2} />
    </group>
  );
}

/** 玄關鞋櫃：脫鞋處 + 木屐 */
function ShoeRack({ position, rotationY = 0 }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow><boxGeometry args={[1.2, 0.4, 0.4]} /><meshStandardMaterial color="#4a321c" roughness={0.6} /></mesh>
      {[-0.4, 0, 0.4].map((x) => <mesh key={x} position={[x, 0.42, 0.02]}><boxGeometry args={[0.22, 0.03, 0.1]} /><meshStandardMaterial color="#7a5a3a" /></mesh>)}
      {[-0.4, 0, 0.4].map((x) => <group key={`g${x}`} position={[x, 0.46, 0.02]}>{[-0.06, 0.06].map((dx) => <mesh key={dx} position={[dx, 0, 0]}><boxGeometry args={[0.03, 0.04, 0.08]} /><meshStandardMaterial color="#2a1a0e" /></mesh>)}</group>)}
    </group>
  );
}

/** 枯山水：白砂 + 耙紋 + 石頭 */
function RockGarden({ position }) {
  const sand = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#e9e4d6'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(120,110,90,0.5)'; g.lineWidth = 2;
    for (let y = 8; y < H; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    [[90, 70, 38], [190, 120, 26]].forEach(([x, y, r]) => { for (let k = 1; k < 4; k += 1) { g.beginPath(); g.arc(x, y, r + k * 9, 0, Math.PI * 2); g.stroke(); } });
  }, 260, 160);
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}><boxGeometry args={[2.6, 0.1, 1.6]} /><meshStandardMaterial color="#3a2616" roughness={0.7} /></mesh>
      <mesh position={[0, 0.101, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.46, 1.46]} /><meshStandardMaterial map={sand} roughness={1} /></mesh>
      {[[-0.75, 0.12, 0.1, 0.22], [0.55, 0.1, -0.15, 0.15]].map(([x, y, z, r], i) => <mesh key={i} position={[x, y + 0.04, z]} scale={[1.2, 0.8, 1]} castShadow><dodecahedronGeometry args={[r, 0]} /><meshStandardMaterial color="#5a5a58" roughness={0.9} /></mesh>)}
    </group>
  );
}

export function ZenDecor() {
  return (
    <group>
      <Shoji position={[-6.2, 2.7, -4.86]} />
      <Shoji position={[-4.5, 2.7, -4.86]} />
      <Shoji position={[2.9, 2.7, -4.86]} />
      <Shoji position={[4.6, 2.7, -4.86]} />
      <Shoji position={[-8.86, 2.7, 6.5]} rotationY={Math.PI / 2} />
      <Tokonoma position={[-1.2, 0, -4.78]} />
      <Noren position={[6.9, 2.6, -3.9]} />
      <Torii position={[6.8, 0, 8.2]} />
      <Byobu position={[-7.6, 0, 8.3]} rotationY={0.2} />
      <ShoeRack position={[3.4, 0, 8.5]} />
      <Andon position={[-7.9, 0, 3.2]} />
      <Andon position={[8.2, 0, 4.2]} />
      <RockGarden position={[2.0, 0, 7.4]} />
      <Bonsai position={[-8.3, 0, 1.6]} scale={1.1} />
      <Bonsai position={[8.4, 0, -2.4]} />
      <Lantern position={[1.0, 3.2, 1.0]} light />
      <Lantern position={[5.5, 3.3, 4.0]} light />
      <Lantern position={[0.8, 3.3, 5.2]} light />
      <Lantern position={[-3.0, 3.3, 2.5]} light />
      <Lantern position={[3.5, 3.3, -3.4]} />
      <Lantern position={[7.4, 3.3, 1.5]} />
      <Lantern position={[-7.0, 3.3, -2.0]} />
    </group>
  );
}

/* ====================== 北歐風（暖白、淺橡木、燕麥 / 灰色、黑色金屬點綴、綠植） ====================== */
const OAK = { color: '#cdb68f', roughness: 0.6 };
const BLACK = { color: '#1d1d1f', roughness: 0.45, metalness: 0.5 };

/** 穹頂吊燈（PH 風格）：霧面白或黑色燈罩 + 黑色吊線 + 暖光燈泡 */
function DomePendant({ position, light = false, black = false, r = 0.26 }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}><cylinderGeometry args={[0.004, 0.004, 2.4, 5]} /><meshStandardMaterial {...BLACK} /></mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <sphereGeometry args={[r, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={black ? '#222224' : '#f6f4ee'} roughness={0.55} metalness={black ? 0.4 : 0} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.05, 0]}><sphereGeometry args={[0.05, 12, 10]} /><meshBasicMaterial color="#ffe2b0" toneMapped={false} /></mesh>
      {light && <pointLight position={[0, -0.2, 0]} color="#ffe2b0" intensity={12} distance={9} decay={2} />}
    </group>
  );
}

/** 梯形層架：橡木、放白 / 灰 / 赤陶色陶器與書 */
function LadderShelf({ position }) {
  const pots = ['#f2f0ea', '#b9b4aa', '#b5764f', '#e3ded2'];
  const books = ['#2b2b2d', '#8a8f6a', '#d8d2c4', '#9c9a94'];
  return (
    <group position={position}>
      {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 1.5, 0]} rotation={[0, 0, x * 0.06]} castShadow><boxGeometry args={[0.05, 3.1, 0.05]} /><meshStandardMaterial {...OAK} /></mesh>)}
      {[0.4, 1.1, 1.8, 2.5].map((y, i) => (
        <group key={y}>
          <mesh position={[0, y, 0.1]} castShadow><boxGeometry args={[1.2 - i * 0.05, 0.04, 0.36]} /><meshStandardMaterial {...OAK} /></mesh>
          <mesh position={[-0.32, y + 0.12, 0.1]}><cylinderGeometry args={[0.06, 0.08, 0.2, 14]} /><meshStandardMaterial color={pots[i]} roughness={0.6} /></mesh>
          {[0, 1, 2].map((k) => <mesh key={k} position={[0.05 + k * 0.07, y + 0.1, 0.1]}><boxGeometry args={[0.055, 0.17 - k * 0.015, 0.2]} /><meshStandardMaterial color={books[(i + k) % 4]} roughness={0.85} /></mesh>)}
          <mesh position={[0.4, y + 0.07, 0.1]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color={pots[(i + 2) % 4]} roughness={0.55} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** 黑框極簡畫（白底、黑線、一抹赤陶色） */
function Poster({ position, variant = 0 }) {
  const map = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#f8f6f1'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#b5764f'; g.strokeStyle = '#1d1d1f'; g.lineWidth = 5; g.lineCap = 'round';
    if (variant === 0) { g.beginPath(); g.arc(W / 2, H * 0.42, W * 0.22, 0, Math.PI * 2); g.fill(); g.beginPath(); g.moveTo(W * 0.15, H * 0.78); g.quadraticCurveTo(W * 0.5, H * 0.62, W * 0.85, H * 0.78); g.stroke(); }
    else if (variant === 1) { g.beginPath(); g.moveTo(W * 0.2, H * 0.8); g.lineTo(W * 0.5, H * 0.25); g.lineTo(W * 0.8, H * 0.8); g.closePath(); g.stroke(); g.beginPath(); g.arc(W * 0.66, H * 0.3, W * 0.08, 0, Math.PI * 2); g.fill(); }
    else { for (let i = 0; i < 5; i += 1) { g.beginPath(); g.moveTo(W * (0.22 + i * 0.14), H * 0.8); g.quadraticCurveTo(W * (0.15 + i * 0.14), H * 0.5, W * (0.28 + i * 0.12), H * 0.2); g.stroke(); } g.beginPath(); g.arc(W * 0.5, H * 0.86, W * 0.05, 0, Math.PI * 2); g.fill(); }
  }, 240, 300);
  return (
    <group position={position}>
      <mesh><boxGeometry args={[0.8, 1.0, 0.035]} /><meshStandardMaterial {...BLACK} /></mesh>
      <mesh position={[0, 0, 0.02]}><planeGeometry args={[0.7, 0.9]} /><meshStandardMaterial color="#f8f6f1" roughness={0.9} /></mesh>
      <mesh position={[0, 0, 0.025]}><planeGeometry args={[0.56, 0.72]} /><meshStandardMaterial map={map} roughness={0.9} /></mesh>
    </group>
  );
}

/** 黑色鑄鐵小壁爐：玻璃門、石板底、樺木柴堆 */
function WoodStove({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.04, 0.05]}><boxGeometry args={[0.95, 0.08, 0.85]} /><meshStandardMaterial color="#a6a39b" roughness={0.9} /></mesh>
      <mesh position={[0, 0.52, 0]} castShadow><boxGeometry args={[0.62, 0.8, 0.5]} /><meshStandardMaterial {...BLACK} /></mesh>
      <mesh position={[0, 0.46, 0.256]}><planeGeometry args={[0.38, 0.36]} /><meshBasicMaterial color="#e8792e" toneMapped={false} /></mesh>
      <mesh position={[0, 0.46, 0.262]}><planeGeometry args={[0.44, 0.42]} /><meshStandardMaterial color="#111" transparent opacity={0.18} /></mesh>
      <mesh position={[0, 0.94, 0]}><boxGeometry args={[0.68, 0.04, 0.56]} /><meshStandardMaterial {...BLACK} /></mesh>
      <mesh position={[0, 2.6, -0.1]} castShadow><cylinderGeometry args={[0.06, 0.06, 3.3, 14]} /><meshStandardMaterial {...BLACK} /></mesh>
      <pointLight position={[0, 0.5, 0.6]} color="#ff9a4c" intensity={3.5} distance={5} decay={2} />
      {[0, 1, 2].map((i) => [0, 1, 2].slice(0, 3 - i).map((j) => (
        <group key={`${i}${j}`} position={[0.72 + j * 0.16 + i * 0.08, 0.08 + i * 0.15, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh><cylinderGeometry args={[0.07, 0.07, 0.45, 10]} /><meshStandardMaterial color="#d8cdb4" roughness={0.9} /></mesh>
          <mesh position={[0, 0.226, 0]}><circleGeometry args={[0.068, 10]} /><meshStandardMaterial color="#b89a6d" /></mesh>
        </group>
      )))}
    </group>
  );
}

/** 室內植物：龜背芋 / 琴葉榕風格，灰色陶盆或赤陶盆，葉色偏深綠 */
function NordicPlant({ position, scale = 1, terracotta = false }) {
  const leaves = [[0, 1.3, 0, 0.3], [0.22, 1.05, 0.1, 0.24], [-0.2, 1.1, -0.1, 0.26], [0.05, 0.88, -0.22, 0.2], [-0.12, 1.45, 0.14, 0.2], [0.18, 1.38, -0.12, 0.18]];
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.2, 0]} castShadow><cylinderGeometry args={[0.2, 0.15, 0.4, 20]} /><meshStandardMaterial color={terracotta ? '#b5764f' : '#bdb8ae'} roughness={0.7} /></mesh>
      <mesh position={[0, 0.41, 0]}><cylinderGeometry args={[0.19, 0.19, 0.02, 20]} /><meshStandardMaterial color="#3a2f26" roughness={1} /></mesh>
      <mesh position={[0, 0.8, 0]}><cylinderGeometry args={[0.018, 0.028, 0.9, 6]} /><meshStandardMaterial color="#6e5a44" /></mesh>
      {leaves.map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0.3 * (i % 3 - 1), i, 0.4 * (i % 2 ? 1 : -1)]} scale={[1, 0.28, 1.15]} castShadow>
          <sphereGeometry args={[r, 14, 10]} /><meshStandardMaterial color={['#3f6b46', '#4d7d52', '#385f3e'][i % 3]} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** 編織籃 + 折好的羊毛毯（燕麥 / 灰 / 駝色） */
function BlanketBasket({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.32, 0.26, 0.5, 22, 1, true]} /><meshStandardMaterial color="#b89a6d" roughness={0.95} side={THREE.DoubleSide} /></mesh>
      {[0.1, 0.22, 0.34, 0.46].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.29 + (y - 0.1) * 0.05, 0.008, 5, 28]} /><meshStandardMaterial color="#9c8157" roughness={1} /></mesh>)}
      <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.26, 0.26, 0.04, 22]} /><meshStandardMaterial color="#9c8157" /></mesh>
      {[['#d8d2c4', 0.42], ['#9c9a94', 0.52], ['#c7b79c', 0.62]].map(([c, y], i) => <mesh key={c} position={[(i - 1) * 0.03, y, 0]} rotation={[0, i * 0.7, 0]}><boxGeometry args={[0.46, 0.1, 0.36]} /><meshStandardMaterial color={c} roughness={1} /></mesh>)}
    </group>
  );
}

/** 落地花瓶 + 乾燥蒲葦（北歐風常見） */
function PampasVase({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.3, 0]} castShadow><cylinderGeometry args={[0.1, 0.16, 0.6, 18]} /><meshStandardMaterial color="#e8e3d6" roughness={0.6} /></mesh>
      {[[-0.1, 0.8, 0.2], [0.08, 0.95, -0.15], [0.0, 1.1, 0.05], [0.15, 0.85, 0.25], [-0.16, 1.0, -0.2]].map(([x, h, r], i) => (
        <group key={i} position={[x * 0.5, 0.6, 0]} rotation={[0, 0, r]}>
          <mesh position={[0, h * 0.5, 0]}><cylinderGeometry args={[0.004, 0.006, h, 5]} /><meshStandardMaterial color="#b9a47c" /></mesh>
          <mesh position={[0, h, 0]} scale={[0.5, 1.6, 0.5]}><sphereGeometry args={[0.09, 8, 8]} /><meshStandardMaterial color="#e3d5b8" roughness={1} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** 簡約黑框掛鐘 */
function ClockBlack({ position }) {
  return (
    <group position={position}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.28, 0.28, 0.04, 36]} /><meshStandardMaterial {...BLACK} /></mesh>
      <mesh position={[0, 0, 0.022]}><circleGeometry args={[0.25, 36]} /><meshStandardMaterial color="#f8f6f1" roughness={0.9} /></mesh>
      <mesh position={[0, 0.07, 0.03]}><boxGeometry args={[0.012, 0.15, 0.005]} /><meshStandardMaterial color="#1d1d1f" /></mesh>
      <mesh position={[0.05, 0, 0.03]}><boxGeometry args={[0.1, 0.012, 0.005]} /><meshStandardMaterial color="#1d1d1f" /></mesh>
    </group>
  );
}

export function NordicDecor() {
  return (
    <group>
      <Poster position={[-4.7, 3.0, -4.86]} variant={0} />
      <Poster position={[-5.7, 3.0, -4.86]} variant={1} />
      <ClockBlack position={[3.5, 3.4, -4.84]} />
      <Poster position={[7.6, 3.0, -4.86]} variant={2} />
      <Poster position={[-8.86, 3.0, 2.6]} variant={1} />
      <LadderShelf position={[-7.4, 0, -4.7]} />
      <WoodStove position={[8.1, 0, -4.1]} />
      <BlanketBasket position={[-8.2, 0, 0.2]} />
      <PampasVase position={[-8.2, 0, 3.4]} />
      <NordicPlant position={[-8.3, 0, -4.2]} scale={1.2} />
      <NordicPlant position={[8.3, 0, 6.0]} terracotta />
      <NordicPlant position={[-1.2, 0, 8.3]} scale={0.9} />
      <NordicPlant position={[4.0, 0, 8.4]} scale={1.1} terracotta />
      <mesh position={[6.3, 0.015, -2.6]} scale={[1, 0.03, 0.7]} rotation={[0, 0.3, 0]}><sphereGeometry args={[0.8, 18, 12]} /><meshStandardMaterial color="#efeadd" roughness={1} /></mesh>
      <DomePendant position={[1.0, 3.2, 1.0]} light r={0.34} />
      <DomePendant position={[5.5, 3.2, 4.0]} light />
      <DomePendant position={[0.8, 3.2, 5.2]} light black />
      <DomePendant position={[-3.0, 3.2, 2.5]} light />
      <DomePendant position={[3.5, 3.2, -3.3]} black />
      <DomePendant position={[7.4, 3.2, 1.5]} black />
      <DomePendant position={[-7.0, 3.2, -2.0]} />
      <DomePendant position={[-5.4, 3.2, 5.0]} />
    </group>
  );
}

/* ====================== 深海水族咖啡館（ocean） ======================
 * 整間店像沉在海底的玻璃穹頂：頭上魚群環游、發光水母漂浮、氣泡往上冒、地板晃動著水波光影，
 * 後牆有霓虹招牌、舵輪與舷窗，角落長著珊瑚與海帶，右後角有一只發光的寶箱。
 * 全部動畫都是 useFrame 驅動的實例化網格（魚群、氣泡各一次 draw call），不吃效能。
 */
const rand = (seed) => { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
const BRASS_O = { color: '#c79a52', roughness: 0.35, metalness: 0.85 };
const OCEAN_GLOW = ['#5ff0e0', '#ff8fd0', '#7fc4ff', '#ffc46b', '#b99aff'];

/** 給實例化網格上色（每隻魚、每顆氣泡顏色不同） */
function useInstanceColors(ref, colors) {
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const c = new THREE.Color();
    colors.forEach((hex, i) => m.setColorAt(i, c.set(hex)));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [ref, colors]);
}

/** 水波光影：不規則的亮線網格，貼在地板上，兩層往不同方向緩慢漂移 */
function drawCaustics(g, W, H, seed) {
  const r = rand(seed);
  const n = 7; const cell = W / n;
  const pts = [];
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) pts.push([(i + 0.2 + r() * 0.6) * cell, (j + 0.2 + r() * 0.6) * cell]);
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  g.lineCap = 'round';
  const draw = (lw, style, blur) => {
    g.lineWidth = lw; g.strokeStyle = style; g.shadowColor = '#9ffcff'; g.shadowBlur = blur;
    [0, -W].forEach((dx) => [0, -H].forEach((dy) => {
      for (let i = 0; i < n; i += 1) {
        for (let j = 0; j < n; j += 1) {
          const p = pts[i * n + j];
          const right = pts[((i + 1) % n) * n + j]; const down = pts[i * n + ((j + 1) % n)];
          g.beginPath(); g.moveTo(p[0] + dx, p[1] + dy); g.lineTo(right[0] + (i + 1 === n ? W : 0) + dx, right[1] + dy); g.stroke();
          g.beginPath(); g.moveTo(p[0] + dx, p[1] + dy); g.lineTo(down[0] + dx, down[1] + (j + 1 === n ? H : 0) + dy); g.stroke();
        }
      }
    }));
  };
  draw(5, 'rgba(120,230,240,0.35)', 10);
  draw(1.6, 'rgba(220,255,255,0.9)', 4);
  g.shadowBlur = 0;
}

function Caustics() {
  const a = useCanvasTexture((g, W, H) => drawCaustics(g, W, H, 11), 256, 256);
  const b = useCanvasTexture((g, W, H) => drawCaustics(g, W, H, 29), 256, 256);
  useMemo(() => { [a, b].forEach((t) => { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2.4); }); }, [a, b]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    a.offset.set(t * 0.012, t * 0.008);
    b.offset.set(-t * 0.01, t * 0.014);
  });
  return (
    <group>
      {[[a, 0.018, 0.5], [b, 0.02, 0.4]].map(([map, y, op], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 2]}>
          <planeGeometry args={[18, 14]} />
          <meshBasicMaterial map={map} transparent opacity={op} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 從水面照下來的三道光束（頂端亮、往下漸淡） */
function LightShafts() {
  const shaft = useCanvasTexture((g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#5a5a5a'); gr.addColorStop(1, '#000000');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, 8, 128);
  return (
    <group>
      {[[-3.5, -1.5, 0.12, 0.05], [3.5, 1.5, -0.1, 0.08], [0.5, 6, 0.06, -0.1]].map(([x, z, rz, rx], i) => (
        <mesh key={i} position={[x, 2.9, z]} rotation={[rx, 0, rz]}>
          <coneGeometry args={[2.2, 6, 24, 1, true]} />
          <meshBasicMaterial color="#aef6ff" alphaMap={shaft} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 三群魚在頭頂環游（橢圓軌道 + 上下起伏），魚尾會擺動；身體與尾巴各用一個 InstancedMesh */
const SCHOOLS = [
  { n: 16, colors: ['#ffa94d', '#ffd166'], cx: 0, cy: 3.9, cz: 1.5, rx: 8, rz: 5.5, ry: 0.5, sp: 0.16, size: [0.34, 0.46] },
  { n: 12, colors: ['#4dd2ff', '#8ae9ff'], cx: 1, cy: 2.8, cz: 2.5, rx: 6.5, rz: 4.2, ry: 0.35, sp: -0.22, size: [0.26, 0.36] },
  { n: 8, colors: ['#ff7fbf', '#ffb3d9'], cx: -1, cy: 4.6, cz: 1, rx: 7, rz: 5.8, ry: 0.4, sp: 0.12, size: [0.45, 0.6] },
];

function FishSchools() {
  const body = useRef(); const tail = useRef();
  const o = useMemo(() => new THREE.Object3D(), []);
  const fish = useMemo(() => {
    const r = rand(37); const out = [];
    SCHOOLS.forEach((S, si) => {
      const base = r() * Math.PI * 2;
      for (let k = 0; k < S.n; k += 1) {
        out.push({
          s: si, a0: base + (r() - 0.5) * 1.1, ox: (r() - 0.5) * 1.6, oz: (r() - 0.5) * 1.6, oy: (r() - 0.5) * 0.9,
          ph: r() * 6.283, size: S.size[0] + r() * (S.size[1] - S.size[0]), color: S.colors[k % S.colors.length],
        });
      }
    });
    return out;
  }, []);
  const colors = useMemo(() => fish.map((f) => f.color), [fish]);
  useInstanceColors(body, colors);
  useInstanceColors(tail, colors);
  useFrame(({ clock }) => {
    if (!body.current || !tail.current) return;
    const t = clock.elapsedTime;
    fish.forEach((d, i) => {
      const S = SCHOOLS[d.s];
      const a = d.a0 + t * S.sp;
      const px = S.cx + Math.cos(a) * (S.rx + d.ox);
      const pz = S.cz + Math.sin(a) * (S.rz + d.oz);
      const py = S.cy + d.oy + Math.sin(a * 2.3 + d.ph) * S.ry;
      const dir = Math.sign(S.sp);
      const yaw = Math.atan2(-Math.cos(a) * S.rz * dir, -Math.sin(a) * S.rx * dir); // 魚頭朝向前進方向（模型的 +x 是魚頭）
      o.position.set(px, py, pz); o.rotation.set(0, yaw, 0); o.scale.set(d.size, d.size * 0.5, d.size * 0.32);
      o.updateMatrix(); body.current.setMatrixAt(i, o.matrix);
      const back = d.size * 0.74;
      o.position.set(px - Math.cos(yaw) * back, py, pz + Math.sin(yaw) * back);
      o.rotation.set(0, yaw + Math.sin(t * 9 + d.ph) * 0.5, -Math.PI / 2); o.scale.set(d.size * 0.62, d.size * 0.55, d.size * 0.1);
      o.updateMatrix(); tail.current.setMatrixAt(i, o.matrix);
    });
    body.current.instanceMatrix.needsUpdate = true;
    tail.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, fish.length]} frustumCulled={false}>
        <sphereGeometry args={[0.5, 12, 8]} />
        <meshStandardMaterial roughness={0.45} emissive="#0a1a2a" />
      </instancedMesh>
      <instancedMesh ref={tail} args={[undefined, undefined, fish.length]} frustumCulled={false}>
        <coneGeometry args={[0.5, 1, 10]} />
        <meshStandardMaterial roughness={0.5} emissive="#0a1a2a" side={THREE.DoubleSide} />
      </instancedMesh>
    </group>
  );
}

/** 發光水母：傘會一收一放，觸手隨水流擺動，上下緩緩漂浮 */
function Jellyfish({ position, color = '#ff8fd0', scale = 1, light = false, seed = 1 }) {
  const root = useRef(); const bell = useRef(); const tents = useRef([]);
  const arms = useMemo(() => Array.from({ length: 8 }, (_, i) => ({ a: (i / 8) * Math.PI * 2, len: 0.7 + (i % 3) * 0.25 })), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + seed * 3;
    if (root.current) root.current.position.y = position[1] + Math.sin(t * 0.6) * 0.3;
    const pulse = Math.sin(t * 2.2);
    if (bell.current) bell.current.scale.set(1 - pulse * 0.07, 1 + pulse * 0.14, 1 - pulse * 0.07);
    tents.current.forEach((g, i) => { if (g) { g.rotation.x = Math.sin(t * 1.6 + i) * 0.18; g.rotation.z = Math.cos(t * 1.3 + i * 1.7) * 0.18; } });
  });
  return (
    <group ref={root} position={position} scale={scale}>
      <mesh ref={bell} scale={[1, 1, 1]}>
        <sphereGeometry args={[0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.95} transparent opacity={0.72} side={THREE.DoubleSide} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.12, 0]}><sphereGeometry args={[0.16, 12, 8]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.55} toneMapped={false} /></mesh>
      {arms.map((m, i) => (
        <group key={i} ref={(g) => { tents.current[i] = g; }} position={[Math.cos(m.a) * 0.34, 0, Math.sin(m.a) * 0.34]}>
          <mesh position={[0, -m.len / 2, 0]}>
            <cylinderGeometry args={[0.014, 0.006, m.len, 5]} />
            <meshBasicMaterial color={color} transparent opacity={0.65} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {light && <pointLight position={[0, -0.2, 0]} color={color} intensity={6} distance={7} decay={2} />}
    </group>
  );
}

/** 一串串往上冒的氣泡 */
function Bubbles({ count = 70 }) {
  const ref = useRef();
  const o = useMemo(() => new THREE.Object3D(), []);
  const data = useMemo(() => {
    const r = rand(53);
    return Array.from({ length: count }, () => ({ x: -8 + r() * 16, z: -4 + r() * 11, sp: 0.06 + r() * 0.1, ph: r(), size: 0.04 + r() * 0.08, sw: 0.1 + r() * 0.25, f: 0.6 + r() * 1.4 }));
  }, [count]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const u = (t * d.sp + d.ph) % 1;
      o.position.set(d.x + Math.sin(t * d.f + d.ph * 9) * d.sw, 0.1 + u * 5.2, d.z + Math.cos(t * d.f * 0.8 + d.ph * 9) * d.sw);
      o.scale.setScalar(d.size * (0.6 + u * 0.7)); o.rotation.set(0, 0, 0); o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} />
      <meshBasicMaterial color="#cdf6ff" transparent opacity={0.4} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/** 生物發光吊燈：玻璃球 + 發光核心，一條細線一路吊到畫面外 */
function OrbLamp({ position, color, light = 0, chain = 2.2 }) {
  return (
    <group position={position}>
      <mesh position={[0, chain / 2 + 0.2, 0]}><cylinderGeometry args={[0.008, 0.008, chain, 5]} /><meshStandardMaterial color="#10232e" /></mesh>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.05, 0.08, 0.08, 10]} /><meshStandardMaterial {...BRASS_O} /></mesh>
      <mesh><sphereGeometry args={[0.2, 20, 16]} /><meshStandardMaterial color="#d6fbff" transparent opacity={0.28} roughness={0.08} /></mesh>
      <mesh><sphereGeometry args={[0.1, 14, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh scale={[1.9, 1.9, 1.9]}><sphereGeometry args={[0.1, 12, 10]} /><meshBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      {light > 0 && <pointLight position={[0, -0.1, 0]} color={color} intensity={light} distance={9} decay={2} />}
    </group>
  );
}

/** 隨水流搖擺的海帶（一節一節的巢狀群組，每一節各擺一點，就會連成一條 S 形） */
function Kelp({ position, h = 3, seed = 1, color = '#2f9b6a' }) {
  const segs = 7; const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => { if (g) { g.rotation.z = Math.sin(t * 0.9 + seed + i * 0.55) * 0.1; g.rotation.x = Math.cos(t * 0.7 + seed * 2 + i * 0.5) * 0.07; } });
  });
  const build = (i) => (
    <group key={i} ref={(g) => { refs.current[i] = g; }} position={[0, i === 0 ? 0 : h / segs, 0]}>
      <mesh position={[0, h / segs / 2, 0]} scale={[1 - i * 0.09, 1, 1]}>
        <boxGeometry args={[0.3, h / segs, 0.03]} />
        <meshStandardMaterial color={color} emissive="#0f5a3a" emissiveIntensity={0.4} roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      {i < segs - 1 && build(i + 1)}
    </group>
  );
  return <group position={position}>{build(0)}</group>;
}

/** 珊瑚叢：石頭底座長出一圈發光的珊瑚枝 */
function Coral({ position, scale = 1, seed = 1, color = '#ff6f91', glow = '#ff3d71' }) {
  const arms = useMemo(() => {
    const r = rand(seed * 7 + 3);
    return Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * Math.PI * 2 + r() * 0.5, tilt: 0.25 + r() * 0.6, len: 0.5 + r() * 0.6 }));
  }, [seed]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.6, 1]}><dodecahedronGeometry args={[0.3, 0]} /><meshStandardMaterial color="#3b4a52" roughness={0.95} /></mesh>
      {arms.map((m, i) => (
        <group key={i} rotation={[0, m.a, m.tilt]} position={[0, 0.2, 0]}>
          <mesh position={[0, m.len / 2, 0]}><cylinderGeometry args={[0.025, 0.06, m.len, 6]} /><meshStandardMaterial color={color} emissive={glow} emissiveIntensity={0.35} roughness={0.7} /></mesh>
          <mesh position={[0, m.len, 0]}><sphereGeometry args={[0.06, 8, 6]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
        </group>
      ))}
    </group>
  );
}

/** 掀開蓋子的寶箱：金幣堆發著光 */
function TreasureChest({ position }) {
  const wood = { color: '#5a3a22', roughness: 0.8 };
  return (
    <group position={position} rotation={[0, -0.25, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow><boxGeometry args={[0.9, 0.44, 0.6]} /><meshStandardMaterial {...wood} /></mesh>
      {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.22, 0]}><boxGeometry args={[0.07, 0.46, 0.62]} /><meshStandardMaterial {...BRASS_O} /></mesh>)}
      <group position={[0, 0.44, -0.3]} rotation={[-1.25, 0, 0]}>
        <mesh position={[0, 0, 0.3]} castShadow><boxGeometry args={[0.9, 0.08, 0.6]} /><meshStandardMaterial {...wood} /></mesh>
        {[-0.3, 0.3].map((x) => <mesh key={x} position={[x, 0.01, 0.3]}><boxGeometry args={[0.07, 0.1, 0.62]} /><meshStandardMaterial {...BRASS_O} /></mesh>)}
      </group>
      <mesh position={[0, 0.46, 0]} scale={[1, 0.45, 0.7]}><sphereGeometry args={[0.36, 14, 10]} /><meshStandardMaterial color="#ffd36a" emissive="#ffb300" emissiveIntensity={0.9} roughness={0.3} metalness={0.6} /></mesh>
      <pointLight position={[0, 0.7, 0.2]} color="#ffcf66" intensity={5} distance={5} decay={2} />
    </group>
  );
}

/** 後牆的黃銅舵輪（八根把手） */
function ShipWheel({ position }) {
  return (
    <group position={position}>
      <mesh><torusGeometry args={[0.36, 0.035, 8, 32]} /><meshStandardMaterial {...BRASS_O} /></mesh>
      <mesh><sphereGeometry args={[0.08, 12, 10]} /><meshStandardMaterial {...BRASS_O} /></mesh>
      {[0, 1, 2, 3].map((k) => <mesh key={k} rotation={[0, 0, (k * Math.PI) / 4]}><boxGeometry args={[1.0, 0.03, 0.03]} /><meshStandardMaterial {...BRASS_O} /></mesh>)}
      {Array.from({ length: 8 }, (_, k) => (
        <mesh key={k} position={[Math.cos((k * Math.PI) / 4) * 0.5, Math.sin((k * Math.PI) / 4) * 0.5, 0]} rotation={[0, 0, (k * Math.PI) / 4 - Math.PI / 2]}>
          <cylinderGeometry args={[0.022, 0.03, 0.12, 8]} /><meshStandardMaterial {...BRASS_O} />
        </mesh>
      ))}
    </group>
  );
}

/** 圓形舷窗：黃銅框 + 深藍的海水 + 一串氣泡 */
function Porthole({ position, r = 0.6 }) {
  const view = useCanvasTexture((g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#2fb5c8'); gr.addColorStop(1, '#04233a');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(210,255,255,0.7)'; g.lineWidth = 2;
    [[50, 190, 7], [70, 150, 5], [58, 112, 9], [86, 74, 6], [78, 38, 4]].forEach(([x, y, rr]) => { g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.stroke(); });
    g.fillStyle = 'rgba(255,170,90,0.9)'; g.beginPath(); g.ellipse(170, 130, 18, 8, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(150, 130); g.lineTo(134, 120); g.lineTo(134, 140); g.closePath(); g.fill();
  }, 256, 256);
  return (
    <group position={position}>
      <mesh><circleGeometry args={[r, 36]} /><meshBasicMaterial map={view} toneMapped={false} /></mesh>
      <mesh position={[0, 0, 0.02]}><torusGeometry args={[r + 0.05, 0.075, 10, 40]} /><meshStandardMaterial {...BRASS_O} /></mesh>
      {Array.from({ length: 8 }, (_, k) => (
        <mesh key={k} position={[Math.cos((k * Math.PI) / 4) * (r + 0.05), Math.sin((k * Math.PI) / 4) * (r + 0.05), 0.08]}>
          <sphereGeometry args={[0.04, 8, 6]} /><meshStandardMaterial {...BRASS_O} />
        </mesh>
      ))}
    </group>
  );
}

export function OceanDecor() {
  return (
    <group>
      {/* 後牆：霓虹招牌、青色燈帶、舵輪、舷窗 */}
      <NeonSign position={[2.8, 4.3, -4.86]} text="DEEP SEA" color="#5ff0e0" w={3.2} h={1.1} font={'bold 76px "Arial Black", sans-serif'} />
      <Glow position={[0, 0.95, -4.86]} size={[17.6, 0.05, 0.05]} color="#19b5c4" />
      <Glow position={[0, 4.75, -4.86]} size={[17.6, 0.05, 0.05]} color="#5ff0e0" />
      <Glow position={[-8.86, 0.95, 2]} size={[0.05, 0.05, 13.6]} color="#19b5c4" />
      <ShipWheel position={[-0.2, 3.0, -4.84]} />
      <Porthole position={[7.9, 2.9, -4.86]} />
      <pointLight position={[2.8, 3.8, -4.2]} color="#5ff0e0" intensity={8} distance={9} decay={2} />

      {/* 水下的光與動態 */}
      <Caustics />
      <LightShafts />
      <FishSchools />
      <Bubbles />
      <Jellyfish position={[-5.2, 3.6, -1.2]} color="#ff8fd0" scale={1.0} light seed={1} />
      <Jellyfish position={[6.0, 3.1, -1.5]} color="#7fc4ff" scale={0.8} seed={2} />
      <Jellyfish position={[-1.8, 4.4, 5.8]} color="#b99aff" scale={1.2} light seed={3} />
      <Jellyfish position={[4.2, 4.0, 6.4]} color="#5ff0e0" scale={0.9} seed={4} />

      {/* 吊燈（取代一般吊燈；有 light 的才會真的打光） */}
      <OrbLamp position={[1.0, 3.2, 1.0]} color={OCEAN_GLOW[0]} light={14} />
      <OrbLamp position={[5.5, 3.2, 4.0]} color={OCEAN_GLOW[1]} light={9} />
      <OrbLamp position={[0.8, 3.2, 5.2]} color={OCEAN_GLOW[2]} light={9} />
      <OrbLamp position={[-3.0, 3.2, 2.5]} color={OCEAN_GLOW[4]} light={8} />
      <OrbLamp position={[3.5, 3.0, -3.6]} color={OCEAN_GLOW[3]} />
      <OrbLamp position={[7.4, 3.2, 1.5]} color={OCEAN_GLOW[0]} />
      <OrbLamp position={[-7.0, 3.0, -2.0]} color={OCEAN_GLOW[1]} />
      <OrbLamp position={[-5.4, 3.2, 5.0]} color={OCEAN_GLOW[2]} />

      {/* 角落：寶箱、珊瑚、海帶 */}
      <TreasureChest position={[8.0, 0, -4.15]} />
      <Coral position={[8.45, 0, -1.0]} seed={1} scale={1.2} />
      <Coral position={[-1.2, 0, 8.4]} seed={2} color="#ffb04d" glow="#ff8a00" />
      <Coral position={[4.0, 0, 8.4]} seed={3} scale={1.3} color="#b88aff" glow="#8a4dff" />
      <Coral position={[-5.2, 0, 8.3]} seed={4} scale={1.1} color="#4dd2ff" glow="#1aa0e0" />
      <Kelp position={[-8.5, 0, 7.0]} h={3.4} seed={1} />
      <Kelp position={[-8.15, 0, 7.8]} h={2.6} seed={2} color="#3aab6a" />
      <Kelp position={[8.5, 0, 4.6]} h={3.0} seed={3} />
      <Kelp position={[8.6, 0, 7.6]} h={3.6} seed={4} color="#3aab6a" />
    </group>
  );
}
