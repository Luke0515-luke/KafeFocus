import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  TREE, FLOOR2_Y, GROUND_R, UPPER, STAIR, STAIR_STEPS, STAIR_MOUTH, STAIR_TOP, UPPER_TABLES, BRANCH, BRANCH_ROOMS, BARK_PHIS,
  polar, rngFactory, mushroomSpots,
} from './treeLayout';

/**
 * 樹屋咖啡廳（奇妙仙子的樹洞風格）：整間店位在一棵巨大空心樹幹的裡面。
 * 圓形樹幹內壁（半徑 16、高 46）+ 苔蘚地面 + 木頭平台 + 圓形窗洞 + 精靈小門 + 螺旋樹梯 +
 * 樹根 + 發光的巨大蘑菇 + 吊燈籠 + 螢火蟲 + 頭頂的光束。
 * 咖啡廳的桌椅在原本的 18 × 14 木頭平台上（座位座標不變），整個苔蘚地面（半徑 12）都可以走動。
 *
 * 二樓「樹枝咖啡廳」：螺旋樓梯的前 9 階通到貼著樹壁的一圈中空圓弧平台（高度 FLOOR2_Y，中間看得到一樓）；
 * 平台外側的樹壁上有 4 個圓拱通道，各通往一整條長在樹幹外面的空心大樹枝（樹枝咖啡廳，每條 7 張圓桌、16 個座位，
 * 座標在 layout.js 的 UPPER_SEAT_LAYOUT），樹枝的樹皮牆上有圓窗，窗外是森林；另有 4 個圓拱被樹皮封住。
 * 幾何資料（樓梯、平台、通道、蘑菇）在 treeLayout.js，nav.js 也用同一份資料做尋路。
 */
export { TREE };

// 讓平面的正面朝向樹幹中心
const faceCenter = (x, z) => Math.atan2(TREE.cx - x, TREE.cz - z);
const rad = (deg) => (deg * Math.PI) / 180;

function useCanvasTexture(draw, w, h, repeat) {
  return useMemo(() => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------------- 材質貼圖 ---------------- */
function drawBark(g, W, H) {
  const rnd = rngFactory(7);
  g.fillStyle = '#3b2717'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 170; i += 1) {
    const x = rnd() * W; const w = 3 + rnd() * 12;
    const l = 14 + rnd() * 22;
    g.strokeStyle = `hsl(${22 + rnd() * 8},${35 + rnd() * 15}%,${l}%)`;
    g.lineWidth = w; g.globalAlpha = 0.55 + rnd() * 0.4;
    g.beginPath(); g.moveTo(x, 0);
    let cx = x;
    for (let y = 0; y < H; y += 40) { cx += (rnd() - 0.5) * 16; g.lineTo(cx, y + 40); }
    g.stroke();
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 9; i += 1) { // 樹瘤
    const x = rnd() * W; const y = rnd() * H; const r = 10 + rnd() * 20;
    const k = g.createRadialGradient(x, y, 2, x, y, r);
    k.addColorStop(0, '#1d1209'); k.addColorStop(1, 'rgba(59,39,23,0)');
    g.fillStyle = k; g.beginPath(); g.ellipse(x, y, r * 0.7, r * 1.3, 0, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 40; i += 1) { // 苔蘚斑點
    g.fillStyle = `rgba(${70 + rnd() * 30},${120 + rnd() * 40},${60 + rnd() * 30},${0.12 + rnd() * 0.2})`;
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 6 + rnd() * 18, 0, Math.PI * 2); g.fill();
  }
}

function drawMoss(g, W, H) {
  const rnd = rngFactory(11);
  g.fillStyle = '#25472b'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 520; i += 1) {
    g.fillStyle = `rgba(${40 + rnd() * 50},${90 + rnd() * 80},${40 + rnd() * 40},${0.25 + rnd() * 0.4})`;
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 3 + rnd() * 14, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 60; i += 1) { // 小花
    g.fillStyle = ['#ffe6a8', '#ffc4e0', '#c9f0ff'][i % 3];
    g.beginPath(); g.arc(rnd() * W, rnd() * H, 1.6 + rnd() * 1.6, 0, Math.PI * 2); g.fill();
  }
}

// 窗外：黃昏的魔法森林（青綠漸層 + 光點 + 遠方樹影）
function drawFairySky(g, W, H) {
  const rnd = rngFactory(5);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#16334a'); grad.addColorStop(0.55, '#3a8574'); grad.addColorStop(1, '#bff0b4');
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i += 1) {
    const x = rnd() * W; const y = rnd() * H * 0.8; const r = 5 + rnd() * 16;
    const b = g.createRadialGradient(x, y, 0, x, y, r);
    b.addColorStop(0, `rgba(230,255,200,${0.35 + rnd() * 0.4})`); b.addColorStop(1, 'rgba(230,255,200,0)');
    g.fillStyle = b; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = 'rgba(14,40,34,0.85)';
  for (let i = 0; i < 9; i += 1) {
    const x = (i / 9) * W + rnd() * 18; const th = H * (0.25 + rnd() * 0.3);
    g.beginPath(); g.moveTo(x, H); g.lineTo(x + 14, H - th); g.lineTo(x + 30, H); g.fill();
    g.beginPath(); g.ellipse(x + 14, H - th, 20 + rnd() * 10, 14, 0, 0, Math.PI * 2); g.fill();
  }
}

function drawDot(g, W, H) {
  const k = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
  k.addColorStop(0, 'rgba(255,255,255,1)'); k.addColorStop(0.35, 'rgba(255,255,255,0.55)'); k.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = k; g.fillRect(0, 0, W, H);
}

