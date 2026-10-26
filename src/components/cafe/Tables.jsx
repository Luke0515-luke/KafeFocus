import { usePalette } from './palette';
import { RoundedBox } from '@react-three/drei';
import { TABLES } from './layout';
import { ThemedTables } from './ThemeFurniture';

const BLACK_METAL = { color: '#1b1b1d', roughness: 0.45, metalness: 0.7 };
const BRASS = { color: '#a8844f', roughness: 0.35, metalness: 0.85 };

/* ---------- 桌上小物 ---------- */
function Cup({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.006, 0]} castShadow>
        <cylinderGeometry args={[0.075, 0.065, 0.012, 24]} />
        <meshStandardMaterial color="#e9e2d6" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.048, 0.036, 0.075, 24]} />
        <meshStandardMaterial color="#e9e2d6" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.088, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.042, 20]} />
        <meshStandardMaterial color="#2a170d" roughness={0.2} />
      </mesh>
    </group>
  );
}

function Candle({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.06, 16]} />
        <meshStandardMaterial color="#c9955a" transparent opacity={0.75} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </mesh>
    </group>
  );
}

function Books({ position = [0, 0, 0], rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {[['#3b2a22', 0.26, 0.2], ['#5b3a2a', 0.23, 0.18], ['#2b3a34', 0.2, 0.16]].map(([c, w, d], i) => (
        <mesh key={c} position={[0, 0.012 + i * 0.026, 0]} castShadow>
          <boxGeometry args={[w, 0.024, d]} />
          <meshStandardMaterial color={c} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Vase({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.05, 0.14, 16]} />
        <meshStandardMaterial color="#2c2622" roughness={0.5} />
      </mesh>
      {[[0, 0.2, 0], [0.04, 0.17, 0.02], [-0.04, 0.18, -0.02]].map((p, i) => (
        <mesh key={i} position={p} scale={[0.5, 1.4, 0.5]} castShadow>
          <sphereGeometry args={[0.05, 10, 10]} />
          <meshStandardMaterial color="#3b5a3a" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------- 五種桌子 ---------- */
function BarTable({ t }) {
  const P = usePalette();
  const { length: L, depth: D, height: h } = t;
  return (
    <group position={t.position}>
      <mesh position={[0, (h - 0.06) / 2, -D * 0.1]} castShadow receiveShadow>
        <boxGeometry args={[L - 0.1, h - 0.06, D * 0.7]} />
        <meshStandardMaterial color={P.barBody} roughness={0.7} />
      </mesh>
      <RoundedBox args={[L, 0.06, D]} radius={0.015} smoothness={2} position={[0, h - 0.03, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.barTop} roughness={0.3} metalness={0.05} />
      </RoundedBox>
      <mesh position={[0, 0.22, D / 2 + 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, L - 0.4, 12]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      {[-2.5, 0.2, 2.8].map((x) => <Cup key={x} position={[x, h, 0.05]} />)}
      <Candle position={[1.4, h, -0.05]} />
      <Candle position={[-1.2, h, 0]} />
    </group>
  );
}

function SlabTable({ t }) {
  const P = usePalette();
  const { length: L, depth: D, height: h } = t;
  return (
    <group position={t.position} rotation={[0, t.rotationY ?? 0, 0]}>
      <RoundedBox args={[L, 0.07, D]} radius={0.015} smoothness={2} position={[0, h - 0.035, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.slab} roughness={0.5} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (L / 2 - 0.3), (h - 0.07) / 2, 0]} castShadow>
          <boxGeometry args={[0.05, h - 0.07, D * 0.8]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
      ))}
      <mesh position={[0, 0.25, 0]} castShadow>
        <boxGeometry args={[Math.max(0.2, L - 0.6), 0.04, 0.05]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <Cup position={[-L * 0.3, h, D * 0.2]} />
      <Cup position={[L * 0.22, h, -D * 0.2]} />
      <Candle position={[0, h, 0]} />
      {L > 3 && (
        <>
          <Books position={[-0.35, h, -0.25]} rotation={0.3} />
          <Vase position={[1.3, h, 0.1]} />
        </>
      )}
    </group>
  );
}

function CafeRoundTable({ t }) {
  const P = usePalette();
  const { radius: r, height: h } = t;
  return (
    <group position={t.position}>
      <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.04, 40]} />
        <meshStandardMaterial color={P.slab} roughness={0.5} />
      </mesh>
      <mesh position={[0, (h - 0.04) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, h - 0.04, 12]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.22, 0.24, 0.03, 28]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <Cup position={[0.12, h, 0.1]} />
      <Candle position={[-0.1, h, -0.08]} />
    </group>
  );
}

function MarbleTable({ t, marble }) {
  const { radius: r, height: h } = t;
  return (
    <group position={t.position}>
      <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.04, 48]} />
        <meshStandardMaterial map={marble} roughness={0.18} metalness={0.1} />
      </mesh>
      <mesh position={[0, (h - 0.04) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, h - 0.04, 16]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[0.25, 0.27, 0.03, 32]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <Cup position={[0.15, h, 0.1]} />
      <Candle position={[-0.12, h, -0.1]} />
    </group>
  );
}

function SquareTable({ t }) {
  const P = usePalette();
  const { size: s, height: h } = t;
  const o = s / 2 - 0.06;
  return (
    <group position={t.position}>
      <RoundedBox args={[s, 0.04, s]} radius={0.01} smoothness={2} position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.square} roughness={0.75} />
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * o, (h - 0.04) / 2, z * o]} castShadow>
          <boxGeometry args={[0.04, h - 0.04, 0.04]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
      ))}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * o, h * 0.3, 0]}>
          <boxGeometry args={[0.025, 0.025, s - 0.12]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
      ))}
      <Cup position={[0.15, h, 0.1]} />
      <Books position={[-0.17, h, -0.12]} rotation={-0.25} />
    </group>
  );
}

function LowTable({ t }) {
  const P = usePalette();
  const { radius: r, height: h } = t;
  return (
    <group position={t.position}>
      <mesh position={[0, h - 0.02, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r, 0.04, 40]} />
        <meshStandardMaterial color={P.low} roughness={0.35} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.27, (h - 0.04) / 2, Math.sin(a) * 0.27]} castShadow>
            <cylinderGeometry args={[0.015, 0.012, h - 0.04, 8]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        );
      })}
      <Books position={[-0.1, h, 0.05]} rotation={0.4} />
      <Candle position={[0.14, h, -0.08]} />
    </group>
  );
}

export default function Tables({ textures }) {
  const { marble } = textures;
  const P = usePalette();
  if (P.furniture) return <ThemedTables f={P.furniture} />;
  return (
    <group>
      {TABLES.map((t) => {
        if (t.type === 'bar') return <BarTable key={t.id} t={t} />;
        if (t.type === 'slab') return <SlabTable key={t.id} t={t} />;
        if (t.type === 'marble') return <MarbleTable key={t.id} t={t} marble={marble} />;
        if (t.type === 'square') return <SquareTable key={t.id} t={t} />;
        if (t.type === 'cafe') return <CafeRoundTable key={t.id} t={t} />;
        return <LowTable key={t.id} t={t} />;
      })}
    </group>
  );
}
