import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CafeDecor from './CafeDecor';
import Seat3D from './Seat3D';
import UserAvatar3D, { preloadAvatar } from './UserAvatar3D';

const BG = '#3a2a22';

function Lights() {
  return (
    <>
      <ambientLight intensity={0.75} color="#ffe9d2" />
      <hemisphereLight args={['#fff1dc', '#8a6a4f', 0.55]} />
      {/* 從窗外斜射進來的暖陽 */}
      <directionalLight
        position={[4, 9, 8]}
        intensity={1.4}
        color="#ffdcae"
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
 * @param seats        來自 useCafeRealtime 的座位陣列
 * @param currentUserId 目前登入者，用來標示「你」
 * @param onSeatSelect  點擊空位光球時呼叫 (seat) => void
 */
export default function CafeScene({ seats = [], currentUserId, onSeatSelect, className }) {
  // 座位資料一到就開始下載頭像，等角色真的渲染時多半已在快取裡
  useEffect(() => {
    seats.forEach((s) => preloadAvatar(s.occupant_avatar_url));
  }, [seats]);

  return (
    <div className={className ?? 'h-full w-full'}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 7.5, 12.5], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={[BG]} />
        <fog attach="fog" args={[BG, 20, 38]} />
        <Lights />
        <CafeDecor />

        {seats.map((seat) => (
          <group key={seat.id}>
            <Seat3D seat={seat} occupied={!!seat.occupant_id} onSelect={onSeatSelect} />
            {seat.occupant_id && <UserAvatar3D seat={seat} isSelf={seat.occupant_id === currentUserId} />}
          </group>
        ))}

        <OrbitControls
          makeDefault
          enablePan={false}
          target={[0, 0.9, 1.2]}
          minDistance={4}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.15}
          minAzimuthAngle={-Math.PI / 3}
          maxAzimuthAngle={Math.PI / 3}
        />
      </Canvas>
    </div>
  );
}
