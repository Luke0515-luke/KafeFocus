import { useCallback, useEffect, useRef, useState } from 'react';
import AuthGate from './components/AuthGate';
import CafeLobby from './components/CafeLobby';
import CalendarPanel from './components/CalendarPanel';
import PlannerPanel from './components/PlannerPanel';
import { LeaderboardPanel, UserCard } from './components/SocialPanels';
import ChatPanel from './components/ChatPanel';
import MusicPlayer from './components/MusicPlayer';
import CafeScene from './components/cafe/CafeScene';
import ControlPanel from './components/cafe/ControlPanel';
import { useCafeRealtime } from './hooks/useCafeRealtime';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { useFocusLogger } from './hooks/useFocusLogger';
import { usePlayers } from './hooks/usePlayers';
import { PLAYLIST } from './config/playlist';
import { getMeta, getTheme } from './config/themes';
import { supabase } from './lib/supabaseClient';
import { loadOutfit, persistOutfit } from './lib/outfit';

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

function CafeRoom({ slug, session, onBack, onSignOut, onOpenCalendar, onOpenPlanner, onOpenBoard }) {
  const userId = session.user.id;
  const theme = getTheme(slug);
  const [cafe, setCafe] = useState(undefined); // undefined 讀取中 / null 找不到
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState('');
  const [outfit, setOutfit] = useState(() => loadOutfit(session.user));
  const handleOutfit = useCallback((next) => { setOutfit(next); persistOutfit(supabase, next); }, []);

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

  // 今天還沒完成的計畫區塊：可在專注面板一鍵開始，跑完一輪會自動勾選並加經驗值
  const [planToday, setPlanToday] = useState([]);
  const [toast, setToast] = useState('');
  const linkedRef = useRef(null);
  const loadPlan = useCallback(async () => {
    const today = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const { data, error: e } = await supabase.from('study_sessions')
      .select('id, minutes, kind, start_time, study_items(title)').eq('plan_date', key).eq('done', false).order('start_time');
    if (!e) setPlanToday((data ?? []).map((s) => ({ id: s.id, minutes: s.minutes, kind: s.kind, title: s.study_items?.title ?? '' })));
  }, []);
  useEffect(() => { loadPlan(); }, [loadPlan]);
  useEffect(() => { if (!toast) return undefined; const t = setTimeout(() => setToast(''), 6000); return () => clearTimeout(t); }, [toast]);

  const handleFocusLogged = useCallback(async () => {
    const id = linkedRef.current;
    if (!id) return;
    linkedRef.current = null;
    const d = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const { data, error: e } = await supabase.rpc('complete_study_session', { p_session_id: id, p_today: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, p_done: true });
    if (e || !data || data.already) return;
    const bonus = (data.bonuses ?? []).map((b) => `${b.label} +${b.xp}`).join('、');
    setToast(`✅ 計畫區塊完成　+${data.xp_gained} XP${bonus ? `　${bonus}` : ''}${data.level > data.prev_level ? `　🎉 升級 Lv.${data.level}` : ''}`);
    loadPlan();
  }, [loadPlan]);

  useFocusLogger({ mySeat, userId, cafeId: cafe?.id, onLogged: handleFocusLogged });

  // 真正入座（走到椅子旁邊之後，或已經坐著要換位時呼叫）
  const handleSit = useCallback(async (seat) => {
    setNotice('');
    try { await claimSeat(seat.id); } catch (e) { setNotice(e.message); }
  }, [claimSeat]);

  // 站著 / 走動 / 聊天
  const players = usePlayers({
    cafeId: cafe?.id, userId, name: profile?.display_name, avatarUrl: profile?.avatar_url,
    theme, mySeat, onSit: handleSit, outfit,
  });
  const handleSeatSelect = useCallback((seat) => { setNotice(''); players.sitAt(seat); }, [players]);
  const handleFloorClick = useCallback((x, z) => {
    if (mySeat) { setNotice('要先按「離座」站起來，才能在咖啡廳裡走動。'); return; }
    players.walkTo(x, z);
  }, [mySeat, players]);

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
      <div className="grid h-[100dvh] place-items-center bg-stone-900 text-stone-300">
        <div className="space-y-3 text-center">
          <p>找不到這間咖啡廳。</p>
          {notice && <p className="text-xs text-rose-400">{notice}</p>}
          <button type="button" onClick={onBack} className="rounded-lg bg-stone-800 px-4 py-2 text-sm hover:bg-stone-700">回到大廳</button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-stone-900">
      <CafeScene
        seats={seats} currentUserId={userId} onSeatSelect={handleSeatSelect} theme={theme}
        players={players} selfName={profile?.display_name} selfAvatarUrl={profile?.avatar_url} onFloorClick={handleFloorClick}
      />
      <ControlPanel
        cafeName={cafe?.name ?? getMeta(slug).name}
        profile={profile}
        mySeat={mySeat}
        connection={connection}
        onlineCount={onlineCount}
        notice={notice || error?.message}
        userId={userId}
        outfit={outfit}
        onOutfitChange={handleOutfit}
        onSetStatus={(status, task, sec) => setStatus({ status, task, durationSec: sec })}
        onLeave={leaveSeat}
        onSaveAvatar={handleSaveAvatar}
        onBack={onBack}
        onSignOut={handleSignOut}
        onOpenCalendar={onOpenCalendar}
        onOpenPlanner={onOpenPlanner}
        onOpenBoard={onOpenBoard}
        planToday={planToday}
        onFocusPlan={(id) => { linkedRef.current = id; }}
      />
      {toast && <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 shadow-xl">{toast}</div>}
      <ChatPanel messages={players.messages} myId={userId} onSend={players.sendChat} />
      {(cafe === undefined || loading) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-amber-100">載入咖啡廳中…</div>
      )}
    </div>
  );
}

function Main({ session }) {
  const [slug, go] = useCafeRoute();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [profileId, setProfileId] = useState(null);
  useEffect(() => {
    const h = (e) => setProfileId(e.detail);
    window.addEventListener('kf-open-profile', h);
    return () => window.removeEventListener('kf-open-profile', h);
  }, []);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const openCalendar = useCallback(() => setCalendarOpen(true), []);

  return (
    <>
      {slug ? (
        <CafeRoom key={slug} slug={slug} session={session} onBack={() => go(null)} onSignOut={signOut} onOpenCalendar={openCalendar} onOpenPlanner={() => setPlannerOpen(true)} onOpenBoard={() => setBoardOpen(true)} />
      ) : (
        <CafeLobby session={session} onSelect={go} onSignOut={signOut} onOpenCalendar={openCalendar} onOpenPlanner={() => setPlannerOpen(true)} onOpenBoard={() => setBoardOpen(true)} />
      )}
      {calendarOpen && <CalendarPanel userId={session.user.id} onClose={() => setCalendarOpen(false)} />}
      {plannerOpen && <PlannerPanel userId={session.user.id} onClose={() => setPlannerOpen(false)} />}
      {boardOpen && <LeaderboardPanel myId={session.user.id} onClose={() => setBoardOpen(false)} />}
      {profileId && <UserCard userId={profileId} myId={session.user.id} onClose={() => setProfileId(null)} />}
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
