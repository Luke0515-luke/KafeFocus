import { useMemo, useRef } from 'react';
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
