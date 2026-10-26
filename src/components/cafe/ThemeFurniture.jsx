import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { TABLES, seatStyle } from './layout';

/**
 * 各主題專屬的桌椅（和預設的皮革 / 黑鐵桌椅完全不同）：
 *   neon   雨夜霓虹：黑色玻璃桌 + 發光邊條、發光底座的賽博椅
 *   nordic 北歐風：淺色原木桌（錐形桌腳）、淺色布面椅墊與原木椅
 *   zen    櫻語茶屋：矮茶几（卓袱台）+ 布座墊（座布團），搭配跪坐
 * 椅子原點 = 椅面中心落在地板上；桌子原點 = 桌子中心落在地板上。
 */

const GLOWS = ['#22d3ee', '#ff2e93', '#a855f7'];
const NORDIC_FABRICS = ['#c8d3cb', '#dccbb4', '#a9bccd', '#e5cfc6'];
const ZABUTON = ['#2b3a55', '#7a2a2f', '#4f5d3a', '#3a3a52'];

const Glow = ({ position, size, color }) => (
  <mesh position={position}><boxGeometry args={size} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
);

/* ===================== 桌子 ===================== */
const tableHeight = (t, f) => (f === 'zen' ? (t.type === 'bar' ? 0.36 : 0.32) : t.height);

function TableProps({ f, h, xs = [0], z = 0 }) {
  return xs.map((x, i) => (
    <group key={x} position={[x, h, z]}>
      {f === 'zen' && (i % 2 === 0
        ? <>{/* 茶壺 */}<mesh position={[0, 0.06, 0]} castShadow><sphereGeometry args={[0.07, 14, 12]} /><meshStandardMaterial color="#2a2a30" roughness={0.4} metalness={0.5} /></mesh><mesh position={[0.08, 0.07, 0]} rotation={[0, 0, -0.9]}><cylinderGeometry args={[0.012, 0.02, 0.07, 6]} /><meshStandardMaterial color="#2a2a30" /></mesh></>
        : <mesh position={[0, 0.025, 0]} castShadow><cylinderGeometry args={[0.04, 0.03, 0.05, 14]} /><meshStandardMaterial color="#e8e0d0" roughness={0.4} /></mesh>)}
      {f === 'nordic' && (i % 2 === 0
        ? <><mesh position={[0, 0.06, 0]} castShadow><cylinderGeometry args={[0.04, 0.05, 0.12, 12]} /><meshStandardMaterial color="#f2efe8" roughness={0.6} /></mesh>{[-0.03, 0, 0.035].map((dx, k) => <mesh key={k} position={[dx, 0.2 + k * 0.01, 0]} rotation={[0, 0, dx * 4]}><cylinderGeometry args={[0.004, 0.004, 0.16, 5]} /><meshStandardMaterial color="#6f5a3e" /></mesh>)}</>
        : <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.045, 0.035, 0.06, 16]} /><meshStandardMaterial color="#f7f4ee" roughness={0.35} /></mesh>)}
      {f === 'neon' && <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.04, 0.032, 0.06, 14]} /><meshBasicMaterial color={GLOWS[i % 3]} toneMapped={false} /></mesh>}
    </group>
  ));
}

