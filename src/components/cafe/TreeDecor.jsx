import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * 樹屋咖啡廳（奇妙仙子的樹洞風格）：整間店位在一棵巨大空心樹幹的裡面。
 * 圓形樹幹內壁（半徑 16、高 46）+ 苔蘚地面 + 木頭平台 + 圓形窗洞 + 精靈小門 + 螺旋樹梯 +
 * 樹根 + 發光的巨大蘑菇 + 吊燈籠 + 螢火蟲 + 頭頂的光束。
 * 咖啡廳的桌椅仍在原本的 18 × 14 木頭平台上（座位座標不變）。
 */
export const TREE = { cx: 0, cz: 2, R: 16, H: 46 };

function rngFactory(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

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

const polar = (phiDeg, r, y) => {
  const a = (phiDeg * Math.PI) / 180;
  return [TREE.cx + Math.cos(a) * r, y, TREE.cz + Math.sin(a) * r];
};
// 讓平面的正面朝向樹幹中心
const faceCenter = (x, z) => Math.atan2(TREE.cx - x, TREE.cz - z);

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
  return (
    <group>
      <mesh position={[TREE.cx, TREE.H / 2 - 2, TREE.cz]}>
        <cylinderGeometry args={[TREE.R, TREE.R, TREE.H, 72, 1, true]} />
        <meshStandardMaterial map={bark} side={THREE.BackSide} roughness={1} />
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

/* ---------------- 螺旋樹梯（沿著左側樹壁往上盤旋） ---------------- */
function Stairs() {
  const steps = useMemo(() => Array.from({ length: 30 }, (_, i) => ({ phi: 165 + i * 2.9, y: 0.45 + i * 0.52 })), []);
  return (
    <group>
      {steps.map((s, i) => {
        const [x, , z] = polar(s.phi, TREE.R - 1.5, s.y);
        return (
          <mesh key={i} position={[x, s.y, z]} rotation={[0, -(s.phi * Math.PI) / 180, 0]} castShadow receiveShadow>
            <boxGeometry args={[3.0, 0.22, 1.5]} />
            <meshStandardMaterial color={i % 2 ? '#6a4a2a' : '#5e4125'} roughness={0.9} />
          </mesh>
        );
      })}
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
      const curve = new THREE.CatmullRomCurve3([pt(TREE.R - 0.3, 5 + rnd() * 3), pt(TREE.R - 1.2, 2.2, tw * 0.3), pt(TREE.R - 2.8, 0.45, tw), pt(TREE.R - 4.6, 0.12, tw * 1.4)]);
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
  const list = useMemo(() => {
    const rnd = rngFactory(77); const out = [];
    for (let i = 0; i < 24; i += 1) { // 樹壁底部一圈（平台外側）
      const a = rnd() * Math.PI * 2; const r = 12.6 + rnd() * 2.6;
      out.push({ p: [TREE.cx + Math.cos(a) * r, 0, TREE.cz + Math.sin(a) * r], s: 0.9 + rnd() * 1.9, c: MUSH[i % 4] });
    }
    for (let i = 0; i < 10; i += 1) { // 吧台後方（平台後緣外）
      out.push({ p: [-9 + rnd() * 18, 0, -6.2 - rnd() * 3.2], s: 0.7 + rnd() * 1.4, c: MUSH[(i + 1) % 4] });
    }
    return out;
  }, []);
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
      <Roots />
      <Mushrooms />
      <Lanterns />
      <Fireflies />
      <CounterBacking />
    </group>
  );
}
