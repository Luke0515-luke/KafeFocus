import { useMemo } from 'react';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useCafeTextures } from './textures';
import Tables from './Tables';
import { PLANT_SPOTS } from './layout';
import PianoPlayer from './PianoPlayer';
import { usePalette } from './palette';
import { NeonDecor, NordicDecor, ZenDecor } from './ThemeDecor';
import { TreeDecor } from './TreeDecor';

const BLACK_METAL = { color: '#1b1b1d', roughness: 0.45, metalness: 0.7 };
const BRASS = { color: '#a8844f', roughness: 0.35, metalness: 0.85 };
const LEATHER = { color: '#4b2b18', roughness: 0.45 };
const WOOD = { color: '#2a1a11', roughness: 0.6 };

const ROOM = { x0: -9, x1: 9, z0: -5, z1: 9, h: 5.2 };

/* ---------- 兩面牆：後牆（磚牆／粉刷）+ 左牆（木條板） ---------- */
function Walls({ tex, theme }) {
  const depth = ROOM.z1 - ROOM.z0;
  const width = ROOM.x1 - ROOM.x0;
  const trim = { color: theme.trim, roughness: 0.6 };
  return (
    <group>
      <mesh position={[0, ROOM.h / 2, ROOM.z0]} receiveShadow>
        <boxGeometry args={[width, ROOM.h, 0.2]} />
        <meshStandardMaterial map={tex.back} roughness={0.95} />
      </mesh>
      <mesh position={[ROOM.x0, ROOM.h / 2, ROOM.z0 + depth / 2]} receiveShadow>
        <boxGeometry args={[0.2, ROOM.h, depth]} />
        <meshStandardMaterial map={tex.slats} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.09, ROOM.z0 + 0.12]}>
        <boxGeometry args={[width, 0.18, 0.06]} />
        <meshStandardMaterial {...trim} />
      </mesh>
      <mesh position={[ROOM.x0 + 0.12, 0.09, ROOM.z0 + depth / 2]}>
        <boxGeometry args={[0.06, 0.18, depth]} />
        <meshStandardMaterial {...trim} />
      </mesh>
      <mesh position={[ROOM.x0 + 0.05, ROOM.h / 2, ROOM.z0 + 0.05]}>
        <boxGeometry args={[0.22, ROOM.h, 0.22]} />
        <meshStandardMaterial {...trim} />
      </mesh>
      {theme.accent && (
        <>
          {/* 品牌色牆裙（後牆與左牆下半部）+ 白色壓條 */}
          <mesh position={[0, 0.55, ROOM.z0 + 0.14]}>
            <boxGeometry args={[width - 0.3, 1.0, 0.04]} />
            <meshStandardMaterial color={theme.accent} roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.07, ROOM.z0 + 0.15]}>
            <boxGeometry args={[width - 0.3, 0.05, 0.07]} />
            <meshStandardMaterial color="#f4f0e6" roughness={0.5} />
          </mesh>
          <mesh position={[ROOM.x0 + 0.14, 0.55, ROOM.z0 + depth / 2 + 0.1]}>
            <boxGeometry args={[0.04, 1.0, depth - 0.3]} />
            <meshStandardMaterial color={theme.accent} roughness={0.55} />
          </mesh>
          <mesh position={[ROOM.x0 + 0.15, 1.07, ROOM.z0 + depth / 2 + 0.1]}>
            <boxGeometry args={[0.07, 0.05, depth - 0.3]} />
            <meshStandardMaterial color="#f4f0e6" roughness={0.5} />
          </mesh>
        </>
      )}
    </group>
  );
}

/** 黑鐵框格子窗，外面的景色依主題而定 */
function Window({ position, rotationY = 0, w = 2.4, h = 1.8, sky }) {
  const frame = [
    [0, h / 2, w + 0.1, 0.08], [0, -h / 2, w + 0.1, 0.08], [-w / 2, 0, 0.08, h], [w / 2, 0, 0.08, h],
    [-w / 6, 0, 0.04, h], [w / 6, 0, 0.04, h], [0, -h / 6, w, 0.04], [0, h / 6, w, 0.04],
  ];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={sky} toneMapped={false} />
      </mesh>
      {frame.map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0.03]}>
          <boxGeometry args={[bw, bh, 0.07]} />
          <meshStandardMaterial {...BLACK_METAL} />
        </mesh>
      ))}
      <mesh position={[0, -h / 2 - 0.05, 0.1]}>
        <boxGeometry args={[w + 0.25, 0.06, 0.2]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
    </group>
  );
}

