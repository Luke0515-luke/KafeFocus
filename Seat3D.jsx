import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { seatStyle } from './layout';
import { usePalette } from './palette';

const METAL = { color: '#1b1b1d', roughness: 0.45, metalness: 0.7 };
const BRASS = { color: '#a8844f', roughness: 0.35, metalness: 0.85 };
const DARK_WOOD = { color: '#2c1b11', roughness: 0.6 };
const LEATHERS = ['#6b3f26', '#5a3420', '#4b2b18', '#74482c'];

/* 原點 = 椅面中心落在地板上的位置；seatY = 椅面高度 */

function Stool({ seatY, leather }) {
  const legH = seatY - 0.07;
  return (
    <group>
      <mesh position={[0, seatY - 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.07, 28]} />
        <meshStandardMaterial color={leather} roughness={0.55} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.13, legH / 2, z * 0.13]} castShadow>
          <cylinderGeometry args={[0.011, 0.011, legH, 8]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <mesh position={[0, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.18, 0.011, 8, 28]} />
        <meshStandardMaterial {...METAL} />
      </mesh>
    </group>
  );
}

function WoodChair({ seatY, leather }) {
  const P = usePalette();
  const legH = seatY - 0.06;
  return (
    <group>
      <mesh position={[0, seatY - 0.07, 0]} castShadow>
        <boxGeometry args={[0.46, 0.04, 0.46]} />
        <meshStandardMaterial {...P.chairWood} />
      </mesh>
      <RoundedBox args={[0.42, 0.05, 0.42]} radius={0.02} smoothness={3} position={[0, seatY - 0.025, 0]} castShadow>
        <meshStandardMaterial color={leather} roughness={0.55} />
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.2, legH / 2, z * 0.2]} castShadow>
          <boxGeometry args={[0.04, legH, 0.04]} />
          <meshStandardMaterial {...P.chairWood} />
        </mesh>
      ))}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.2, seatY + 0.2, -0.21]} castShadow>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial {...P.chairWood} />
        </mesh>
      ))}
      {[0.28, 0.4].map((dy) => (
        <mesh key={dy} position={[0, seatY + dy, -0.21]} castShadow>
          <boxGeometry args={[0.42, 0.07, 0.025]} />
          <meshStandardMaterial {...P.chairWood} />
        </mesh>
      ))}
    </group>
  );
}

function BistroChair({ seatY, wood = false }) {
  const P = usePalette();
  const legH = seatY - 0.04;
  return (
    <group>
      <mesh position={[0, seatY - 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.035, 28]} />
        <meshStandardMaterial color="#4a2f1e" roughness={0.6} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.14, legH / 2, z * 0.14]} castShadow>
          <cylinderGeometry args={[0.009, 0.009, legH, 8]} />
          <meshStandardMaterial {...(wood ? P.chairWood : METAL)} />
        </mesh>
      ))}
      {/* 包住背部的弧形椅背 */}
      <mesh position={[0, seatY + 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.2, 20, 1, true, Math.PI - 0.95, 1.9]} />
        <meshStandardMaterial {...(wood ? { color: '#3b2416', roughness: 0.55 } : METAL)} side={2} />
      </mesh>
    </group>
  );
}

function IndustrialChair({ seatY }) {
  const legH = seatY - 0.04;
  return (
    <group>
      <mesh position={[0, seatY - 0.018, 0]} castShadow>
        <boxGeometry args={[0.42, 0.035, 0.42]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.75} />
      </mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.19, legH / 2, z * 0.19]} castShadow>
          <boxGeometry args={[0.025, legH, 0.025]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      {[-1, 1].map((x) => (
        <mesh key={x} position={[x * 0.19, seatY + 0.2, -0.19]} castShadow>
          <boxGeometry args={[0.025, 0.46, 0.025]} />
          <meshStandardMaterial {...METAL} />
        </mesh>
      ))}
      <mesh position={[0, seatY + 0.3, -0.2]} castShadow>
        <boxGeometry args={[0.4, 0.24, 0.02]} />
        <meshStandardMaterial color="#6b4a30" roughness={0.75} />
      </mesh>
    </group>
  );
}