function RectTable({ t, f }) {
  const h = tableHeight(t, f);
  const L = t.length ?? t.size; const D = t.depth ?? t.size;
  const isBar = t.type === 'bar';
  const wood = f === 'nordic' ? { color: '#e9d8bd', roughness: 0.55 } : f === 'zen' ? { color: '#6a4a2c', roughness: 0.5 } : { color: '#120d26', roughness: 0.12, metalness: 0.55 };
  const leg = f === 'nordic' ? { color: '#d9c29c', roughness: 0.6 } : f === 'zen' ? { color: '#4a321c', roughness: 0.6 } : { color: '#070510', roughness: 0.3, metalness: 0.8 };
  const th = f === 'zen' ? 0.05 : 0.045;
  const px = t.type === 'slab' ? [-L * 0.28, L * 0.28] : [0];
  return (
    <group position={t.position} rotation={[0, t.rotationY ?? 0, 0]}>
      <RoundedBox args={[L, th, D]} radius={0.012} smoothness={2} position={[0, h - th / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...wood} />
      </RoundedBox>
      {isBar ? (
        <mesh position={[0, (h - th) / 2, -D * 0.12]} castShadow><boxGeometry args={[L - 0.12, h - th, D * 0.66]} /><meshStandardMaterial {...leg} /></mesh>
      ) : [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        f === 'nordic'
          ? <mesh key={`${x}${z}`} position={[x * (L / 2 - 0.12), (h - th) / 2, z * (D / 2 - 0.1)]} rotation={[z * 0.06, 0, -x * 0.06]} castShadow><cylinderGeometry args={[0.03, 0.016, h - th, 10]} /><meshStandardMaterial {...leg} /></mesh>
          : <mesh key={`${x}${z}`} position={[x * (L / 2 - 0.1), (h - th) / 2, z * (D / 2 - 0.08)]} castShadow><boxGeometry args={[f === 'zen' ? 0.07 : 0.035, h - th, f === 'zen' ? 0.07 : 0.035]} /><meshStandardMaterial {...leg} /></mesh>
      ))}
      {f === 'neon' && <>
        <Glow position={[0, h - th - 0.012, D / 2 - 0.01]} size={[L - 0.04, 0.014, 0.014]} color="#22d3ee" />
        <Glow position={[0, h - th - 0.012, -D / 2 + 0.01]} size={[L - 0.04, 0.014, 0.014]} color="#ff2e93" />
        <Glow position={[0, 0.012, 0]} size={[L * 0.8, 0.012, D * 0.8]} color="#6d28d9" />
      </>}
      <TableProps f={f} h={h} xs={px} />
    </group>
  );
}

function RoundTable({ t, f }) {
  const r = t.radius; const h = tableHeight(t, f);
  const top = f === 'nordic' ? { color: '#efe0c6', roughness: 0.5 } : f === 'zen' ? { color: '#6a4a2c', roughness: 0.5 } : { color: '#120d26', roughness: 0.1, metalness: 0.6 };
  const leg = f === 'nordic' ? { color: '#d9c29c', roughness: 0.6 } : f === 'zen' ? { color: '#4a321c', roughness: 0.6 } : { color: '#070510', roughness: 0.3, metalness: 0.8 };
  const glow = GLOWS[Math.abs(Math.round(t.position[0] * 3 + t.position[2])) % 3];
  return (
    <group position={t.position}>
      <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow><cylinderGeometry args={[r, r, f === 'zen' ? 0.05 : 0.04, 40]} /><meshStandardMaterial {...top} /></mesh>
      {f === 'neon' && <>
        <mesh position={[0, h - 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[r, 0.012, 8, 48]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
        <mesh position={[0, (h - 0.04) / 2, 0]} castShadow><cylinderGeometry args={[0.03, 0.05, h - 0.04, 12]} /><meshStandardMaterial {...leg} /></mesh>
        <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.2, 0.28, 32]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
      </>}
      {f === 'nordic' && [0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return <mesh key={i} position={[Math.cos(a) * r * 0.45, (h - 0.04) / 2, Math.sin(a) * r * 0.45]} rotation={[Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]} castShadow><cylinderGeometry args={[0.03, 0.016, h - 0.04, 10]} /><meshStandardMaterial {...leg} /></mesh>;
      })}
      {f === 'zen' && [0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return <mesh key={i} position={[Math.cos(a) * r * 0.62, (h - 0.05) / 2, Math.sin(a) * r * 0.62]} castShadow><boxGeometry args={[0.06, h - 0.05, 0.06]} /><meshStandardMaterial {...leg} /></mesh>;
      })}
      <TableProps f={f} h={h} xs={[0.1]} z={0.05} />
    </group>
  );
}

export function ThemedTables({ f }) {
  return (
    <group>
      {TABLES.map((t) => (['bar', 'slab', 'square'].includes(t.type)
        ? <RectTable key={t.id} t={t} f={f} />
        : <RoundTable key={t.id} t={t} f={f} />))}
    </group>
  );
}