/* ---------------- 樹幹內壁 + 地面 + 頭頂光束 ---------------- */
function Trunk() {
  const bark = useCanvasTexture(drawBark, 512, 512, [12, 5]);
  const moss = useCanvasTexture(drawMoss, 512, 512, [7, 7]);
  // 樹壁上的洞口：alphaMap 白色 = 不透明、黑色 = 挖掉。圓柱的 u 對應角度（θ = 90° − φ），v 對應高度（樹幹從 y = -2 到 H-2）
  const holes = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#000';
    const rx = (1.6 / (2 * Math.PI * TREE.R)) * W; const ry = (1.6 / TREE.H) * H;
    BRANCH_ROOMS.forEach((b) => {
      const u = ((((90 - b.phi) % 360) + 360) % 360) / 360;
      const v = (FLOOR2_Y + 1.2 + 2) / TREE.H;
      [-W, 0, W].forEach((dx) => { g.beginPath(); g.ellipse(u * W + dx, (1 - v) * H, rx, ry, 0, 0, Math.PI * 2); g.fill(); });
    });
  }, 2048, 1024);
  return (
    <group>
      <mesh position={[TREE.cx, TREE.H / 2 - 2, TREE.cz]}>
        <cylinderGeometry args={[TREE.R, TREE.R, TREE.H, 72, 1, true]} />
        <meshStandardMaterial map={bark} alphaMap={holes} alphaTest={0.5} side={THREE.BackSide} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TREE.cx, -0.03, TREE.cz]} receiveShadow>
        <circleGeometry args={[TREE.R, 64]} />
        <meshStandardMaterial map={moss} roughness={1} />
      </mesh>
      {/* 木頭平台的邊框 */}
      {[[0, -5.05, 18.6, 0.3], [0, 9.05, 18.6, 0.3], [-9.05, 2, 0.3, 14.6], [9.05, 2, 0.3, 14.6]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, -0.12, z]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.3, d]} />
          <meshStandardMaterial color="#4a3320" roughness={0.9} />
        </mesh>
      ))}
      {/* 頭頂的樹冠開口：發光圓盤 + 幾道光束 */}
      <mesh position={[TREE.cx, TREE.H - 2.2, TREE.cz]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[9, 40]} />
        <meshBasicMaterial color="#e6ffd0" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {[[2, -3, 0.16, -0.1], [-4, 2, 0.12, 0.08], [5, 5, 0.1, -0.05]].map(([x, z, tilt, tz], i) => (
        <mesh key={i} position={[TREE.cx + x, 21, TREE.cz + z]} rotation={[tilt, 0, tz]}>
          <cylinderGeometry args={[0.8, 5.5, 42, 28, 1, true]} />
          <meshBasicMaterial color="#fff3b8" transparent opacity={0.055} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- 圓形窗洞 + 精靈小門 ---------------- */
function RoundWindow({ phi, y, r }) {
  const sky = useCanvasTexture(drawFairySky, 256, 256);
  const [x, , z] = polar(phi, TREE.R - 0.12, y);
  return (
    <group position={[x, y, z]} rotation={[0, faceCenter(x, z), 0]}>
      <mesh><circleGeometry args={[r, 40]} /><meshBasicMaterial map={sky} toneMapped={false} /></mesh>
      <mesh><torusGeometry args={[r, 0.16, 10, 44]} /><meshStandardMaterial color="#5a3a20" roughness={0.85} /></mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} rotation={[0, 0, (i * Math.PI) / 3]}><boxGeometry args={[r * 2, 0.07, 0.07]} /><meshStandardMaterial color="#5a3a20" roughness={0.85} /></mesh>
      ))}
    </group>
  );
}

function FairyDoor() {
  const [x, , z] = polar(270, TREE.R - 0.15, 3.4);
  return (
    <group position={[x, 0, z]} rotation={[0, faceCenter(x, z), 0]}>
      <mesh position={[0, 3.4, 0]} scale={[1, 1.55, 1]}><circleGeometry args={[2.1, 40]} /><meshBasicMaterial color="#ffd991" toneMapped={false} /></mesh>
      <mesh position={[0, 3.4, 0.02]} scale={[1, 1.55, 1]}><circleGeometry args={[1.75, 40]} /><meshStandardMaterial color="#8a5a2c" roughness={0.8} /></mesh>
      <mesh position={[0, 3.4, 0.05]} scale={[1, 1.55, 1]}><torusGeometry args={[2.1, 0.2, 10, 44]} /><meshStandardMaterial color="#3d2815" roughness={0.9} /></mesh>
      {[-0.9, 0.9].map((dx) => (
        <mesh key={dx} position={[dx * 0.5, 3.4, 0.08]}><boxGeometry args={[0.07, 5, 0.04]} /><meshStandardMaterial color="#5a3a1c" roughness={0.9} /></mesh>
      ))}
      <mesh position={[1.1, 3.0, 0.14]}><sphereGeometry args={[0.13, 14, 14]} /><meshStandardMaterial color="#e6c15a" metalness={0.8} roughness={0.3} /></mesh>
      <pointLight position={[0, 3, 2.5]} color="#ffcf80" intensity={9} distance={11} decay={2} />
    </group>
  );
}

/* ---------------- 螺旋樹梯（沿著左側樹壁往上盤旋，現在通到二樓） ---------------- */
function Stairs() {
  const rail = useMemo(() => {
    const rr = STAIR.r - STAIR.w / 2 + 0.12;           // 扶手在樓梯靠樹心的那一側
    const pts = STAIR_STEPS.map((s) => new THREE.Vector3(...polar(s.phi, rr, s.y + 1.0)));
    const [tx, , tz] = polar(STAIR.phi0 + STAIR.count * STAIR.dphi, rr);
    pts.push(new THREE.Vector3(tx, FLOOR2_Y + 1.0, tz));
    return { curve: new THREE.CatmullRomCurve3(pts), rr };
  }, []);
  return (
    <group>
      {STAIR_STEPS.map((s) => {
        const [x, , z] = polar(s.phi, STAIR.r);
        // 踏面頂端 = s.y（方塊厚 0.22，所以中心比踏面低 0.11）
        return (
          <mesh key={s.i} position={[x, s.y - 0.11, z]} rotation={[0, -rad(s.phi), 0]} castShadow receiveShadow>
            <boxGeometry args={[STAIR.w, 0.22, 1.5]} />
            <meshStandardMaterial color={s.i % 2 ? '#6a4a2a' : '#5e4125'} roughness={0.9} />
          </mesh>
        );
      })}
      {/* 扶手：每階一根立柱 + 一條沿著樓梯的扶手 */}
      {STAIR_STEPS.map((s) => {
        const [x, , z] = polar(s.phi, rail.rr);
        return (
          <mesh key={`p${s.i}`} position={[x, s.y + 0.5, z]} castShadow>
            <cylinderGeometry args={[0.04, 0.05, 1.0, 6]} />
            <meshStandardMaterial color="#4a3320" roughness={0.9} />
          </mesh>
        );
      })}
      <mesh castShadow>
        <tubeGeometry args={[rail.curve, 40, 0.055, 6, false]} />
        <meshStandardMaterial color="#5a3d22" roughness={0.85} />
      </mesh>
    </group>
  );
}