/** 愛迪生吊燈：黑鐵燈罩 + 燈絲燈泡；light=true 才會真的打光（控制效能） */
function PendantLamp({ position, theme, light = false, intensity = 18, big = false }) {
  const P = usePalette();
  const [color, boost] = theme.lamp;
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 2.4, 6]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <coneGeometry args={[big ? 0.34 : 0.22, 0.2, 28, 1, true]} />
        <meshStandardMaterial color={P.shade} roughness={0.5} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <sphereGeometry args={[0.055, 14, 14]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      {light && <pointLight position={[0, -0.2, 0]} color={color} intensity={intensity * boost} distance={9} decay={2} />}
    </group>
  );
}

function FairyLights({ theme }) {
  const bulbs = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const t = i / 25;
    return [-8.4 + t * 16.8, 4.95 - Math.abs(Math.sin(t * Math.PI * 4)) * 0.28, -4.82];
  }), []);
  return (
    <group>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={theme.lamp[0]} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 後牆左側：咖啡師吧台 + 菜單黑板 + 杯架 */
function BaristaCounter({ menu }) {
  const P = usePalette();
  return (
    <group position={[-6.4, 0, -4.35]}>
      <RoundedBox args={[4.6, 1.1, 0.8]} radius={0.03} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.counter} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[4.8, 0.06, 0.95]} radius={0.015} position={[0, 1.13, 0.03]} castShadow>
        <meshStandardMaterial color="#6b6258" roughness={0.25} metalness={0.2} />
      </RoundedBox>
      <RoundedBox args={[0.9, 0.5, 0.5]} radius={0.04} position={[-1.2, 1.41, -0.05]} castShadow>
        <meshStandardMaterial color="#8d8d90" roughness={0.25} metalness={0.9} />
      </RoundedBox>
      <mesh position={[-0.3, 1.35, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.1, 0.4, 16]} />
        <meshStandardMaterial {...BLACK_METAL} />
      </mesh>
      {[0.5, 1.0].map((x) => (
        <mesh key={x} position={[x, 1.26, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.1, 0.24, 16]} />
          <meshStandardMaterial color="#c9a36b" transparent opacity={0.7} roughness={0.15} />
        </mesh>
      ))}
      <mesh position={[0, 2.9, -0.43]}>
        <planeGeometry args={[2.6, 1.3]} />
        <meshBasicMaterial map={menu} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.05, -0.38]}>
        <boxGeometry args={[3.4, 0.05, 0.28]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={i} position={[-1.4 + i * 0.35, 2.13, -0.38]} castShadow>
          <cylinderGeometry args={[0.045, 0.036, 0.1, 14]} />
          <meshStandardMaterial color={i % 3 ? '#e9e2d6' : '#3a3a3c'} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

/** 立式鋼琴（靠後牆右側） */
function Piano({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.5, 1.15, 0.6]} radius={0.03} position={[0, 0.575, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#16120f" roughness={0.25} metalness={0.15} />
      </RoundedBox>
      <RoundedBox args={[1.56, 0.05, 0.66]} radius={0.02} position={[0, 1.18, 0]} castShadow>
        <meshStandardMaterial color="#16120f" roughness={0.25} metalness={0.15} />
      </RoundedBox>
      <mesh position={[0, 0.78, 0.36]} castShadow>
        <boxGeometry args={[1.32, 0.04, 0.2]} />
        <meshStandardMaterial color="#ece6da" roughness={0.4} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => ((i % 7) === 2 || (i % 7) === 6 ? null : (
        <mesh key={i} position={[-0.6 + i * 0.092, 0.805, 0.32]}>
          <boxGeometry args={[0.04, 0.03, 0.12]} />
          <meshStandardMaterial color="#0d0d0e" roughness={0.4} />
        </mesh>
      )))}
      <mesh position={[0, 1.0, 0.18]}>
        <boxGeometry args={[0.9, 0.24, 0.02]} />
        <meshStandardMaterial color="#d8cfb8" roughness={0.9} />
      </mesh>
      <group position={[0, 0, 1.0]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.2, 0.07, 20]} />
          <meshStandardMaterial {...LEATHER} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.44, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
      </group>
    </group>
  );
}

