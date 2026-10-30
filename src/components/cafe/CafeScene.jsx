import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import CafeDecor from './CafeDecor';
import Seat3D from './Seat3D';
import UserAvatar3D, { preloadAvatar } from './UserAvatar3D';
import WalkersLayer from './WalkersLayer';
import { THEMES } from '../../config/themes';
import { PaletteContext, makePalette } from './palette';
import { TREE, UpperFloorClickPlane, StairClickZones } from './TreeDecor';
import { FLOOR2_Y, seatFloorY } from './layout';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const HOME = { cam: [3, 8.5, 12.5], target: [0, 0.9, 1.2] };
// 視角可以平移的範圍（目標點）；「跟隨我」時範圍放大到整個店內
const BOUNDS = {
  room: { free: { x0: -6, x1: 6, z0: -2, z1: 6.5 }, follow: { x0: -8, x1: 8, z0: -4, z1: 8.5 } },
  // 樹屋：整個一樓（半徑 12 的圓）加上二樓樹枝咖啡廳都能看到
  tree: { free: { x0: -13, x1: 13, z0: -10, z1: 14 }, follow: { x0: -13, x1: 13, z0: -10, z1: 14 } },
};

/**
 * 視角控制：自由平移（滑鼠右鍵 / 雙指拖曳）、跟隨我（鏡頭跟著自己的角色或座位）、回到中央。
 * 目標點被限制在店內，避免跑出場景。
 */
