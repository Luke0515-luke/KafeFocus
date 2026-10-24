import { useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CafeDecor from './CafeDecor';
import Seat3D from './Seat3D';
import UserAvatar3D, { preloadAvatar } from './UserAvatar3D';
import WalkersLayer from './WalkersLayer';
import { THEMES } from '../../config/themes';

// 燈光全部來自主題（src/config/themes.js）。太暗就調高該主題的 ambient / hemi / key，太亮就調低。
function Lights({ theme }) {
  return (
    <>
      <ambientLight color={theme.ambient[0]} intensity={theme.ambient[1]} />
      <hemisphereLight args={[theme.hemi[0], theme.hemi[1], theme.hemi[2]]} />
      <directionalLight
        position={[5, 9, 9]}
        intensity={theme.key[1]}
        color={theme.key[0]}
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
 * @param theme         咖啡廳主題（src/config/themes.js）
 * @param players       usePlayers 的回傳值：站著 / 走路的角色、聊天泡泡
 * @param selfName      自己的顯示名稱（站著時頭上的名牌）
 * @param selfAvatarUrl 自己的頭像網址
 * @param onFloorClick  點地板 (x, z) => void：走過去
 */
export default function CafeScene({
  seats = [], currentUserId, onSeatSelect, theme = THEMES.roast, className,
  players, selfName, selfAvatarUrl, onFloorClick,
}) {
  useEffect(() => {
    seats.forEach((s) => preloadAvatar(s.occupant_avatar_url));
  }, [seats]);

  return (
    <div className={className ?? 'h-full w-full'}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 8.5, 12.5], fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={[theme.bg]} />
        <fog attach="fog" args={[theme.bg, theme.fog[0], theme.fog[1]]} />
        <Lights theme={theme} />
        <CafeDecor theme={theme} />

        {seats.map((seat) => (
          <group key={seat.id}>
            <Seat3D seat={seat} occupied={!!seat.occupant_id} onSelect={onSeatSelect} />
            {seat.occupant_id && (
              <UserAvatar3D seat={seat} isSelf={seat.occupant_id === currentUserId} bubble={players?.bubbles?.[seat.occupant_id]} />
            )}
          </group>
        ))}

        {/* 看不見的地板：點一下就走過去（拖曳轉鏡頭時 delta 很大，不算點擊） */}
        {onFloorClick && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}
            onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onFloorClick(e.point.x, e.point.z); }}
          >
            <planeGeometry args={[18, 14]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
        {players && (
          <WalkersLayer players={players} seats={seats} currentUserId={currentUserId} selfName={selfName} selfAvatarUrl={selfAvatarUrl} />
        )}

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
