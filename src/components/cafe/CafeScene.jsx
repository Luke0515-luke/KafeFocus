import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import UserAvatar3D, { preloadAvatar } from "./UserAvatar3D";

function Chair({ seat, mine, onClick }) {
  const [hover, setHover] = useState(false);
  const empty = !seat.occupant_id;
  const color = mine ? "#f0a35e" : empty ? (hover ? "#d6a15f" : "#7a5a3a") : "#5b4630";

  return (
    <group position={[seat.pos_x, seat.pos_y, seat.pos_z]} rotation={[0, seat.rot_y, 0]}>
      <mesh
        position={[0, -0.03, 0]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); if (empty) onClick(seat); }}
        onPointerOver={(e) => { e.stopPropagation(); if (empty) { setHover(true); document.body.style.cursor = "pointer"; } }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <boxGeometry args={[0.5, 0.06, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.3, -0.24]} castShadow>
        <boxGeometry args={[0.5, 0.55, 0.05]} />
        <meshStandardMaterial color="#4a3826" />
      </mesh>
      {[[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => (
        <mesh key={`${x}${z}`} position={[x, -0.25, z]} castShadow>
          <boxGeometry args={[0.04, 0.4, 0.04]} />
          <meshStandardMaterial color="#3a2c1e" />
        </mesh>
      ))}
    </group>
  );
}

function Table() {
  return (
    <group position={[0, 0, 0.25]}>
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 0.08, 1.6]} />
        <meshStandardMaterial color="#a67c52" />
      </mesh>
      {[-4.2, 4.2].map((x) => (
        <mesh key={x} position={[x, 0.37, 0]} castShadow>
          <boxGeometry args={[0.1, 0.74, 1.3]} />
          <meshStandardMaterial color="#6b4c30" />
        </mesh>
      ))}
    </group>
  );
}

export default function CafeScene({ seats, mySeatId, onSeatClick }) {
  useEffect(() => {
    seats.forEach((s) => { if (s.occupant_avatar_url) preloadAvatar(s.occupant_avatar_url); });
  }, [seats]);

  return (
    <Canvas shadows camera={{ position: [0, 5, 9], fov: 45 }} className="!h-full !w-full">
      <color attach="background" args={["#1c1917"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 3, 0.25]} intensity={8} color="#ffcf8a" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 14]} />
        <meshStandardMaterial color="#3b2f25" />
      </mesh>

      <Table />
      {seats.map((s) => (
        <Chair key={s.id} seat={s} mine={s.id === mySeatId} onClick={onSeatClick} />
      ))}
      {seats.filter((s) => s.occupant_id).map((s) => (
        <UserAvatar3D key={s.id} seat={s} isSelf={s.id === mySeatId} />
      ))}

      <OrbitControls target={[0, 0.9, 0.25]} maxPolarAngle={Math.PI / 2.1} minDistance={4} maxDistance={14} />
    </Canvas>
  );
}