/* ---------------- 樹根 ---------------- */
function Roots() {
  const roots = useMemo(() => {
    const rnd = rngFactory(31);
    return Array.from({ length: 16 }, (_, i) => {
      const phi = (i / 16) * 360 + rnd() * 10;
      const a = (phi * Math.PI) / 180; const tw = (rnd() - 0.5) * 0.5;
      const pt = (r, y, off = 0) => new THREE.Vector3(TREE.cx + Math.cos(a + off) * r, y, TREE.cz + Math.sin(a + off) * r);
      const curve = new THREE.CatmullRomCurve3([pt(TREE.R - 0.3, 5 + rnd() * 3), pt(TREE.R - 1.1, 2.2, tw * 0.3), pt(TREE.R - 2.3, 0.45, tw), pt(TREE.R - 3.7, 0.12, tw * 1.4)]);
      return { curve, r: 0.35 + rnd() * 0.35 };
    });
  }, []);
  return (
    <group>
      {roots.map((r, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[r.curve, 24, r.r, 8, false]} />
          <meshStandardMaterial color="#4a3120" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- 發光的巨大蘑菇 ---------------- */
const MUSH = [['#4de3ff', '#9ff3ff'], ['#ff7ad0', '#ffb8e6'], ['#ffb347', '#ffd9a0'], ['#8dff8a', '#c8ffc6']];
function Mushroom({ position, s = 1, c }) {
  return (
    <group position={position} scale={s}>
      <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 1.1, 12]} /><meshStandardMaterial color="#efe3c8" roughness={0.8} /></mesh>
      <mesh position={[0, 1.1, 0]} scale={[1, 0.62, 1]} castShadow>
        <sphereGeometry args={[0.85, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={c[0]} emissive={c[0]} emissiveIntensity={0.9} roughness={0.5} />
      </mesh>
      {[[0.3, 1.5, 0.25], [-0.35, 1.42, -0.1], [0.05, 1.58, -0.38], [-0.1, 1.5, 0.45]].map((p, i) => (
        <mesh key={i} position={p}><sphereGeometry args={[0.09, 8, 8]} /><meshBasicMaterial color={c[1]} toneMapped={false} /></mesh>
      ))}
    </group>
  );
}

function Mushrooms() {
  const list = useMemo(() => mushroomSpots().map((m) => ({ p: m.p, s: m.s, c: MUSH[m.c] })), []);
  return <group>{list.map((m, i) => <Mushroom key={i} position={m.p} s={m.s} c={m.c} />)}</group>;
}

/* ---------------- 吊燈籠（四盞真的會打光） ---------------- */
const LANTERNS = [[-4.5, 6.2, -1.5], [3.5, 7.4, -2.5], [7.5, 5.6, 4.5], [-6.5, 6.8, 5.5], [0.5, 8.4, 3.0], [-1, 5.2, 7.5], [5, 6.2, 8.2]];
function Lanterns() {
  return (
    <group>
      {LANTERNS.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 14, 0]}><cylinderGeometry args={[0.02, 0.02, 28, 5]} /><meshStandardMaterial color="#2a4a2a" roughness={1} /></mesh>
          <mesh scale={[1, 1.25, 1]}><sphereGeometry args={[0.36, 18, 14]} /><meshBasicMaterial color={i % 2 ? '#ffe6a0' : '#ffd27a'} toneMapped={false} /></mesh>
          <mesh position={[0, 0.5, 0]}><coneGeometry args={[0.28, 0.3, 8]} /><meshStandardMaterial color="#3d6a3a" roughness={0.8} /></mesh>
          {i < 4 && <pointLight color="#ffd68a" intensity={16} distance={10} decay={2} />}
        </group>
      ))}
    </group>
  );
}

/* ---------------- 螢火蟲 ---------------- */
function Fireflies({ count = 90 }) {
  const ref = useRef();
  const dot = useCanvasTexture(drawDot, 64, 64);
  const seeds = useMemo(() => {
    const rnd = rngFactory(99);
    return Array.from({ length: count }, () => ({
      x: -13 + rnd() * 26, y: 0.8 + rnd() * 12, z: -10 + rnd() * 24, ph: rnd() * 6.28, sp: 0.2 + rnd() * 0.5, am: 0.4 + rnd() * 0.9,
    }));
  }, [count]);
  const positions = useMemo(() => new Float32Array(count * 3), [count]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    seeds.forEach((s, i) => {
      positions[i * 3] = s.x + Math.sin(t * s.sp + s.ph) * s.am;
      positions[i * 3 + 1] = s.y + Math.sin(t * s.sp * 1.3 + s.ph * 2) * s.am * 0.7;
      positions[i * 3 + 2] = s.z + Math.cos(t * s.sp + s.ph) * s.am;
    });
    if (ref.current) ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} /></bufferGeometry>
      <pointsMaterial map={dot} size={0.32} color="#e4ff9e" transparent depthWrite={false} blending={THREE.AdditiveBlending} sizeAttenuation toneMapped={false} />
    </points>
  );
}

/* ---------------- 吧台後面的木牆板（掛菜單） ---------------- */
function CounterBacking() {
  return (
    <group position={[-6.4, 0, -4.9]}>
      <mesh position={[0, 2.3, 0]} castShadow receiveShadow><boxGeometry args={[5.4, 4.6, 0.25]} /><meshStandardMaterial color="#5a3d22" roughness={0.9} /></mesh>
      <mesh position={[0, 4.75, 0.05]}><boxGeometry args={[5.8, 0.3, 0.5]} /><meshStandardMaterial color="#3d2815" roughness={0.9} /></mesh>
    </group>
  );
}

/* =====================================================================================
 * 二樓：樹枝咖啡廳
 * ===================================================================================== */