/** 矮櫃：爵士主題有黑膠唱機與喇叭，其他主題放花瓶與書 */
function Sideboard({ position, records }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.8, 0.8, 0.45]} radius={0.02} position={[0, 0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#3a2415" roughness={0.55} />
      </RoundedBox>
      {records ? (
        <group position={[0, 0.8, 0]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <boxGeometry args={[0.55, 0.07, 0.4]} />
            <meshStandardMaterial {...BLACK_METAL} />
          </mesh>
          <mesh position={[-0.05, 0.085, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 0.012, 32]} />
            <meshStandardMaterial color="#0c0c0d" roughness={0.3} />
          </mesh>
          <mesh position={[-0.05, 0.093, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.004, 16]} />
            <meshStandardMaterial color="#a8442f" />
          </mesh>
          {[-0.68, 0.68].map((x) => (
            <RoundedBox key={x} args={[0.26, 0.42, 0.26]} radius={0.02} position={[x, 0.21, 0]} castShadow>
              <meshStandardMaterial color="#1c1410" roughness={0.6} />
            </RoundedBox>
          ))}
          {[0.4, 0.45, 0.5, 0.55].map((x, i) => (
            <mesh key={x} position={[x, 0.16, 0.05 - i * 0.02]} rotation={[0, 0, -0.18 + i * 0.03]}>
              <boxGeometry args={[0.012, 0.3, 0.3]} />
              <meshStandardMaterial color={['#222', '#6b3b2a', '#2e3b4a', '#444'][i]} />
            </mesh>
          ))}
        </group>
      ) : (
        <group position={[0, 0.8, 0]}>
          <mesh position={[-0.5, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.09, 0.3, 14]} />
            <meshStandardMaterial color="#2c2622" roughness={0.5} />
          </mesh>
          {[[-0.5, 0.4, 0], [-0.44, 0.34, 0.03], [-0.56, 0.35, -0.03]].map((p, i) => (
            <mesh key={i} position={p} scale={[0.5, 1.5, 0.5]}>
              <sphereGeometry args={[0.07, 10, 10]} />
              <meshStandardMaterial color="#3b5a3a" roughness={0.8} />
            </mesh>
          ))}
          {[0.35, 0.55].map((x, i) => (
            <mesh key={x} position={[x, 0.03 + i * 0.05, 0]} castShadow>
              <boxGeometry args={[0.3, 0.05, 0.22]} />
              <meshStandardMaterial color={['#5b3a2a', '#2b3a34'][i]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

/** 後牆上方的長條層板：書與小植栽 */
function WallShelf({ position, length = 5.5 }) {
  const colors = ['#7b4a34', '#2f3a35', '#b08d57', '#2f3b4f', '#8a6a4b', '#4a5a47', '#7d4b3a'];
  const n = Math.floor(length / 0.42);
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[length, 0.05, 0.3]} />
        <meshStandardMaterial {...WOOD} />
      </mesh>
      {Array.from({ length: n }).map((_, i) => (i % 5 === 4 ? (
        <mesh key={i} position={[-length / 2 + 0.3 + i * 0.4, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.05, 0.14, 12]} />
          <meshStandardMaterial color="#3a3430" roughness={0.5} />
        </mesh>
      ) : (
        <mesh key={i} position={[-length / 2 + 0.3 + i * 0.4, 0.2, 0]} castShadow>
          <boxGeometry args={[0.18, 0.34 - (i % 3) * 0.05, 0.2]} />
          <meshStandardMaterial color={colors[i % colors.length]} roughness={0.8} />
        </mesh>
      )))}
    </group>
  );
}

function WallClock({ position }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.32, 0.32, 0.05, 40]} />
        <meshStandardMaterial color="#17120f" roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.32, 0.018, 8, 40]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0, 0.07, 0.04]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.012, 0.15, 0.006]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
      <mesh position={[0.08, 0.02, 0.04]} rotation={[0, 0, -1.7]}>
        <boxGeometry args={[0.012, 0.2, 0.006]} />
        <meshStandardMaterial {...BRASS} />
      </mesh>
    </group>
  );
}

/** 左牆邊的書櫃 */
function Bookcase({ position }) {
  const colors = ['#7b4a34', '#2f3a35', '#b08d57', '#2f3b4f', '#8a6a4b', '#4a5a47'];
  return (
    <group position={position}>
      <RoundedBox args={[0.4, 2.6, 1.8]} radius={0.02} position={[0, 1.3, 0]} castShadow>
        <meshStandardMaterial color="#3a2415" roughness={0.6} />
      </RoundedBox>
      {[0.45, 0.95, 1.45, 1.95].map((y, r) => (
        <group key={y} position={[0.1, y, 0]}>
          {Array.from({ length: 8 }).map((_, i) => (
            <mesh key={i} position={[0, 0.2, -0.75 + i * 0.2]} castShadow>
              <boxGeometry args={[0.2, 0.32 - ((i + r) % 3) * 0.04, 0.14]} />
              <meshStandardMaterial color={colors[(i + r) % colors.length]} roughness={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

/** 左牆沙發 + 立燈 */
function SofaCorner({ theme }) {
  const P = usePalette();
  return (
    <group position={[-8.15, 0, 1.4]}>
      <RoundedBox args={[0.95, 0.38, 2.3]} radius={0.06} position={[0, 0.3, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={P.sofa} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[0.3, 0.7, 2.3]} radius={0.08} position={[-0.38, 0.65, 0]} castShadow>
        <meshStandardMaterial color={P.sofa} roughness={0.45} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.95, 0.3, 0.2]} radius={0.06} position={[0, 0.55, s * 1.1]} castShadow>
          <meshStandardMaterial color={P.sofa} roughness={0.45} />
        </RoundedBox>
      ))}
      {[-0.5, 0.5].map((z) => (
        <RoundedBox key={z} args={[0.6, 0.12, 0.9]} radius={0.05} position={[0.08, 0.54, z]} castShadow>
          <meshStandardMaterial color="#5a3420" roughness={0.5} />
        </RoundedBox>
      ))}
      <group position={[0.25, 0, 1.75]}>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.6, 8]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.16, 0.18, 0.03, 20]} />
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, 1.68, 0]}>
          <cylinderGeometry args={[0.16, 0.24, 0.26, 24, 1, true]} />
          <meshStandardMaterial color="#e8c48f" emissive={theme.lamp[0]} emissiveIntensity={0.7} side={THREE.DoubleSide} />
        </mesh>
        <pointLight position={[0, 1.6, 0]} color={theme.lamp[0]} intensity={9 * theme.lamp[1]} distance={6} decay={2} />
      </group>
    </group>
  );
}

function LeftWallDecor({ art }) {
  return (
    <group position={[ROOM.x0 + 0.12, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
      {[-3.2, -1.7, 5.4, 6.9].map((z, i) => (
        <group key={z} position={[-z, 2.5, 0]}>
          <mesh>
            <boxGeometry args={[1.0, 1.25, 0.05]} />
            <meshStandardMaterial color="#120c08" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.03]}>
            <planeGeometry args={[0.86, 1.1]} />
            <meshStandardMaterial map={art[i % 3]} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 深綠大型植栽 */
function Plant({ position, scale = 1, seed = 1 }) {
  const leaves = useMemo(() => {
    let s = seed * 9301;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 16 }, () => ({
      rot: [(rnd() - 0.5) * 1.1, rnd() * Math.PI * 2, (rnd() - 0.5) * 1.1],
      y: 0.6 + rnd() * 0.9,
      color: rnd() > 0.5 ? '#2f4a33' : '#3b5a3c',
    }));
  }, [seed]);
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.5, 20]} />
        <meshStandardMaterial color="#24201d" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 1.0, 6]} />
        <meshStandardMaterial color="#3a2a1c" />
      </mesh>
      {leaves.map((l, i) => (
        <group key={i} position={[0, l.y, 0]} rotation={l.rot}>
          <mesh position={[0, 0.25, 0.12]} scale={[0.35, 1, 0.12]} castShadow>
            <sphereGeometry args={[0.28, 12, 10]} />
            <meshStandardMaterial color={l.color} roughness={0.7} side={THREE.DoubleSide} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Rug({ position, size, colors }) {
  return (
    <group position={position}>
      {[[size, colors[0], 0.011], [[size[0] - 0.4, size[1] - 0.4], colors[1], 0.013], [[size[0] - 0.8, size[1] - 0.8], colors[2], 0.015]].map(([sz, c, y], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow={i === 0}>
          <planeGeometry args={sz} />
          <meshStandardMaterial color={c} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** 原本掛綠色植栽的位置，改掛和旁邊一樣的愛迪生吊燈（只當裝飾，不打光，效能不受影響） */
const EXTRA_LAMP_SPOTS = [
  [-1.2, 3.2, 3.0], [3.2, 3.2, 6.8], [-5.5, 3.2, 0.5], [6.5, 3.2, 5.5], [-3.5, 3.2, 7.2],
];

export default function CafeDecor({ theme }) {
  const tex = useCafeTextures(theme);
  const f = theme.features;
  const dark = !theme.light;
  const tree = theme.decor === 'tree'; // 樹屋：整間店在巨大的空心樹幹裡，不用方形牆壁與窗戶
  const custom = !!theme.decor; // 有專屬擺飾的主題（neon / zen）不使用通用的鋼琴、書櫃、植栽、吊燈
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial map={tex.floor} roughness={0.55} metalness={0.05} />
      </mesh>

      {!tree && <Walls tex={tex} theme={theme} />}
      {!tree && <Window position={[-2.2, 2.7, -4.88]} sky={tex.dusk} />}
      {!tree && <Window position={[1.8, 2.7, -4.88]} sky={tex.dusk} />}
      {!tree && <Window position={[5.2, 2.7, -4.88]} sky={tex.dusk} />}
      {!tree && <Window position={[-8.88, 2.6, 3.0]} rotationY={Math.PI / 2} w={2.6} sky={tex.dusk} />}
      {tree && <TreeDecor />}
      {!custom && <FairyLights theme={theme} />}
      {!custom && <WallClock position={[-0.2, 3.0, -4.84]} />}
      {!custom && <WallShelf position={[3.5, 4.35, -4.7]} length={5.5} />}
      {!custom && <WallShelf position={[-6.4, 4.3, -4.7]} length={3.6} />}
      {theme.decor === 'neon' && <NeonDecor />}
      {theme.decor === 'zen' && <ZenDecor />}
      {theme.decor === 'nordic' && <NordicDecor />}
      <BaristaCounter menu={tex.menu} />
      {!custom && <Sideboard position={[-2.2, 0, -4.55]} records={f.records} />}
      {f.piano && <Piano position={[8.0, 0, -4.55]} />}
      {f.piano && <PianoPlayer position={[8.0, 0, -4.55]} />}
      {!custom && <LeftWallDecor art={tex.art} />}
      {!custom && <Bookcase position={[-8.6, 0, 7.6]} />}
      {theme.decor !== 'zen' && <SofaCorner theme={theme} />}

      <Rug position={[-5.6, 0, 5.0]} size={[4.2, 3.2]} colors={theme.rugs?.[0] ?? (dark ? ['#4a1f1c', '#5b2a22', '#3a2a22'] : ['#a8756a', '#c08a7c', '#d8c3a8'])} />
      <Rug position={[1.0, 0, 1.0]} size={[5.4, 3.6]} colors={theme.rugs?.[1] ?? (dark ? ['#2b2622', '#3a322c', '#241f1c'] : ['#8d7c68', '#a89580', '#cdbba2'])} />
      <Tables textures={tex} />

      {!custom && PLANT_SPOTS.slice(0, f.plants).map(([x, y, z, sc], i) => <Plant key={i} position={[x, y, z]} scale={sc} seed={i + 1} />)}
      {!custom && EXTRA_LAMP_SPOTS.slice(0, f.hanging).map((p) => <PendantLamp key={p.join()} position={p} theme={theme} />)}

      {!custom && (
        <>
      {/* 吊燈：每個桌區各一盞；只有 6 盞會真的打光 */}
      <PendantLamp position={[1.5, 3.0, -3.8]} theme={theme} />
      <PendantLamp position={[3.5, 3.0, -3.8]} theme={theme} light intensity={20} />
      <PendantLamp position={[5.5, 3.0, -3.8]} theme={theme} />
      <PendantLamp position={[1.0, 3.2, 1.0]} theme={theme} light intensity={26} big />
      <PendantLamp position={[5.5, 3.2, 4.0]} theme={theme} light intensity={16} />
      <PendantLamp position={[0.8, 3.2, 5.2]} theme={theme} light intensity={16} />
      <PendantLamp position={[7.6, 3.2, 1.5]} theme={theme} light intensity={12} />
      <PendantLamp position={[-3.0, 3.2, 1.0]} theme={theme} />
      <PendantLamp position={[-3.0, 3.2, 4.0]} theme={theme} />
      <PendantLamp position={[-7.0, 3.0, -2.0]} theme={theme} />
        </>
      )}
    </group>
  );
}