function CameraRig({ mode, tree, resetKey, selfRef, showMe, seats, currentUserId, viewLevel }) {
  const controls = useThree((s) => s.controls);
  const camera = useThree((s) => s.camera);
  const first = useRef(true);
  const snap = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    camera.position.set(...HOME.cam);
    if (controls) { controls.target.set(...HOME.target); controls.update(); }
    snap.current = true; // 回中央後，如果是跟隨模式會立刻回到自己身上
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    if (!controls) return;
    const t = controls.target;
    let goalY = tree ? HOME.target[1] : null;  // 樹屋：視角中心的高度（一樓 / 二樓）
    if (mode === 'follow') {
      let sx; let sz; let sy = 0;
      if (showMe && selfRef?.current) { sx = selfRef.current.x; sz = selfRef.current.z; sy = selfRef.current.y ?? 0; } else {
        const seat = seats.find((x) => x.occupant_id && x.occupant_id === currentUserId);
        if (seat) { sx = seat.pos_x; sz = seat.pos_z; sy = seatFloorY(seat); }
      }
      if (sx !== undefined) {
        const k = snap.current ? 1 : 0.08; // 剛進場時直接把視角中心放到自己身上
        snap.current = false;
        const dx = (sx - t.x) * k; const dz = (sz - t.z) * k;
        t.x += dx; t.z += dz; camera.position.x += dx; camera.position.z += dz;
        if (tree) goalY = HOME.target[1] + sy; // 在二樓時，視角中心跟著升高
      }
    } else if (tree && viewLevel === 2) {
      goalY = HOME.target[1] + FLOOR2_Y;       // 自由移動：手動看二樓
    }
    if (tree && goalY !== null) {
      const dy = (goalY - t.y) * 0.1;
      if (Math.abs(goalY - t.y) < 0.002) { camera.position.y += goalY - t.y; t.y = goalY; } else { t.y += dy; camera.position.y += dy; }
    }
    const b = BOUNDS[tree ? 'tree' : 'room'][mode === 'follow' ? 'follow' : 'free'];
    const cx = clamp(t.x, b.x0, b.x1); const cz = clamp(t.z, b.z0, b.z1);
    if (cx !== t.x || cz !== t.z) { camera.position.x += cx - t.x; camera.position.z += cz - t.z; t.x = cx; t.z = cz; }
    if (!tree) t.y = HOME.target[1];
    if (tree) { // 樹屋：鏡頭不能穿出樹幹
      const ox = camera.position.x - TREE.cx; const oz = camera.position.z - TREE.cz; const d = Math.hypot(ox, oz); const max = TREE.R - 1;
      if (d > max) { camera.position.x = TREE.cx + (ox / d) * max; camera.position.z = TREE.cz + (oz / d) * max; }
    }
  });
  return null;
}


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
  const palette = useMemo(() => makePalette({ ...theme.palette, furniture: theme.furniture ?? null }), [theme]);

  const tree = theme.decor === 'tree';
  const [camMode, setCamMode] = useState('follow'); // follow（預設：視角中心跟著自己的角色）| free
  const [resetKey, setResetKey] = useState(0);
  const [viewLevel, setViewLevel] = useState(1); // 樹屋「自由移動」時看一樓 / 二樓
  const pill = (on) => `rounded-full px-3 py-1.5 text-xs font-medium transition ${on ? 'bg-amber-500 text-stone-900' : 'text-stone-200 hover:bg-stone-700'}`;

  return (
    <div className={`relative ${className ?? 'h-full w-full'}`}>
      <Canvas shadows dpr={[1, 2]} camera={{ position: HOME.cam, fov: 45 }} gl={{ antialias: true }}>
        <color attach="background" args={[theme.bg]} />
        <fog attach="fog" args={[theme.bg, theme.fog[0], theme.fog[1]]} />
        <PaletteContext.Provider value={palette}>
        <Lights theme={theme} />
        <CafeDecor theme={theme} />

        {seats.map((seat) => (
          <group key={seat.id}>
            <Seat3D seat={seat} occupied={!!seat.occupant_id} onSelect={onSeatSelect} />
            {seat.occupant_id && (
              <UserAvatar3D seat={seat} isSelf={seat.occupant_id === currentUserId} bubble={players?.bubbles?.[seat.occupant_id]} outfit={players?.outfits?.[seat.occupant_id]} />
            )}
          </group>
        ))}

        {/* 看不見的地板：點一下就走過去（拖曳轉鏡頭時 delta 很大，不算點擊） */}
        {onFloorClick && (
          <mesh
            rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2]}
            onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onFloorClick(e.point.x, e.point.z, 0); }}
          >
            {/* 樹屋整個一樓（半徑 12 的圓）都能點；其他咖啡廳是 18 × 14 的室內 */}
            <planeGeometry args={tree ? [26, 26] : [18, 14]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
        {/* 樹屋二樓（樹枝咖啡廳）的地板：點下去會自動走上樓梯 */}
        {onFloorClick && tree && <UpperFloorClickPlane onFloorClick={onFloorClick} />}
        {onFloorClick && tree && <StairClickZones onFloorClick={onFloorClick} meRef={players?.meRef} />}
        {players && (
          <WalkersLayer players={players} seats={seats} currentUserId={currentUserId} selfName={selfName} selfAvatarUrl={selfAvatarUrl} />
        )}

        </PaletteContext.Provider>

        {/* 方形咖啡廳的左牆與後牆是實心的，所以限制鏡頭不能繞到牆後面；樹屋是圓形樹洞，可以整圈繞 */}
        <OrbitControls
          makeDefault
          enablePan={camMode === 'free'}
          screenSpacePanning={false}
          target={HOME.target}
          minDistance={tree ? 3 : 4}
          maxDistance={tree ? 11 : 16}
          maxPolarAngle={tree ? Math.PI / 2.05 : Math.PI / 2.15}
          {...(tree ? {} : { minAzimuthAngle: -Math.PI / 6, maxAzimuthAngle: Math.PI / 3 })}
        />
        <CameraRig
          mode={camMode} tree={tree} resetKey={resetKey} selfRef={players?.meRef} showMe={!!players?.showMe}
          seats={seats} currentUserId={currentUserId} viewLevel={viewLevel}
        />
      </Canvas>
      <div className="absolute right-2 top-2 z-20 flex max-w-[calc(100vw-1rem)] flex-col items-end gap-1">
        <div className="flex items-center gap-0.5 rounded-full bg-stone-900/85 p-1 ring-1 ring-stone-700" role="group" aria-label="視角">
          <button type="button" onClick={() => { setCamMode('free'); if (tree) setViewLevel((players?.meRef?.current?.y ?? 0) > FLOOR2_Y / 2 ? 2 : 1); }} className={pill(camMode === 'free')} aria-pressed={camMode === 'free'}>自由移動</button>
          <button type="button" onClick={() => setCamMode('follow')} className={pill(camMode === 'follow')} aria-pressed={camMode === 'follow'}>跟隨我</button>
          <button type="button" onClick={() => setResetKey((k) => k + 1)} className={pill(false)}>重設視角</button>
        </div>
        {tree && (
          <div className="flex items-center gap-0.5 rounded-full bg-stone-900/85 p-1 ring-1 ring-stone-700" role="group" aria-label="樓層">
            <button type="button" onClick={() => { setCamMode('free'); setViewLevel(1); }} className={pill(camMode === 'free' && viewLevel === 1)}>看一樓</button>
            <button type="button" onClick={() => { setCamMode('free'); setViewLevel(2); }} className={pill(camMode === 'free' && viewLevel === 2)}>看二樓</button>
          </div>
        )}
        <p className="rounded-lg bg-stone-900/70 px-2 py-1 text-[10px] text-stone-400">{camMode === 'follow' ? '視角中心會跟著你的角色・拖曳旋轉・滾輪縮放' : '拖曳旋轉・滾輪縮放・右鍵 / 雙指拖曳平移'}</p>
      </div>
    </div>
  );
}