/** 扇形（環狀的一段）的 Shape：x = r·cosφ，y = -r·sinφ，旋轉 -90° 躺平後剛好對到世界座標 (cx + r·cosφ, cz + r·sinφ) */
function sectorShape(ri, ro, phi0, phi1, steps = 48) {
  const sh = new THREE.Shape();
  const pt = (phi, r) => [Math.cos(rad(phi)) * r, -Math.sin(rad(phi)) * r];
  const at = (k) => phi0 + ((phi1 - phi0) * k) / steps;
  sh.moveTo(...pt(phi0, ro));
  for (let k = 1; k <= steps; k += 1) sh.lineTo(...pt(at(k), ro));
  for (let k = steps; k >= 0; k -= 1) sh.lineTo(...pt(at(k), ri));
  sh.closePath();
  return sh;
}

function drawPlanks(g, W, H) {
  const rnd = rngFactory(41);
  g.fillStyle = '#7c5a36'; g.fillRect(0, 0, W, H);
  const n = 8; const ph = H / n;
  for (let i = 0; i < n; i += 1) {
    const l = 30 + rnd() * 9;
    g.fillStyle = `hsl(${28 + rnd() * 6},${38 + rnd() * 10}%,${l}%)`;
    g.fillRect(0, i * ph, W, ph - 2);
    g.strokeStyle = 'rgba(40,24,12,0.25)'; g.lineWidth = 1;
    for (let k = 0; k < 5; k += 1) { // 木紋
      const y = i * ph + 3 + rnd() * (ph - 8);
      g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(W * 0.3, y + (rnd() - 0.5) * 4, W * 0.6, y + (rnd() - 0.5) * 4, W, y); g.stroke();
    }
    g.fillStyle = 'rgba(30,18,8,0.55)'; g.fillRect(0, i * ph + ph - 2, W, 2);                 // 板縫
    g.fillStyle = 'rgba(30,18,8,0.5)'; g.fillRect(rnd() * W, i * ph, 2, ph - 2);              // 接縫
  }
}

function drawSign(g, W, H) {
  const rnd = rngFactory(63);
  g.fillStyle = '#5a3d22'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i += 1) {
    g.strokeStyle = `rgba(${30 + rnd() * 40},${18 + rnd() * 25},8,${0.15 + rnd() * 0.25})`; g.lineWidth = 1 + rnd() * 2;
    const y = rnd() * H; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y + (rnd() - 0.5) * 10); g.stroke();
  }
  g.strokeStyle = '#2f1d0e'; g.lineWidth = 8; g.strokeRect(8, 8, W - 16, H - 16);
  g.textAlign = 'center'; g.fillStyle = '#ffe9b0';
  g.font = 'bold 74px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  g.fillText('二樓・樹枝咖啡廳', W / 2, 118);
  g.font = '44px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
  g.fillStyle = '#c9f0b8';
  g.fillText('沿著樹梯往上走  ↗', W / 2, 196);
}

