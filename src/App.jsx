import { useCallback, useEffect, useState } from 'react';
import AuthGate from './components/AuthGate';
import Cafe3DScene from './components/3d/Cafe3DScene';
import SeatControlPanel from './components/hud/SeatControlPanel';
import { useCafeRealtime } from './hooks/useCafeRealtime';
import { supabase } from './lib/supabaseClient';

const CAFE_SLUG = 'main-street';

function CafeRoom({ session }) {
  const userId = session.user.id;
  const [cafe, setCafe] = useState(null);
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from('cafes').select('*').eq('slug', CAFE_SLUG).single(),
        supabase.from('profiles').select('*').eq('id', userId).single(),
      ]);
      if (!alive) return;
      if (c.error) setNotice(`讀取咖啡廳失敗：${c.error.message}`); else setCafe(c.data);
      if (p.error) setNotice(`讀取個人檔案失敗：${p.error.message}`); else setProfile(p.data);
    })();
    return () => { alive = false; };
  }, [userId]);

  const {
    seats, mySeat, loading, error, connection, onlineCount,
    claimSeat, leaveSeat, setStatus,
  } = useCafeRealtime(cafe?.id, userId);

  const handleSeatSelect = useCallback(async (seat) => {
    setNotice('');
    try { await claimSeat(seat.id); } catch (e) { setNotice(e.message); }
  }, [claimSeat]);

  const handleSaveAvatar = useCallback(async (url) => {
    const { data, error: err } = await supabase
      .from('profiles').update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq('id', userId).select().single();
    if (err) throw new Error(err.message);
    setProfile(data);
    if (mySeat) await claimSeat(mySeat.id); // 已入座：刷新座位上的頭像快照（狀態與倒數保留）
  }, [userId, mySeat, claimSeat]);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-stone-900">
      <Cafe3DScene seats={seats} currentUserId={userId} onSeatSelect={handleSeatSelect} />
      <SeatControlPanel
        cafeName={cafe?.name}
        profile={profile}
        mySeat={mySeat}
        connection={connection}
        onlineCount={onlineCount}
        notice={notice || error?.message}
        onSetStatus={(status, task, sec) => setStatus({ status, task, durationSec: sec })}
        onLeave={leaveSeat}
        onSaveAvatar={handleSaveAvatar}
      />
      {loading && <div className="pointer-events-none absolute inset-0 grid place-items-center text-amber-100">載入咖啡廳中…</div>}
    </div>
  );
}

export default function App() {
  return <AuthGate>{(session) => <CafeRoom session={session} />}</AuthGate>;
}
