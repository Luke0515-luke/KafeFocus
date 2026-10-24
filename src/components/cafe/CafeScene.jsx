import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CafeDecor from './CafeDecor';
import Seat3D from './Seat3D';
import UserAvatar3D, { preloadAvatar } from './UserAvatar3D';

const BG = '#0d0806';

// 偏暗的咖啡廳夜晚氣氛：環境光很低，主要靠吊燈與立燈的暖光。
// 覺得太暗：調高 ambientLight / hemisphereLight；覺得太亮：反過來。
function Lights() {
  return (
    <>
      <ambientLight intensity={0.28} color="#ffcf9e" />
      <hemisphereLight args={['#ffd9b0', '#2a1a10', 0.3]} />
      <directionalLight
        position={[5, 9, 9]}
        intensity={0.55}
        color="#ffc88f"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0004}
      />
    </>
  );
}

/**
 * 3D 咖啡廳主場景（純呈現，不碰 Supabase）。
 * @param seats         來自 useCafeRealtime 的座位陣列
 * @param currentUserId 目前登入者，用來標示「你」
 * @param onSeatSelect  點擊空位光球時呼叫 (seat) => void
 */
export default function CafeScene({ seats = [], currentUserId, onSeatSelect, className }) {
  useEffect(() => {
    seats.forEach((s) => preloadAvatar(s.occupant_avatar_url));
  }, [seats]);

  return (
    <div className={className ?? 'h-full w-full'}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 8.5, 12.5], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 22, 40]} />
        <Lights />
        <CafeDecor />

        {seats.map((seat) => (
          <group key={seat.id}>
            <Seat3D seat={seat} occupied={!!seat.occupant_id} onSelect={onSeatSelect} />
            {seat.occupant_id && <UserAvatar3D seat={seat} isSelf={seat.occupant_id === currentUserId} />}
          </group>
        ))}

        {/* 左牆與後牆是實心的，所以限制鏡頭不能繞到牆後面 */}
        <OrbitControls
          makeDefault
          enablePan={false}
          target={[0, 0.9, 1.2]}
          minDistance={4}
          maxDistance={16}
          maxPolarAngle={Math.PI / 2.15}
          minAzimuthAngle={-Math.PI / 6}
          maxAzimuthAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
