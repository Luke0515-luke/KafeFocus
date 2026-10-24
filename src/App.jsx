import { useCallback, useEffect, useState } from 'react';
import AuthGate from './components/AuthGate';
import CafeLobby from './components/CafeLobby';
import CalendarPanel from './components/CalendarPanel';
import MusicPlayer from './components/MusicPlayer';
import CafeScene from './components/cafe/CafeScene';
import ControlPanel from './components/cafe/ControlPanel';
import { useCafeRealtime } from './hooks/useCafeRealtime';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { useFocusLogger } from './hooks/useFocusLogger';
import { PLAYLIST } from './config/playlist';
import { getMeta, getTheme } from './config/themes';
import { supabase } from './lib/supabaseClient';

/* 簡單的 hash 路由：#/cafe/<slug> 是咖啡廳房間，其餘是大廳。瀏覽器上一頁可以回大廳。 */
const parseHash = () => {
  const m = window.location.hash.match(/^#\/cafe\/([a-z0-9-]+)$/i);
  return m ? m[1] : null;
};

function useCafeRoute() {
  const [slug, setSlug] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setSlug(parseHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const go = useCallback((next) => { window.location.hash = next ? `#/cafe/${next}` : ''; }, []);
  return [slug, go];
}

function CafeRoom({ slug, session, onBack, onSignOut, onOpenCalendar }) {
  const userId = session.user.id;
  const theme = getTheme(slug);
  const [cafe, setCafe] = useState(undefined); // undefined 讀取中 / null 找不到
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from('cafes').select('*').eq('slug', slug).maybeSingle(),
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      ]);
      if (!alive) return;
      if (c.error) { setNotice(`讀取咖啡廳失敗：${c.error.message}`); setCafe(null); } else setCafe(c.data);
      if (p.error) setNotice(`讀取個人檔案失敗：${p.error.message}`); else setProfile(p.data);
    })();
    return () => { alive = false; };
  }, [slug, userId]);

  const {
    seats, mySeat, loading, error, connection, onlineCount,
    claimSeat, leaveSeat, setStatus,
  } = useCafeRealtime(cafe?.id, userId);

  useFocusLogger({ mySeat, userId, cafeId: cafe?.id });

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

  // 登出前先離座：登出後 token 失效，卸載時的自動釋放就打不到資料庫了
  const handleSignOut = useCallback(async () => {
    try { await leaveSeat(); } catch { /* 沒有座位或網路問題：伺服器 cron 會兜底 */ }
    await onSignOut();
  }, [leaveSeat, onSignOut]);

  if (cafe === null) {
    return (
      <div className="grid h-screen place-items-center bg-stone-900 text-stone-300">
        <div className="space-y-3 text-center">
          <p>找不到這間咖啡廳。</p>
          {notice && <p className="text-xs text-rose-400">{notice}</p>}
          <button type="button" onClick={onBack} className="rounded-lg bg-stone-800 px-4 py-2 text-sm hover:bg-stone-700">回到大廳</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-stone-900">
      <CafeScene seats={seats} currentUserId={userId} onSeatSelect={handleSeatSelect} theme={theme} />
      <ControlPanel
        cafeName={cafe?.name ?? getMeta(slug).name}
        profile={profile}
        mySeat={mySeat}
        connection={connection}
        onlineCount={onlineCount}
        notice={notice || error?.message}
        onSetStatus={(status, task, sec) => setStatus({ status, task, durationSec: sec })}
        onLeave={leaveSeat}
        onSaveAvatar={handleSaveAvatar}
        onBack={onBack}
        onSignOut={handleSignOut}
        onOpenCalendar={onOpenCalendar}
      />
      {(cafe === undefined || loading) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-amber-100">載入咖啡廳中…</div>
      )}
    </div>
  );
}

function Main({ session }) {
  const [slug, go] = useCafeRoute();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const openCalendar = useCallback(() => setCalendarOpen(true), []);

  return (
    <>
      {slug ? (
        <CafeRoom key={slug} slug={slug} session={session} onBack={() => go(null)} onSignOut={signOut} onOpenCalendar={openCalendar} />
      ) : (
        <CafeLobby session={session} onSelect={go} onSignOut={signOut} onOpenCalendar={openCalendar} />
      )}
      {calendarOpen && <CalendarPanel userId={session.user.id} onClose={() => setCalendarOpen(false)} />}
    </>
  );
}

export default function App() {
  const music = useBackgroundMusic(PLAYLIST); // 放在最上層：大廳與房間之間切換時音樂不會中斷
  return (
    <>
      <AuthGate>{(session) => <Main session={session} />}</AuthGate>
      <MusicPlayer music={music} />
    </>
  );
}
