import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import WalkerAvatar3D from './WalkerAvatar3D';

/** 點地板時在目的地顯示的小圓環（走到就消失） */
function DestMarker({ destRef }) {
  const ring = useRef();
  useFrame(({ clock }) => {
    const d = destRef.current;
    if (!ring.current) return;
    ring.current.visible = !!d?.active;
    if (!d?.active) return;
    ring.current.position.set(d.x, (d.y ?? 0) + 0.03, d.z);
    const s = 1 + Math.sin(clock.elapsedTime * 6) * 0.12;
    ring.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.17, 0.22, 32]} />
      <meshBasicMaterial color="#ffbe73" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </mesh>
  );
}

/**
 * 站著 / 走路的角色們（沒有入座的人）。
 * 自己的位置由 usePlayers 模擬；別人的位置來自 Realtime 廣播，WalkerAvatar3D 會平滑地追過去。
 */
export default function WalkersLayer({ players, seats, currentUserId, selfName, selfAvatarUrl }) {
  const seatedIds = useMemo(() => new Set(seats.filter((s) => s.occupant_id).map((s) => s.occupant_id)), [seats]);
  return (
    <>
      {players.showMe && (
        <WalkerAvatar3D
          stateRef={players.meRef} url={selfAvatarUrl} name={selfName} isSelf uid={currentUserId} outfit={players.outfits[currentUserId]}
          bubble={players.bubbles[currentUserId]}
        />
      )}
      {players.others.filter((o) => !seatedIds.has(o.id)).map((o) => (
        <WalkerAvatar3D key={o.id} stateRef={o.ref} url={o.avatar} name={o.name} bubble={players.bubbles[o.id]} smooth uid={o.id} outfit={players.outfits[o.id]} />
      ))}
      <DestMarker destRef={players.destRef} />
    </>
  );
}
