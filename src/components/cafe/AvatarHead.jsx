import { RoundedBox } from '@react-three/drei';

const R = 0.11; // 頭的基準半徑
const INK = '#2a1d16';
const BLUSH = '#ff8fa3';

// 頭型 = 整顆頭（含臉、頭髮）的縮放比例
const HEAD_SCALE = { round: [1, 1, 1], oval: [0.93, 1.13, 0.96], wide: [1.13, 0.95, 1.02], square: [1, 1.03, 1] };

/** 頭 + 臉 + 髮型。座位上的人形與走路的人形共用；本地座標 +Z = 面向前方。 */
export default function AvatarHead({ outfit, mat, position = [0, 0, 0] }) {
  const { head, face, hairStyle, skin, hair } = outfit;
  const square = head === 'square';
  const fz = (x, y) => (square ? 0.1 : Math.sqrt(Math.max(0.0001, R * R - x * x - y * y))); // 臉部特徵貼在頭的表面
  const ink = <meshStandardMaterial color={INK} roughness={0.6} transparent={mat.transparent} opacity={mat.opacity} />;
  const hairMat = <meshStandardMaterial color={hair} {...mat} />;

  // ---- 眼睛 ----
  const eyeX = 0.042; const eyeY = 0.012;
  const eyes = [-1, 1].map((sx) => {
    const x = sx * eyeX; const z = fz(x, eyeY) + 0.002;
    if (face === 'happy') { // 笑瞇眼 ^ ^
      return <mesh key={sx} position={[x, eyeY - 0.004, z]}><torusGeometry args={[0.017, 0.004, 6, 12, Math.PI]} />{ink}</mesh>;
    }
    if (face === 'sleepy') { // 睏睏：半閉的橫線
      return <mesh key={sx} position={[x, eyeY, z]}><boxGeometry args={[0.034, 0.006, 0.004]} />{ink}</mesh>;
    }
    return (
      <mesh key={sx} position={[x, eyeY, z]} scale={[1, face === 'cool' ? 0.7 : 1.15, 0.5]}>
        <sphereGeometry args={[0.0125, 10, 10]} />{ink}
      </mesh>
    );
  });
  // ---- 眉毛（酷酷臉）----
  const brows = face === 'cool' && [-1, 1].map((sx) => (
    <mesh key={sx} position={[sx * eyeX, eyeY + 0.026, fz(sx * eyeX, eyeY + 0.026) + 0.002]} rotation={[0, 0, sx * -0.28]}>
      <boxGeometry args={[0.038, 0.007, 0.005]} />{ink}
    </mesh>
  ));
  // ---- 嘴巴 ----
  const my = -0.04; const mz = fz(0, my) + 0.002;
  let mouth;
  if (face === 'cool') mouth = <mesh position={[0, my, mz]}><boxGeometry args={[0.03, 0.006, 0.004]} />{ink}</mesh>;
  else if (face === 'sleepy') mouth = <mesh position={[0, my, mz]} scale={[1, 1.2, 0.5]}><sphereGeometry args={[0.009, 8, 8]} />{ink}</mesh>;
  else {
    const big = face === 'happy';
    mouth = <mesh position={[0, my + 0.012, mz]} rotation={[0, 0, Math.PI]}><torusGeometry args={[big ? 0.022 : 0.016, 0.0045, 6, 12, Math.PI]} />{ink}</mesh>;
  }
  // ---- 眼鏡 / 腮紅 ----
  const glasses = face === 'glasses' && (
    <group>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * eyeX, eyeY, fz(sx * eyeX, eyeY) + 0.006]}><torusGeometry args={[0.03, 0.0045, 6, 20]} /><meshStandardMaterial color="#2b2b30" roughness={0.4} metalness={0.4} /></mesh>
      ))}
      <mesh position={[0, eyeY + 0.003, fz(0, eyeY) + 0.006]}><boxGeometry args={[0.03, 0.005, 0.005]} /><meshStandardMaterial color="#2b2b30" /></mesh>
    </group>
  );
  const blush = face === 'blush' && [-1, 1].map((sx) => (
    <mesh key={sx} position={[sx * 0.068, -0.014, fz(sx * 0.068, -0.014) + 0.001]} rotation={[0, sx * 0.9, 0]} scale={[1, 0.65, 0.2]}>
      <sphereGeometry args={[0.02, 10, 8]} /><meshStandardMaterial color={BLUSH} roughness={0.9} transparent opacity={0.75 * (mat.opacity ?? 1)} />
    </mesh>
  ));

  // ---- 髮型 ----
  const cap = (r = 1.07, theta = 0.55, y = 0.025, z = -0.005) => (
    <mesh position={[0, y, z]} castShadow><sphereGeometry args={[R * r, 22, 16, 0, Math.PI * 2, 0, Math.PI * theta]} />{hairMat}</mesh>
  );
  let hairDo = null;
  switch (hairStyle) {
    case 'bald': hairDo = null; break;
    case 'buzz': hairDo = cap(1.025, 0.45, 0.012, 0); break;
    case 'bob':
      hairDo = (<>{cap(1.08, 0.6)}<mesh position={[0, -0.01, -0.03]} scale={[1, 0.95, 0.9]} castShadow><sphereGeometry args={[R * 1.1, 20, 14, 0, Math.PI * 2, Math.PI * 0.25, Math.PI * 0.5]} />{hairMat}</mesh></>);
      break;
    case 'long':
      hairDo = (<>{cap(1.08, 0.6)}<mesh position={[0, -0.12, -0.075]} castShadow><boxGeometry args={[0.2, 0.3, 0.07]} />{hairMat}</mesh>
        {[-1, 1].map((sx) => <mesh key={sx} position={[sx * 0.1, -0.08, -0.03]} castShadow><boxGeometry args={[0.03, 0.2, 0.08]} />{hairMat}</mesh>)}</>);
      break;
    case 'ponytail':
      hairDo = (<>{cap()}<mesh position={[0, 0.0, -0.125]} castShadow><sphereGeometry args={[0.03, 10, 10]} />{hairMat}</mesh>
        <mesh position={[0, -0.07, -0.14]} rotation={[0.25, 0, 0]} castShadow><capsuleGeometry args={[0.028, 0.12, 4, 10]} />{hairMat}</mesh></>);
      break;
    case 'bun':
      hairDo = (<>{cap()}<mesh position={[0, 0.135, -0.02]} castShadow><sphereGeometry args={[0.052, 14, 12]} />{hairMat}</mesh></>);
      break;
    case 'curly':
      hairDo = (<>{cap(1.02, 0.5)}{Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2; const ring = i % 2 ? 0.07 : 0.1;
        return <mesh key={i} position={[Math.cos(a) * 0.1, 0.05 + ring * 0.5, Math.sin(a) * 0.1 - 0.01]} castShadow><sphereGeometry args={[0.035, 10, 10]} />{hairMat}</mesh>;
      })}<mesh position={[0, 0.12, -0.01]} castShadow><sphereGeometry args={[0.05, 10, 10]} />{hairMat}</mesh></>);
      break;
    case 'spiky':
      hairDo = (<>{cap(1.04, 0.5)}{Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return <mesh key={i} position={[Math.cos(a) * 0.065, 0.115, Math.sin(a) * 0.065 - 0.01]} rotation={[Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5]} castShadow><coneGeometry args={[0.032, 0.09, 8]} />{hairMat}</mesh>;
      })}<mesh position={[0, 0.14, -0.01]} castShadow><coneGeometry args={[0.035, 0.1, 8]} />{hairMat}</mesh></>);
      break;
    default: hairDo = cap(); // short
  }

  return (
    <group position={position} scale={HEAD_SCALE[head] ?? HEAD_SCALE.round}>
      {square ? (
        <RoundedBox args={[0.2, 0.2, 0.2]} radius={0.05} smoothness={4} castShadow><meshStandardMaterial color={skin} {...mat} /></RoundedBox>
      ) : (
        <mesh castShadow><sphereGeometry args={[R, 22, 18]} /><meshStandardMaterial color={skin} {...mat} /></mesh>
      )}
      {/* 耳朵 */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (square ? 0.1 : 0.107), -0.005, 0]} scale={[0.5, 1, 0.8]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color={skin} {...mat} /></mesh>
      ))}
      {eyes}{brows}{mouth}{glasses}{blush}
      {hairDo}
    </group>
  );
}

