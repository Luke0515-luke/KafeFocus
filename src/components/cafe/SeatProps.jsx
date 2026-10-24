import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { smoothstep } from './rigUtils';

const SILVER = { color: '#8d8d90', roughness: 0.3, metalness: 0.8 };
const lerp = THREE.MathUtils.lerp;

/**
 * 坐在位子上的人手邊的道具：筆電、書、咖啡杯。位置全部由 stateRef.current（seatedMotion 每幀算好）決定，
 * 這裡只負責擺放與顯示 / 隱藏，所以放在座位座標系底下即可。
 */
export default function SeatProps({ stateRef }) {
  const laptop = useRef(); const book = useRef(); const cup = useRef();
  const flip = useRef();

  useFrame(() => {
    const st = stateRef.current;
    if (!st?.ready) return;

    if (laptop.current) {
      laptop.current.visible = st.laptop;
      laptop.current.position.set(0, st.deskY + 0.012, st.laptopZ + 0.02);
    }

    if (book.current) {
      book.current.visible = st.book;
      const w = st.wBook;
      // 放桌上（平放）→ 舉在胸前（朝向臉）
      book.current.position.set(0, lerp(st.deskY + 0.02, 0.38, w), lerp(st.deskZ - 0.02, 0.33, w));
      book.current.rotation.x = lerp(0, -0.85, w);
    }
    if (flip.current) {
      const f = smoothstep(7.6, 8.8, st.pageT);
      flip.current.visible = st.book && f > 0.01 && f < 0.99;
      flip.current.rotation.z = f * Math.PI;
    }

    if (cup.current) {
      cup.current.visible = st.cupVisible;
      cup.current.position.copy(st.cupPos);
      cup.current.rotation.x = -0.9 * st.cupLift;   // 舉到嘴邊時杯口朝向臉
    }
  });

  return (
    <group>
      {/* 筆電：底座 + 螢幕（螢幕面向使用者） */}
      <group ref={laptop} visible={false}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.016, 0.23]} />
          <meshStandardMaterial {...SILVER} />
        </mesh>
        <group position={[0, 0.008, 0.115]} rotation={[0.28, 0, 0]}>
          <mesh position={[0, 0.105, 0]} castShadow>
            <boxGeometry args={[0.32, 0.21, 0.008]} />
            <meshStandardMaterial {...SILVER} />
          </mesh>
          <mesh position={[0, 0.105, -0.0047]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[0.295, 0.185]} />
            <meshBasicMaterial color="#a9c8ff" toneMapped={false} />
          </mesh>
        </group>
      </group>

      {/* 書：兩頁 + 書背；翻頁時右頁翻到左邊 */}
      <group ref={book} visible={false}>
        <mesh position={[0, -0.006, 0]} castShadow>
          <boxGeometry args={[0.27, 0.01, 0.2]} />
          <meshStandardMaterial color="#3a2a22" roughness={0.7} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.065, 0.004, 0]}>
            <boxGeometry args={[0.125, 0.014, 0.19]} />
            <meshStandardMaterial color="#efe6d2" roughness={0.9} />
          </mesh>
        ))}
        <group ref={flip} visible={false} position={[0, 0.012, 0]}>
          <mesh position={[0.062, 0.002, 0]}>
            <boxGeometry args={[0.125, 0.003, 0.19]} />
            <meshStandardMaterial color="#f6efdd" roughness={0.9} />
          </mesh>
        </group>
      </group>

      {/* 咖啡杯 */}
      <group ref={cup} visible={false}>
        <mesh position={[0, 0.005, 0]} castShadow>
          <cylinderGeometry args={[0.065, 0.055, 0.01, 20]} />
          <meshStandardMaterial color="#e9e2d6" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.03, 0.07, 20]} />
          <meshStandardMaterial color="#e9e2d6" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.081, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.036, 18]} />
          <meshStandardMaterial color="#2a170d" roughness={0.2} />
        </mesh>
        <mesh position={[0.045, 0.047, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.018, 0.005, 8, 14]} />
          <meshStandardMaterial color="#e9e2d6" roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
