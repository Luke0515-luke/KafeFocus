import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import AuthGate from './components/AuthGate';
import AuthPanel from './components/AuthPanel';
import ForumPanel from './components/ForumPanel';
import CreditsPanel from './components/CreditsPanel';
import CafeLobby from './components/CafeLobby';
import CalendarPanel from './components/CalendarPanel';
import PlannerPanel from './components/PlannerPanel';
import { LeaderboardPanel, UserCard } from './components/SocialPanels';
import ChatPanel from './components/ChatPanel';
import MusicPlayer from './components/MusicPlayer';
const CafeScene = lazy(() => import('./components/cafe/CafeScene')); // 3D 引擎很大：進咖啡廳才下載，大廳秒開
import ControlPanel from './components/cafe/ControlPanel';
import { useCafeRealtime } from './hooks/useCafeRealtime';
import { useBackgroundMusic } from './hooks/useBackgroundMusic';
import { useFocusLogger } from './hooks/useFocusLogger';
import { usePlayers } from './hooks/usePlayers';
import { PLAYLIST } from './config/playlist';
import { getMeta, getTheme } from './config/themes';
import { supabase } from './lib/supabaseClient';
import { loadOutfit, persistOutfit } from './lib/outfit';
import { beanInfo } from './lib/openProfile';

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