/** 一圈中空的圓弧木平台 + 底下撐住平台的粗樹枝 + 平台下面的假陰影 */
function UpperDeck() {
  const planks = useCanvasTexture(drawPlanks, 256, 256, [0.5, 0.5]);
  const deckGeo = useMemo(
    () => new THREE.ExtrudeGeometry(sectorShape(UPPER.ri, UPPER.ro + 0.15, UPPER.phi0, UPPER.phi1, 160), { depth: UPPER.thick, bevelEnabled: false }),
    [],
  );
  const shadowGeo = useMemo(() => new THREE.ShapeGeometry(sectorShape(UPPER.ri - 0.6, UPPER.ro, UPPER.phi0 - 4, UPPER.phi1 + 3, 160)), []);
  const beams = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const phi = UPPER.phi0 + 12 + i * 33;
    const wob = i % 2 ? 1.5 : -1.5;
    const v = (r, y, off = 0) => new THREE.Vector3(...polar(phi + off, r, y));
    return new THREE.CatmullRomCurve3([
      v(UPPER.ro + 0.3, FLOOR2_Y - 3.0), v(UPPER.ro - 1.1, FLOOR2_Y - 1.7, wob * 0.4),
      v(UPPER.ro - 2.8, FLOOR2_Y - 0.8, wob * 0.7), v(UPPER.ri + 0.6, FLOOR2_Y - UPPER.thick - 0.02, wob),
    ]);
  }), []);
  return (
    <group>
      <mesh geometry={deckGeo} position={[TREE.cx, FLOOR2_Y - UPPER.thick, TREE.cz]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial attach="material-0" map={planks} roughness={0.85} />
        <meshStandardMaterial attach="material-1" color="#4a3320" roughness={0.95} />
      </mesh>
      {beams.map((c, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[c, 24, 0.24, 8, false]} />
          <meshStandardMaterial color="#4a3120" roughness={1} />
        </mesh>
      ))}
      {/* 平台底下的暗影（靠貼圖假裝，不吃陰影貼圖的範圍限制） */}
      <mesh geometry={shadowGeo} rotation={[-Math.PI / 2, 0, 0]} position={[TREE.cx, 0.045, TREE.cz]}>
        <meshBasicMaterial color="#000000" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

/** 二樓地板的點擊區（透明）：環形平台 + 通道 + 樹枝。點到就走過去，不在二樓會先走上樓梯。由 CafeScene 放進場景。 */
export function UpperFloorClickPlane({ onFloorClick }) {
  const ringGeo = useMemo(() => new THREE.ShapeGeometry(sectorShape(UPPER.ri, UPPER.ro, UPPER.phi0, UPPER.phi1, 160)), []);
  const click = (e) => { if (e.delta > 6) return; e.stopPropagation(); onFloorClick(e.point.x, e.point.z, FLOOR2_Y); };
  const y = FLOOR2_Y + 0.02;
  const passA = UPPER.ro - 0.6; const passB = BRANCH.hallStart + 0.6;
  const hallLen = BRANCH.hallEnd - BRANCH.hallStart;
  const mat = <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />;
  return (
    <group>
      <mesh geometry={ringGeo} rotation={[-Math.PI / 2, 0, 0]} position={[TREE.cx, y, TREE.cz]} onClick={click}>{mat}</mesh>
      {BRANCH_ROOMS.map((b) => (
        <group key={b.k} position={[TREE.cx, y, TREE.cz]} rotation={[0, Math.PI / 2 - rad(b.phi), 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (passA + passB) / 2]} onClick={click}>
            <planeGeometry args={[BRANCH.passHalf * 2, passB - passA]} />{mat}
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, BRANCH.hallStart + hallLen / 2]} onClick={click}>
            <planeGeometry args={[BRANCH.hallHalf * 2, hallLen]} />{mat}
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, BRANCH.hallEnd]} onClick={click}>
            <circleGeometry args={[BRANCH.hallHalf, 40]} />{mat}
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 樓梯的點擊區（透明、比踏面大一圈）：點樓梯 = 上樓（人在二樓就是下樓）。
 * 樓梯在一樓可走範圍之外，所以一定要靠這個才點得到。由 CafeScene 放進場景。
 */
export function StairClickZones({ onFloorClick, meRef }) {
  const go = (e) => {
    if (e.delta > 6) return;
    e.stopPropagation();
    const up = (meRef?.current?.y ?? 0) > FLOOR2_Y / 2;
    if (up) onFloorClick(STAIR_MOUTH.x, STAIR_MOUTH.z, 0);
    else onFloorClick(STAIR_TOP.x, STAIR_TOP.z, FLOOR2_Y);
  };
  return (
    <group>
      {STAIR_STEPS.map((st) => {
        const [x, , z] = polar(st.phi, STAIR.r);
        return (
          <mesh
            key={st.i} position={[x, st.y + 0.6, z]} rotation={[0, -rad(st.phi), 0]} onClick={go}
            onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { document.body.style.cursor = 'auto'; }}
          >
            <boxGeometry args={[STAIR.w + 0.6, 1.8, 1.8]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** 欄杆：平台內側的整圈弧形欄杆、缺口兩端的邊（樓梯口那一端留空），加上掛在欄杆上的小燈泡 */
function UpperRailings() {
  const { posts, rails, bulbs } = useMemo(() => {
    const y0 = FLOOR2_Y;
    const posts = []; const rails = []; const bulbs = [];
    const line = (pts) => pts.map((p) => new THREE.Vector3(...p));
    const span = UPPER.phi1 - UPPER.phi0;
    const rIn = UPPER.ri + 0.12;
    const arc = (y) => {
      const pts = [];
      for (let k = 0; k <= 120; k += 1) pts.push(polar(UPPER.phi0 + (span * k) / 120, rIn, y));
      return line(pts);
    };
    rails.push(new THREE.CatmullRomCurve3(arc(y0 + 1.0)), new THREE.CatmullRomCurve3(arc(y0 + 0.55)));
    const nPost = Math.round((rad(span) * rIn) / 1.2);
    for (let k = 0; k <= nPost; k += 1) posts.push(polar(UPPER.phi0 + (span * k) / nPost, rIn, y0));
    const nBulb = Math.round((rad(span) * rIn) / 2.4);
    for (let k = 0; k < nBulb; k += 1) bulbs.push(polar(UPPER.phi0 + (span * (k + 0.5)) / nBulb, rIn, y0 + 1.12));
    // 缺口兩端的邊（沿半徑）
    const edge = (phi, r0, r1) => {
      const n = Math.max(1, Math.round(Math.abs(r1 - r0) / 1.4));
      for (let k = 0; k <= n; k += 1) posts.push(polar(phi, r0 + ((r1 - r0) * k) / n, y0));
      [1.0, 0.55].forEach((h) => rails.push(new THREE.CatmullRomCurve3(line([polar(phi, r0, y0 + h), polar(phi, r1, y0 + h)]))));
    };
    edge(UPPER.phi1 - 0.4, UPPER.ri + 0.12, UPPER.ro - 0.2);
    edge(UPPER.phi0 + 0.4, UPPER.ri + 0.12, STAIR.r - STAIR.w / 2 - 0.3);
    return { posts, rails, bulbs };
  }, []);
  return (
    <group>
      {posts.map(([x, y, z], i) => (
        <mesh key={i} position={[x, y + 0.52, z]} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 1.04, 6]} />
          <meshStandardMaterial color="#4a3320" roughness={0.95} />
        </mesh>
      ))}
      {rails.map((c, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[c, 80, 0.04, 6, false]} />
          <meshStandardMaterial color="#5a3d22" roughness={0.9} />
        </mesh>
      ))}
      {bulbs.map(([x, y, z], i) => (
        <mesh key={`b${i}`} position={[x, y, z]}>
          <sphereGeometry args={[0.09, 10, 8]} />
          <meshBasicMaterial color={i % 2 ? '#ffe6a0' : '#ffd27a'} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 樹枝咖啡廳裡的樹墩圓桌（座位來自 layout.js 的 UPPER_SEAT_LAYOUT，椅子由 Seat3D 畫） */
function UpperTable({ t }) {
  const [x, , z] = t.position;
  const h = t.height;
  return (
    <group position={[x, FLOOR2_Y, z]}>
      <mesh position={[0, h - 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[t.radius, t.radius, 0.06, 36]} />
        <meshStandardMaterial color="#8a6238" roughness={0.7} />
      </mesh>
      <mesh position={[0, h - 0.07, 0]} castShadow>
        <cylinderGeometry args={[t.radius + 0.025, t.radius + 0.025, 0.04, 36]} />
        <meshStandardMaterial color="#4a3320" roughness={0.95} />
      </mesh>
      <mesh position={[0, (h - 0.06) / 2, 0]} castShadow>
        <cylinderGeometry args={[0.08, 0.18, h - 0.06, 10]} />
        <meshStandardMaterial color="#4a3320" roughness={0.95} />
      </mesh>
      <mesh position={[-0.14, h + 0.045, 0.1]} castShadow>
        <cylinderGeometry args={[0.045, 0.034, 0.075, 18]} />
        <meshStandardMaterial color="#e9e2d6" roughness={0.3} />
      </mesh>
      <Mushroom position={[0.13, h, -0.08]} s={0.12} c={MUSH[(Math.round(x * 10 + z * 10) >>> 0) % 4]} />
    </group>
  );
}

function UpperTables() {
  return <group>{UPPER_TABLES.map((t) => <UpperTable key={t.id} t={t} />)}</group>;
}

/** 通道口上方的小木牌（寫著這間樹枝咖啡廳的名字） */
function ArchSign({ phi, name }) {
  const tex = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#4a3320'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#2f1d0e'; g.lineWidth = 6; g.strokeRect(5, 5, W - 10, H - 10);
    g.textAlign = 'center'; g.fillStyle = '#ffe9b0';
    g.font = 'bold 44px "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif';
    g.fillText(`樹枝咖啡廳・${name}`, W / 2, 78);
  }, 512, 110);
  const [x, y, z] = polar(phi, TREE.R - 0.35, FLOOR2_Y + 3.75);
  return (
    <mesh position={[x, y, z]} rotation={[0, faceCenter(x, z), 0]}>
      <planeGeometry args={[2.9, 0.62]} />
      <meshStandardMaterial map={tex} roughness={0.85} emissive="#ffd9a0" emissiveMap={tex} emissiveIntensity={0.35} />
    </mesh>
  );
}

/**
 * 樹壁上的圓拱通道 + 一整條長在樹幹外面的空心大樹枝（樹枝咖啡廳）。
 *   - 樹壁上的洞由 Trunk 的 alphaMap 挖出來；通道是圓柱管，後面接一條半徑 HALL_R 的空心樹枝（圓柱 + 尾端半球）。
 *   - 樹枝的樹皮牆面也用 alphaMap 挖出圓形窗戶（兩側各 4 扇 + 頂上 2 扇天窗），窗外是 ForestOutside 的森林。
 *   - 只畫樹皮的內側，所以從外面看像是被剖開的（看得到裡面）。
 * 桌子與椅子的座標在 layout.js（UPPER_TABLES / UPPER_SEAT_LAYOUT）。
 */
const LEAF_GREENS = ['#4f8a3c', '#5c9a45', '#3f7a35', '#6aa84f', '#7bb85a'];
const HALL_R = 5.0;      // 樹枝內半徑
const HALL_CY = 2.0;     // 樹枝中心線比地板高多少
const WIN_R = 1.0;       // 窗戶半徑
const WIN_ALONG = [0.12, 0.37, 0.62, 0.87];   // 窗戶在樹枝長度上的位置（0–1）

function BranchCafes() {
  const bark = useCanvasTexture(drawBark, 512, 512, [4, 2]);
  const planks = useCanvasTexture(drawPlanks, 256, 256, [1.2, 1.2]);
  const hallLen = BRANCH.hallEnd - BRANCH.hallStart;
  const hallMid = BRANCH.hallStart + hallLen / 2;
  const floorHalf = Math.sqrt(HALL_R * HALL_R - HALL_CY * HALL_CY);                 // 樹枝在地板高度的半寬
  const passA = UPPER.ro - 0.2; const passB = BRANCH.hallStart + 0.3;
  const circ = 2 * Math.PI * HALL_R;
  // 樹枝牆面上的窗戶：u 對應繞圓周的角度（0.25 / 0.75 = 左右兩側、0.5 = 頂端），v 對應沿樹枝的長度
  const winMap = useCanvasTexture((g, W, H) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#000';
    const hole = (u, v, r) => {
      const rx = (r / circ) * W; const ry = (r / hallLen) * H;
      g.beginPath(); g.ellipse(u * W, (1 - v) * H, rx, ry, 0, 0, Math.PI * 2); g.fill();
    };
    WIN_ALONG.forEach((t) => { hole(0.25, t, WIN_R); hole(0.75, t, WIN_R); });
    hole(0.5, 0.3, 0.8); hole(0.5, 0.75, 0.8);
  }, 1024, 512);
  const twigs = useMemo(() => {
    const rnd = rngFactory(909);
    const out = [];
    WIN_ALONG.forEach((t, i) => [-1, 1].forEach((side) => {
      const a = BRANCH.hallStart + t * hallLen + (i % 2 ? 1.6 : -1.6);       // 窗戶旁邊的小樹枝（從窗戶看得到葉子）
      const pts = [
        new THREE.Vector3(side * (HALL_R + 0.1), HALL_CY + 0.6, a),
        new THREE.Vector3(side * (HALL_R + 1.6), HALL_CY + 1.4, a + (rnd() - 0.5) * 1.2),
        new THREE.Vector3(side * (HALL_R + 3.2), HALL_CY + 1.1 + rnd(), a + (rnd() - 0.5) * 2),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      const end = pts[2];
      const leaves = Array.from({ length: 4 }, () => ({
        p: [end.x + (rnd() - 0.5) * 1.6, end.y + (rnd() - 0.3) * 1.0, end.z + (rnd() - 0.5) * 1.6],
        s: 0.5 + rnd() * 0.6, c: LEAF_GREENS[Math.floor(rnd() * LEAF_GREENS.length)],
      }));
      out.push({ curve, leaves });
    }));
    return out;
  }, [hallLen]);
  return (
    <group>
      {BRANCH_ROOMS.map((b) => {
        const rotY = Math.PI / 2 - rad(b.phi);
        return (
          <group key={b.k}>
            {/* 洞口的樹皮拱框 + 名字牌 */}
            <group position={[...polar(b.phi, TREE.R - 0.12, FLOOR2_Y + 1.2)]} rotation={[0, rotY, 0]}>
              <mesh castShadow><torusGeometry args={[1.66, 0.2, 10, 40]} /><meshStandardMaterial color="#4a3120" roughness={1} /></mesh>
            </group>
            <ArchSign phi={b.phi} name={b.name} />
            {/* 以樹心為原點：local Z = 朝外、local X = 側向、local Y = 高度（0 = 二樓地板） */}
            <group position={[TREE.cx, FLOOR2_Y, TREE.cz]} rotation={[0, rotY, 0]}>
              {/* 通道 */}
              <group position={[0, 1.2, (passA + passB) / 2]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[1.6, 1.6, passB - passA, 28, 1, true]} />
                  <meshStandardMaterial map={bark} side={THREE.BackSide} roughness={1} />
                </mesh>
                <mesh position={[0, -1.42, 0]} receiveShadow>
                  <boxGeometry args={[2.2, 0.4, passB - passA]} />
                  <meshStandardMaterial map={planks} roughness={0.85} />
                </mesh>
              </group>
              {/* 空心大樹枝：樹皮牆面（有窗）+ 尾端半球 + 入口牆 + 木地板 */}
              <mesh position={[0, HALL_CY, hallMid]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[HALL_R, HALL_R, hallLen, 48, 1, true]} />
                <meshStandardMaterial map={bark} alphaMap={winMap} alphaTest={0.5} side={THREE.BackSide} roughness={1} emissive="#5a3a1a" emissiveIntensity={0.55} />
              </mesh>
              <mesh position={[0, HALL_CY, BRANCH.hallEnd]} rotation={[Math.PI / 2, 0, 0]}>
                <sphereGeometry args={[HALL_R, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial map={bark} side={THREE.BackSide} roughness={1} emissive="#3a2410" emissiveIntensity={0.35} />
              </mesh>
              <mesh position={[0, HALL_CY, BRANCH.hallStart]}>
                <ringGeometry args={[1.6, HALL_R + 0.1, 48]} />
                <meshStandardMaterial map={bark} side={THREE.DoubleSide} roughness={1} emissive="#3a2410" emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, -0.25, hallMid]} receiveShadow>
                <boxGeometry args={[floorHalf * 2, 0.5, hallLen]} />
                <meshStandardMaterial map={planks} roughness={0.85} emissive="#8a6238" emissiveMap={planks} emissiveIntensity={0.3} />
              </mesh>
              <mesh position={[0, -0.27, BRANCH.hallEnd]} receiveShadow>
                <cylinderGeometry args={[floorHalf, floorHalf, 0.5, 40]} />
                <meshStandardMaterial map={planks} roughness={0.85} />
              </mesh>
              {/* 窗框 */}
              {WIN_ALONG.map((t) => [-1, 1].map((side) => (
                <mesh key={`${t}${side}`} position={[side * (HALL_R - 0.03), HALL_CY, BRANCH.hallStart + t * hallLen]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[WIN_R + 0.05, 0.09, 8, 32]} />
                  <meshStandardMaterial color="#4a3120" roughness={1} />
                </mesh>
              )))}
              {[0.3, 0.75].map((t) => (
                <mesh key={`sky${t}`} position={[0, HALL_CY + HALL_R - 0.03, BRANCH.hallStart + t * hallLen]} rotation={[Math.PI / 2, 0, 0]}>
                  <torusGeometry args={[0.85, 0.08, 8, 28]} />
                  <meshStandardMaterial color="#4a3120" roughness={1} />
                </mesh>
              ))}
              {/* 窗外的小樹枝與葉子 */}
              {twigs.map((tw, i) => (
                <group key={i}>
                  <mesh><tubeGeometry args={[tw.curve, 10, 0.1, 6, false]} /><meshStandardMaterial color="#4a3120" roughness={1} /></mesh>
                  {tw.leaves.map((l, k) => (
                    <mesh key={k} position={l.p} scale={[l.s * 1.4, l.s * 0.8, l.s * 1.4]}>
                      <icosahedronGeometry args={[0.55, 0]} />
                      <meshStandardMaterial color={l.c} roughness={0.9} flatShading emissive={l.c} emissiveIntensity={0.12} />
                    </mesh>
                  ))}
                </group>
              ))}
              {/* 樹枝裡的氣氛：樹脊上吊的燈籠、牆邊發光小蘑菇、一盞點光源 */}
              {[0, 1, 2, 3].map((k) => {
                const a = BRANCH.hallStart + 3.2 + k * 4.2;
                return (
                  <group key={k} position={[0, HALL_CY + HALL_R - 0.4, a]}>
                    <mesh position={[0, -0.6, 0]}><cylinderGeometry args={[0.012, 0.012, 1.2, 5]} /><meshStandardMaterial color="#2a4a2a" roughness={1} /></mesh>
                    <mesh position={[0, -1.3, 0]} scale={[1, 1.25, 1]}><sphereGeometry args={[0.28, 16, 12]} /><meshBasicMaterial color={k % 2 ? '#ffe6a0' : '#ffd27a'} toneMapped={false} /></mesh>
                    <mesh position={[0, -1.3, 0]}><sphereGeometry args={[0.8, 14, 10]} /><meshBasicMaterial color="#ffb85a" transparent opacity={0.12} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
                    <mesh position={[0, -0.95, 0]}><coneGeometry args={[0.22, 0.24, 8]} /><meshStandardMaterial color="#3d6a3a" roughness={0.8} /></mesh>
                  </group>
                );
              })}
              {[24.5, 29, 33].map((a, i) => [-1, 1].map((side) => (
                <Mushroom key={`${a}${side}`} position={[side * 3.95, 0, a]} s={0.26 + (i % 2) * 0.08} c={MUSH[(b.k + i) % 4]} />
              )))}
            </group>
          </group>
        );
      })}
    </group>
  );
}

/** 被樹皮封住的圓拱：只有拱框和一塊鼓起來的樹皮（還長了苔蘚與藤蔓），進不去 */
function BarkPlugs() {
  const bark = useCanvasTexture(drawBark, 512, 512, [1.5, 1.5]);
  return (
    <group>
      {BARK_PHIS.map((phi, i) => {
        const [x, y, z] = polar(phi, TREE.R - 0.3, FLOOR2_Y + 1.2);
        const rot = faceCenter(x, z);
        return (
          <group key={phi} position={[x, y, z]} rotation={[0, rot, 0]}>
            <mesh scale={[1, 1, 0.3]}>
              <sphereGeometry args={[1.62, 28, 18]} />
              <meshStandardMaterial map={bark} roughness={1} />
            </mesh>
            <mesh position={[0, 0, 0.1]} castShadow><torusGeometry args={[1.66, 0.2, 10, 40]} /><meshStandardMaterial color="#3d2815" roughness={1} /></mesh>
            {/* 苔蘚塊與垂下來的藤蔓 */}
            {[[-0.7, 0.9, 0.55], [0.5, 1.1, 0.5], [0.9, -0.3, 0.55], [-0.9, -0.6, 0.5]].map(([dx, dy, dz], k) => (
              <mesh key={k} position={[dx, dy, dz]} scale={[0.5 + (k % 2) * 0.2, 0.28, 0.2]}>
                <icosahedronGeometry args={[0.6, 1]} />
                <meshStandardMaterial color={k % 2 ? '#4f8a3c' : '#3f7a35'} roughness={1} flatShading />
              </mesh>
            ))}
            {[-0.8, -0.2, 0.55].map((dx, k) => (
              <mesh key={`v${k}`} position={[dx, 0.9 - (k + i) % 2 * 0.3 - 0.9, 0.6]}>
                <cylinderGeometry args={[0.02, 0.02, 1.8 + k * 0.3, 5]} />
                <meshStandardMaterial color="#2f5a2a" roughness={1} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
}

/**
 * 樹幹外面的森林（只有從樹枝咖啡廳的窗戶才看得到）：遠處的大樹幹、成團的樹冠葉叢，腳下是很深的森林地面。
 * 全部放在離樹心 70 公尺以外（鏡頭最遠只會到離樹心 55 左右），不然會有大塊東西擋在鏡頭前面。
 * 材質關掉霧（fog={false}），顏色直接調暗，遠看就是一片深色的森林剪影。
 */
function ForestOutside() {
  const { trunks, blobs } = useMemo(() => {
    const rnd = rngFactory(808);
    const trunks = []; const blobs = [];
    for (let i = 0; i < 16; i += 1) {
      const a = (i / 16) * Math.PI * 2 + rnd() * 0.3; const r = 80 + rnd() * 35;
      trunks.push({ x: TREE.cx + Math.cos(a) * r, z: TREE.cz + Math.sin(a) * r, r: 3 + rnd() * 4, c: i % 2 ? '#1c1610' : '#221a12' });
    }
    for (let i = 0; i < 70; i += 1) {
      const a = rnd() * Math.PI * 2; const r = 72 + rnd() * 55; const y = -8 + rnd() * 34; const s = 6 + rnd() * 8;
      blobs.push({ x: TREE.cx + Math.cos(a) * r, y, z: TREE.cz + Math.sin(a) * r, s, c: ['#1d3a1b', '#244a22', '#193618', '#21421f'][i % 4] });
    }
    return { trunks, blobs };
  }, []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[TREE.cx, -30, TREE.cz]}>
        <circleGeometry args={[260, 40]} />
        <meshBasicMaterial color="#0a1510" fog={false} />
      </mesh>
      {trunks.map((t, i) => (
        <mesh key={i} position={[t.x, 10, t.z]}>
          <cylinderGeometry args={[t.r * 0.9, t.r, 100, 12]} />
          <meshBasicMaterial color={t.c} fog={false} />
        </mesh>
      ))}
      {blobs.map((bl, i) => (
        <mesh key={i} position={[bl.x, bl.y, bl.z]} scale={[bl.s, bl.s * 0.6, bl.s]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={bl.c} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

/** 樓梯口的木牌（一樓，樓梯起點旁邊） */
function StairSign() {
  const tex = useCanvasTexture(drawSign, 512, 256);
  const [x, , z] = polar(STAIR.phi0 - 14, GROUND_R - 0.15);
  const rot = faceCenter(x, z);
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {[-1.15, 1.15].map((dx) => (
        <mesh key={dx} position={[dx, 1.2, 0]} castShadow><cylinderGeometry args={[0.07, 0.09, 2.4, 8]} /><meshStandardMaterial color="#3d2815" roughness={0.95} /></mesh>
      ))}
      <mesh position={[0, 2.05, 0.06]} castShadow>
        <planeGeometry args={[2.6, 1.3]} />
        <meshStandardMaterial map={tex} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 2.05, 0.02]}><boxGeometry args={[2.7, 1.4, 0.06]} /><meshStandardMaterial color="#2f1d0e" roughness={0.95} /></mesh>
    </group>
  );
}

/** 樓梯口兩側的地燈（只發光，不打光） */
function StairLamps() {
  return (
    <group>
      {[STAIR.phi0 - 3, STAIR.phi0 - 11].map((phi, i) => {
        const [x, , z] = polar(phi, GROUND_R - 0.1);
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.05, 0.07, 1.6, 8]} /><meshStandardMaterial color="#3d2815" roughness={0.95} /></mesh>
            <mesh position={[0, 1.75, 0]} scale={[1, 1.25, 1]}><sphereGeometry args={[0.24, 16, 12]} /><meshBasicMaterial color="#ffd27a" toneMapped={false} /></mesh>
            <mesh position={[0, 1.98, 0]}><coneGeometry args={[0.2, 0.2, 8]} /><meshStandardMaterial color="#3d6a3a" roughness={0.8} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/** 新開放的苔蘚地面上的小東西：迷你發光蘑菇與扁石頭（太小，不擋路） */
function MossBits() {
  const bits = useMemo(() => {
    const rnd = rngFactory(515);
    const out = [];
    for (let i = 0; i < 90 && out.length < 28; i += 1) {
      const phi = rnd() * 360; const r = 9.4 + rnd() * 2.0;
      const [x, , z] = polar(phi, r);
      if (x > -9.3 && x < 9.3 && z > -5.3 && z < 9.3) continue;        // 木平台上不放
      if (phi > 140 && phi < 178) continue;                              // 樓梯口那一帶留空
      out.push({ x, z, kind: out.length % 3 === 0 ? 'stone' : 'mush', s: 0.22 + rnd() * 0.3, c: out.length % 4, rot: rnd() * 6.28 });
    }
    return out;
  }, []);
  return (
    <group>
      {bits.map((b, i) => (b.kind === 'stone'
        ? (
          <mesh key={i} position={[b.x, 0.05, b.z]} rotation={[0, b.rot, 0]} scale={[b.s * 2.2, b.s * 0.7, b.s * 1.6]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#6f7a6a" roughness={1} flatShading />
          </mesh>
        )
        : <Mushroom key={i} position={[b.x, 0, b.z]} s={b.s} c={MUSH[b.c]} />))}
    </group>
  );
}

export function TreeDecor() {
  return (
    <group>
      <Trunk />
      <RoundWindow phi={250} y={5} r={1.6} />
      <RoundWindow phi={258} y={10.5} r={2.2} />
      <RoundWindow phi={290} y={5.5} r={1.8} />
      <RoundWindow phi={282} y={10.5} r={1.4} />
      <RoundWindow phi={312} y={5} r={2.0} />
      <RoundWindow phi={330} y={9} r={2.4} />
      <RoundWindow phi={350} y={5} r={1.6} />
      <FairyDoor />
      <Stairs />
      <StairSign />
      <StairLamps />
      <Roots />
      <Mushrooms />
      <MossBits />
      <Lanterns />
      <Fireflies />
      <CounterBacking />
      {/* 二樓：環形平台 + 通往各間樹枝咖啡廳的通道 */}
      <UpperDeck />
      <UpperRailings />
      <UpperTables />
      <BranchCafes />
      <BarkPlugs />
      <ForestOutside />
    </group>
  );
}