/* ===================== 椅子 ===================== */
function Zabuton({ seat }) {
  const c = ZABUTON[seat.seat_index % ZABUTON.length];
  return (
    <group>
      <RoundedBox args={[0.64, 0.09, 0.64]} radius={0.04} smoothness={4} position={[0, 0.045, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={c} roughness={0.95} />
      </RoundedBox>
      <mesh position={[0, 0.092, 0]}><cylinderGeometry args={[0.018, 0.018, 0.012, 10]} /><meshStandardMaterial color="#e8d9b0" roughness={0.6} /></mesh>
      <RoundedBox args={[0.66, 0.012, 0.66]} radius={0.006} smoothness={2} position={[0, 0.045, 0]}>
        <meshStandardMaterial color="#e8d9b0" roughness={0.9} />
      </RoundedBox>
    </group>
  );
}

function NordicChair({ seat, seatY }) {
  const fab = NORDIC_FABRICS[seat.seat_index % NORDIC_FABRICS.length];
  const style = seatStyle(seat);
  const wood = { color: '#d9c29c', roughness: 0.6 };
  const legH = seatY - 0.05;
  if (style === 'stool') {
    return (
      <group>
        <mesh position={[0, seatY - 0.02, 0]} castShadow><cylinderGeometry args={[0.19, 0.19, 0.04, 28]} /><meshStandardMaterial {...wood} /></mesh>
        <mesh position={[0, seatY + 0.005, 0]} castShadow><cylinderGeometry args={[0.17, 0.17, 0.04, 28]} /><meshStandardMaterial color={fab} roughness={0.95} /></mesh>
        {[0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; return (
          <mesh key={i} position={[Math.cos(a) * 0.12, legH / 2, Math.sin(a) * 0.12]} rotation={[Math.sin(a) * 0.09, 0, -Math.cos(a) * 0.09]} castShadow><cylinderGeometry args={[0.02, 0.012, legH, 8]} /><meshStandardMaterial {...wood} /></mesh>); })}
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.15, 0.012, 8, 24]} /><meshStandardMaterial {...wood} /></mesh>
      </group>
    );
  }
  if (style === 'armchair') {
    return (
      <group>
        <RoundedBox args={[0.78, 0.2, 0.8]} radius={0.06} smoothness={3} position={[0, 0.26, 0]} castShadow><meshStandardMaterial color={fab} roughness={0.95} /></RoundedBox>
        <RoundedBox args={[0.78, 0.5, 0.18]} radius={0.07} smoothness={3} position={[0, 0.5, -0.32]} castShadow><meshStandardMaterial color={fab} roughness={0.95} /></RoundedBox>
        {[-1, 1].map((x) => <RoundedBox key={x} args={[0.1, 0.26, 0.7]} radius={0.04} smoothness={3} position={[x * 0.34, 0.42, 0.02]} castShadow><meshStandardMaterial color={fab} roughness={0.95} /></RoundedBox>)}
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => <mesh key={`${x}${z}`} position={[x * 0.33, 0.07, z * 0.33]} rotation={[z * 0.12, 0, -x * 0.12]}><cylinderGeometry args={[0.025, 0.014, 0.16, 8]} /><meshStandardMaterial {...wood} /></mesh>)}
      </group>
    );
  }
  if (style === 'booth') {
    return (
      <group>
        <mesh position={[0, (seatY - 0.12) / 2, -0.02]} castShadow><boxGeometry args={[1.2, seatY - 0.12, 0.56]} /><meshStandardMaterial {...wood} /></mesh>
        <RoundedBox args={[1.2, 0.12, 0.6]} radius={0.04} smoothness={3} position={[0, seatY - 0.06, -0.02]} castShadow><meshStandardMaterial color={fab} roughness={0.95} /></RoundedBox>
        <RoundedBox args={[1.2, 0.6, 0.12]} radius={0.05} smoothness={3} position={[0, seatY + 0.34, -0.36]} castShadow><meshStandardMaterial color={fab} roughness={0.95} /></RoundedBox>
      </group>
    );
  }
  return (
    <group>
      <RoundedBox args={[0.42, 0.05, 0.42]} radius={0.02} smoothness={3} position={[0, seatY - 0.025, 0]} castShadow><meshStandardMaterial color={fab} roughness={0.95} /></RoundedBox>
      <mesh position={[0, seatY - 0.06, 0]} castShadow><boxGeometry args={[0.44, 0.03, 0.44]} /><meshStandardMaterial {...wood} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.17, (seatY - 0.07) / 2, z * 0.17]} rotation={[z * 0.1, 0, -x * 0.1]} castShadow><cylinderGeometry args={[0.022, 0.012, seatY - 0.07, 8]} /><meshStandardMaterial {...wood} /></mesh>
      ))}
      <mesh position={[0, seatY + 0.2, -0.02]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.18, 20, 1, true, Math.PI - 1.1, 2.2]} /><meshStandardMaterial {...wood} side={THREE.DoubleSide} /></mesh>
      <mesh position={[0, seatY + 0.2, -0.02]} castShadow><cylinderGeometry args={[0.192, 0.192, 0.14, 20, 1, true, Math.PI - 0.9, 1.8]} /><meshStandardMaterial color={fab} roughness={0.95} side={THREE.DoubleSide} /></mesh>
    </group>
  );
}