function CafeRoom({ slug, session, onBack, onSignOut, onSignIn, onRequireAuth, onOpenCalendar, onOpenPlanner, onOpenBoard, onOpenForum }) {
  const userId = session?.user?.id ?? null; // null = 訪客（只能看，不能入座 / 聊天）
  const isGuest = !userId;
  const theme = getTheme(slug);
  const [cafe, setCafe] = useState(undefined); // undefined 讀取中 / null 找不到
  const [profile, setProfile] = useState(null);
  const [notice, setNotice] = useState('');
  const [outfit, setOutfit] = useState(() => loadOutfit(session?.user ?? { id: 'guest' }));
  const handleOutfit = useCallback((next) => { setOutfit(next); persistOutfit(supabase, next); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from('cafes').select('*').eq('slug', slug).maybeSingle(),
        userId ? supabase.from('profiles').select('*').eq('id', userId).maybeSingle() : Promise.resolve({ data: null, error: null }),
      ]);
      if (!alive) return;
      if (c.error) { setNotice(`讀取咖啡廳失敗：${c.error.message}`); setCafe(null); } else setCafe(c.data);
      if (p.error) setNotice(`讀取個人檔案失敗：${p.error.message}`); else setProfile(p.data);
    })();
    return () => { alive = false; };
  }, [slug, userId]);

  // 用戶名：個人檔案 → 註冊時填的顯示名稱 → Email 前綴（聊天室、名牌都用它，不再顯示「同學」）
  const userName = profile?.display_name ?? session?.user?.user_metadata?.display_name ?? session?.user?.email?.split('@')[0] ?? null;

  const {
    seats, mySeat, loading, error, connection, onlineCount,
    claimSeat, leaveSeat, setStatus,
  } = useCafeRealtime(cafe?.id, userId);

  // 今天還沒完成的計畫區塊：可在專注面板一鍵開始，跑完一輪會自動勾選並加經驗值
  const [planToday, setPlanToday] = useState([]);
  const [toast, setToast] = useState('');
  const linkedRef = useRef(null);
  const loadPlan = useCallback(async () => {
    if (!userId) { setPlanToday([]); return; }
    const today = new Date(); const pad = (n) => String(n).padStart(2, '0');
    const key = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const { data, error: e } = await supabase.from('study_sessions')
      .select('id, minutes, kind, start_time, study_items(title)').eq('plan_date', key).eq('done', false).order('start_time');
    if (!e) setPlanToday((data ?? []).map((s) => ({ id: s.id, minutes: s.minutes, kind: s.kind, title: s.study_items?.title ?? '' })));
  }, [userId]);
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
    setToast(`✅ 計畫區塊完成　+${data.xp_gained} XP${bonus ? `　${bonus}` : ''}${data.level > data.prev_level ? `　🎉 升級 Lv.${data.level} ${beanInfo(data.level).emoji}${beanInfo(data.level).name}` : ''}`);
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
    cafeId: cafe?.id, userId, name: userName, avatarUrl: profile?.avatar_url,
    theme, mySeat, onSit: handleSit, outfit,
  });
  const handleSeatSelect = useCallback((seat) => {
    setNotice('');
    if (isGuest) { onRequireAuth('入座要先登入／註冊，註冊完就能選位子開始讀書。'); return; }
    players.sitAt(seat);
  }, [players, isGuest, onRequireAuth]);
  const handleFloorClick = useCallback((x, z) => {
    if (isGuest) { setNotice('目前是訪客模式，可以看大家讀書；登入後才能在咖啡廳裡走動、入座。'); return; }
    if (mySeat) { setNotice('要先按「離座」站起來，才能在咖啡廳裡走動。'); return; }
    players.walkTo(x, z);
  }, [mySeat, players, isGuest]);

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
      <Suspense fallback={<div className="absolute inset-0 grid place-items-center text-amber-100">準備咖啡廳場景…</div>}>
      <CafeScene
        seats={seats} currentUserId={userId ?? 'guest'} onSeatSelect={handleSeatSelect} theme={theme}
        players={players} selfName={userName} selfAvatarUrl={profile?.avatar_url} onFloorClick={handleFloorClick}
      />
      </Suspense>
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
        isGuest={isGuest}
        onSignIn={() => onSignIn()}
        onOpenCalendar={onOpenCalendar}
        onOpenPlanner={onOpenPlanner}
        onOpenBoard={onOpenBoard}
        onOpenForum={onOpenForum}
        planToday={planToday}
        onFocusPlan={(id) => { linkedRef.current = id; }}
      />
      {toast && <div className="pointer-events-none absolute left-1/2 top-4 z-40 -translate-x-1/2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-stone-950 shadow-xl">{toast}</div>}
      <ChatPanel
        title={userName ?? '訪客'} messages={players.messages} myId={userId} onSend={players.sendChat}
        readOnly={isGuest} onRequireAuth={() => onRequireAuth('聊天要先登入／註冊，登入後就能和大家說話。')}
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
  const [plannerOpen, setPlannerOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [forumOpen, setForumOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [authHint, setAuthHint] = useState(null); // null = 不顯示登入視窗；字串 = 顯示並附上原因
  const [profileId, setProfileId] = useState(null);
  useEffect(() => {
    const h = (e) => setProfileId(e.detail);
    window.addEventListener('kf-open-profile', h);
    return () => window.removeEventListener('kf-open-profile', h);
  }, []);
  // Esc 關閉最上層的視窗（電腦鍵盤用）
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (authHint !== null) setAuthHint(null);
      else if (creditsOpen) setCreditsOpen(false);
      else if (profileId) setProfileId(null);
      else if (forumOpen) setForumOpen(false);
      else if (boardOpen) setBoardOpen(false);
      else if (plannerOpen) setPlannerOpen(false);
      else if (calendarOpen) setCalendarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [authHint, creditsOpen, profileId, forumOpen, boardOpen, plannerOpen, calendarOpen]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);
  const requireAuth = useCallback((hint = '') => setAuthHint(hint || '登入後就能使用完整功能。'), []);
  useEffect(() => { if (session) setAuthHint(null); }, [session]); // 登入成功 → 自動關掉視窗
  // 只有「新增行程 / 讀書計畫」才需要帳號：沒登入的人按下去才跳出註冊
  const openCalendar = useCallback(() => {
    if (!session) { requireAuth('新增行程需要先登入／註冊，註冊只要一分鐘。'); return; }
    setCalendarOpen(true);
  }, [session, requireAuth]);
  const openPlanner = useCallback(() => {
    if (!session) { requireAuth('排讀書計畫需要先登入／註冊，註冊只要一分鐘。'); return; }
    setPlannerOpen(true);
  }, [session, requireAuth]);
  const openForum = useCallback(() => setForumOpen(true), []);
  const signIn = useCallback((hint) => requireAuth(hint || '登入或註冊 KafeFocus。'), [requireAuth]);

  return (
    <>
      {slug ? (
        <CafeRoom key={slug} slug={slug} session={session} onBack={() => go(null)} onSignOut={signOut} onSignIn={signIn} onRequireAuth={requireAuth} onOpenCalendar={openCalendar} onOpenPlanner={openPlanner} onOpenBoard={() => setBoardOpen(true)} onOpenForum={openForum} />
      ) : (
        <CafeLobby onOpenCredits={() => setCreditsOpen(true)} session={session} onSelect={go} onSignOut={signOut} onSignIn={signIn} onOpenCalendar={openCalendar} onOpenPlanner={openPlanner} onOpenBoard={() => setBoardOpen(true)} onOpenForum={openForum} />
      )}
      {calendarOpen && session && <CalendarPanel userId={session.user.id} onClose={() => setCalendarOpen(false)} />}
      {plannerOpen && session && <PlannerPanel userId={session.user.id} onClose={() => setPlannerOpen(false)} />}
      {boardOpen && <LeaderboardPanel myId={session?.user?.id ?? null} onClose={() => setBoardOpen(false)} />}
      {forumOpen && <ForumPanel userId={session?.user?.id ?? null} onClose={() => setForumOpen(false)} onRequireAuth={requireAuth} />}
      {creditsOpen && <CreditsPanel onClose={() => setCreditsOpen(false)} />}
      {profileId && <UserCard userId={profileId} myId={session?.user?.id ?? null} onClose={() => setProfileId(null)} />}
      {authHint !== null && <AuthPanel modal hint={authHint} onClose={() => setAuthHint(null)} />}
    </>
  );
}

export default function App() {
  const music = useBackgroundMusic(PLAYLIST); // 放在最上層：大廳與房間之間切換時音樂不會中斷
  return (
    <>
      <AuthGate>{(session) => <Main session={session} />}</AuthGate> {/* session 為 null = 訪客，可瀏覽 */}
      <MusicPlayer music={music} />
    </>
  );
}
