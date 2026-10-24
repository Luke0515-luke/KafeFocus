import { useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import { useRef } from 'react';

const CUSHIONS = ['#e07a5f', '#f2cc8f', '#81b29a', '#a0c4ff', '#cdb4db', '#ffafcc'];
const WOOD = '#9c6b43';

function Chair({ seatY, cushion }) {
  const legH = seatY - 0.12;
  return (
    <group>
      <RoundedBox args={[0.5, 0.05, 0.5]} radius={0.02} smoothness={2} position={[0, seatY - 0.095, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </RoundedBox>
      {/* 圓潤的椅墊 */}
      <RoundedBox args={[0.46, 0.07, 0.46]} radius={0.03} smoothness={3} position={[0, seatY - 0.035, 0]} castShadow>
        <meshStandardMaterial color={cushion} roughness={1} />
      </RoundedBox>
      <RoundedBox args={[0.48, 0.5, 0.05]} radius={0.025} smoothness={2} position={[0, seatY + 0.25, -0.235]} castShadow>
        <meshStandardMaterial color={WOOD} roughness={0.8} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.22, 0.05]} radius={0.04} smoothness={3} position={[0, seatY + 0.27, -0.2]} castShadow>
        <meshStandardMaterial color={cushion} roughness={1} />
      </RoundedBox>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => (
        <mesh key={`${sx}${sz}`} position={[sx * 0.21, legH / 2, sz * 0.21]} castShadow>
          <cylinderGeometry args={[0.022, 0.018, legH, 8]} />
          <meshStandardMaterial color="#6e4528" />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ seatY, index }) {
  const top = seatY + 0.3;          // 桌面高度
  const z = 0.8;                    // 在座位前方
  return (
    <group position={[0, 0, z]}>
      <RoundedBox args={[1.05, 0.05, 0.62]} radius={0.02} smoothness={2} position={[0, top, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c08a5b" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, top / 2, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.05, top, 10]} />
        <meshStandardMaterial color="#6e4528" />
      </mesh>
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.04, 20]} />
        <meshStandardMaterial color="#6e4528" />
      </mesh>
      {/* 桌上小物：杯子 + 筆記本；每三張桌子放一盆小植物 */}
      <group position={[0.32, top + 0.025, 0.05]}>
        <mesh position={[0, 0.005, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.01, 16]} />
          <meshStandardMaterial color="#fff6e8" />
        </mesh>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.052, 0.042, 0.08, 16]} />
          <meshStandardMaterial color={index % 2 ? '#f2a7a0' : '#9ec5d8'} />
        </mesh>
      </group>
      <mesh position={[-0.15, top + 0.035, -0.02]} rotation={[0, 0.12, 0]} castShadow>
        <boxGeometry args={[0.3, 0.02, 0.22]} />
        <meshStandardMaterial color={['#e9c46a', '#8ab17d', '#e76f51'][index % 3]} />
      </mesh>
      {index % 3 === 0 && (
        <group position={[-0.4, top + 0.025, 0.18]}>
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.04, 0.1, 12]} />
            <meshStandardMaterial color="#fff6e8" />
          </mesh>
          <mesh position={[0, 0.14, 0]} castShadow>
            <icosahedronGeometry args={[0.07, 1]} />
            <meshStandardMaterial color="#7fb77e" flatShading />
          </mesh>
        </group>
      )}
    </group>
  );
}

/** 一組座位 = 椅子 + 桌子 + （空位時）懸浮的互動光球 */
export default function Seat3D({ seat, occupied, onSelect }) {
  const [hovered, setHovered] = useState(false);
  const marker = useRef();

  useFrame(({ clock }) => {
    if (marker.current) marker.current.position.y = 1.2 + Math.sin(clock.elapsedTime * 2 + seat.seat_index) * 0.06;
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
      <Chair seatY={seat.pos_y} cushion={CUSHIONS[seat.seat_index % CUSHIONS.length]} />
      <Desk seatY={seat.pos_y} index={seat.seat_index} />

      {!occupied && (
        <group ref={marker} position={[0, 1.2, 0]}>
          <mesh>
            <sphereGeometry args={[hovered ? 0.17 : 0.13, 20, 20]} />
            <meshBasicMaterial color={hovered ? '#ffb86b' : '#ffe0a8'} toneMapped={false} />
          </mesh>
          {/* 加大的隱形點擊範圍，手機也好點 */}
          <mesh {...handlers}>
            <sphereGeometry args={[0.38, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
          {hovered && (
            <Html center position={[0, 0.36, 0]} style={{ pointerEvents: 'none' }}>
              <div className="pointer-events-none whitespace-nowrap rounded-full bg-white/95 px-3 py-1 text-sm font-medium text-stone-700 shadow">
                坐這裡 ☕
              </div>
            </Html>
          )}
        </group>
      )}
    </group>
  );
}