function NeonChair({ seat, seatY }) {
  const glow = GLOWS[seat.seat_index % 3];
  const style = seatStyle(seat);
  const dark = { color: '#1a1238', roughness: 0.25, metalness: 0.5 };
  const chrome = { color: '#9aa4c4', roughness: 0.2, metalness: 0.9 };
  if (style === 'stool') {
    return (
      <group>
        <mesh position={[0, seatY - 0.04, 0]} castShadow><cylinderGeometry args={[0.2, 0.18, 0.08, 28]} /><meshStandardMaterial {...dark} /></mesh>
        <mesh position={[0, seatY - 0.085, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.19, 0.012, 8, 32]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
        <mesh position={[0, (seatY - 0.08) / 2, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, seatY - 0.08, 10]} /><meshStandardMaterial {...chrome} /></mesh>
        <mesh position={[0, 0.02, 0]} castShadow><cylinderGeometry args={[0.2, 0.22, 0.04, 28]} /><meshStandardMaterial {...dark} /></mesh>
        <mesh position={[0, 0.043, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.008, 6, 32]} /><meshBasicMaterial color={glow} toneMapped={false} /></mesh>
      </group>
    );
  }
  if (style === 'armchair' || style === 'booth') {
    const w = style === 'booth' ? 1.2 : 0.8;
    return (
      <group>
        <RoundedBox args={[w, style === 'booth' ? 0.16 : 0.3, 0.7]} radius={0.06} smoothness={3} position={[0, seatY - 0.12, 0]} castShadow><meshStandardMaterial {...dark} /></RoundedBox>
        <RoundedBox args={[w, 0.62, 0.14]} radius={0.06} smoothness={3} position={[0, seatY + 0.3, -0.34]} castShadow><meshStandardMaterial {...dark} /></RoundedBox>
        <Glow position={[0, seatY - 0.2, 0.355]} size={[w - 0.1, 0.02, 0.01]} color={glow} />
        <Glow position={[0, seatY + 0.5, -0.265]} size={[w - 0.2, 0.015, 0.01]} color={glow} />
        <Glow position={[0, 0.02, 0]} size={[w - 0.1, 0.012, 0.6]} color={glow} />
      </group>
    );
  }
  return (
    <group>
      <RoundedBox args={[0.46, 0.06, 0.44]} radius={0.025} smoothness={3} position={[0, seatY - 0.03, 0]} castShadow><meshStandardMaterial {...dark} /></RoundedBox>
      <Glow position={[0, seatY - 0.065, 0.22]} size={[0.44, 0.012, 0.012]} color={glow} />
      <RoundedBox args={[0.46, 0.46, 0.05]} radius={0.025} smoothness={3} position={[0, seatY + 0.26, -0.22]} rotation={[-0.08, 0, 0]} castShadow><meshStandardMaterial {...dark} /></RoundedBox>
      <Glow position={[0, seatY + 0.26, -0.19]} size={[0.3, 0.012, 0.01]} color={glow} />
      <mesh position={[0, (seatY - 0.06) / 2, 0]} castShadow><cylinderGeometry args={[0.025, 0.04, seatY - 0.06, 10]} /><meshStandardMaterial {...chrome} /></mesh>
      <mesh position={[0, 0.015, 0]}><cylinderGeometry args={[0.2, 0.22, 0.03, 24]} /><meshStandardMaterial {...dark} /></mesh>
    </group>
  );
}

export function ThemeChair({ f, seat, seatY }) {
  if (f === 'zen') return <Zabuton seat={seat} />;
  if (f === 'nordic') return <NordicChair seat={seat} seatY={seatY} />;
  return <NeonChair seat={seat} seatY={seatY} />;
}