function Armchair({ seatY, leather }) {
  return (
    <group>
      <RoundedBox args={[0.8, 0.28, 0.82]} radius={0.05} smoothness={3} position={[0, 0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={leather} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.52, 0.1, 0.56]} radius={0.04} smoothness={3} position={[0, seatY - 0.05, 0.05]} castShadow>
        <meshStandardMaterial color={leather} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.8, 0.62, 0.2]} radius={0.06} smoothness={3} position={[0, 0.52, -0.33]} castShadow>
        <meshStandardMaterial color={leather} roughness={0.45} />
      </RoundedBox>
      {[-1, 1].map((x) => (
        <RoundedBox key={x} args={[0.14, 0.3, 0.74]} radius={0.05} smoothness={3} position={[x * 0.33, 0.45, 0]} castShadow>
          <meshStandardMaterial color={leather} roughness={0.45} />
        </RoundedBox>
      ))}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x * 0.34, 0.03, z * 0.34]}>
          <cylinderGeometry args={[0.02, 0.016, 0.06, 10]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      ))}
    </group>
  );
}

function BoothSeat({ seatY, leather }) {
  const P = usePalette();
  return (
    <group>
      <mesh position={[0, (seatY - 0.14) / 2, -0.02]} castShadow>
        <boxGeometry args={[1.2, seatY - 0.14, 0.6]} />
        <meshStandardMaterial {...P.chairWood} />
      </mesh>
      <RoundedBox args={[1.2, 0.14, 0.62]} radius={0.05} smoothness={3} position={[0, seatY - 0.07, -0.02]} castShadow>
        <meshStandardMaterial color={leather} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[1.2, 0.72, 0.14]} radius={0.06} smoothness={3} position={[0, seatY + 0.36, -0.38]} castShadow>
        <meshStandardMaterial color={leather} roughness={0.45} />
      </RoundedBox>
    </group>
  );
}

function Chair({ seat }) {
  const P = usePalette();
  const style = seatStyle(seat);
  const leather = P.leathers[seat.seat_index % P.leathers.length];
  const y = seat.pos_y;
  if (style === 'stool') return <Stool seatY={y} leather={leather} />;
  if (style === 'bistro') return <BistroChair seatY={y} />;
  if (style === 'bentwood') return <BistroChair seatY={y} wood />;
  if (style === 'booth') return <BoothSeat seatY={y} leather={leather} />;
  if (style === 'industrial') return <IndustrialChair seatY={y} />;
  if (style === 'armchair') return <Armchair seatY={y} leather={leather} />;
  return <WoodChair seatY={y} leather={leather} />;
}

/** 椅子 +（空位時）懸浮的互動光球。桌子由 Tables.jsx 統一擺放。 */
export default function Seat3D({ seat, occupied, onSelect }) {
  const P = usePalette();
  const [hovered, setHovered] = useState(false);
  const marker = useRef();
  const baseY = seat.pos_y + 0.8;

  useFrame(({ clock }) => {
    if (marker.current) marker.current.position.y = baseY + Math.sin(clock.elapsedTime * 2 + seat.seat_index) * 0.05;
  });
  useEffect(() => () => { document.body.style.cursor = 'auto'; }, []);
  useEffect(() => { if (occupied) { setHovered(false); document.body.style.cursor = 'auto'; } }, [occupied]);

  const handlers = {
    onClick: (e) => { e.stopPropagation(); onSelect?.(seat); },
    onPointerOver: (e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; },
    onPointerOut: () => { setHovered(false); document.body.style.cursor = 'auto'; },
  };

  return (
    <group position={[seat.pos_x, 0, seat.pos_z]} rotation={[0, seat.rot_y, 0]}>
      <Chair seat={seat} />

      {!occupied && (
        <group ref={marker} position={[0, baseY, 0]}>
          <mesh>
            <sphereGeometry args={[hovered ? 0.1 : 0.07, 20, 20]} />
            <meshBasicMaterial color={hovered ? P.orbHover : P.orb} toneMapped={false} />
          </mesh>
          <mesh>
            <ringGeometry args={[hovered ? 0.17 : 0.13, hovered ? 0.185 : 0.14, 32]} />
            <meshBasicMaterial color={P.orb} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
          </mesh>
          <mesh {...handlers}>
            <sphereGeometry args={[0.38, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {hovered && (
            <Html center position={[0, 0.3, 0]} style={{ pointerEvents: 'none' }}>
              <div className="pointer-events-none whitespace-nowrap rounded-md bg-stone-900/90 px-3 py-1 text-sm text-stone-100 ring-1 ring-amber-700/50">
                坐這裡
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}
