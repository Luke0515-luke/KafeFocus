import { useCallback, useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { sanitizeAvatarUrl } from "./lib/avatarUrl";
import { useAuth } from "./hooks/useAuth";
import { useCafeRealtime } from "./hooks/useCafeRealtime";
import AuthPanel from "./components/AuthPanel";
import CafeScene from "./components/cafe/CafeScene";
import ControlPanel from "./components/cafe/ControlPanel";

const CAFE_SLUG = "main-street";

function Cafe({ user }) {
  const [cafeId, setCafeId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const { seats, mySeat, loading, error, connection, onlineCount, claimSeat, leaveSeat, setStatus } =
    useCafeRealtime(cafeId, user.id);

  useEffect(() => {
    supabase.from("cafes").select("id").eq("slug", CAFE_SLUG).single().then(({ data, error: err }) => {
      if (err) setToast("找不到咖啡廳，請確認已執行 schema.sql");
      else setCafeId(data.id);
    });
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => setProfile(data));
  }, [user.id]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const run = useCallback(async (fn) => {
    setBusy(true);
    try { await fn(); } catch (e) { setToast(e.message); } finally { setBusy(false); }
  }, []);

  const saveAvatar = (raw) => run(async () => {
    const url = sanitizeAvatarUrl(raw);
    if (!url) throw new Error("網址必須是 https://models.readyplayer.me/xxxx.glb");
    const { data, error: err } = await supabase.from("profiles")
      .update({ avatar_url: url, updated_at: new Date().toISOString() })
      .eq("id", user.id).select().single();
    if (err) throw err;
    setProfile(data);
    if (mySeat) await claimSeat(mySeat.id); // 重新入座同一位 = 刷新頭像快照
    setToast("頭像已更新");
  });

  return (
    <div className="relative h-full w-full">
      {cafeId && <CafeScene seats={seats} mySeatId={mySeat?.id} onSeatClick={(s) => run(() => claimSeat(s.id))} />}
      {(loading || !cafeId) && (
        <div className="absolute inset-0 flex items-center justify-center text-stone-400">載入咖啡廳中…</div>
      )}
      <ControlPanel
        mySeat={mySeat}
        connection={connection}
        onlineCount={onlineCount}
        busy={busy}
        displayName={profile?.display_name}
        onStudy={({ task, minutes }) => run(() => setStatus({ status: "studying", task, durationSec: minutes * 60 }))}
        onBreak={() => run(() => setStatus({ status: "break", task: "", durationSec: 300 }))}
        onLeave={() => run(leaveSeat)}
        onSaveAvatar={saveAvatar}
        onSignOut={async () => { await leaveSeat().catch(() => {}); await supabase.auth.signOut(); }}
      />
      {(toast || error) && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-stone-800 px-4 py-2 text-sm shadow-lg">
          {toast ?? error.message}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-full items-center justify-center text-stone-400">載入中…</div>;
  return user ? <Cafe user={user} /> : <AuthPanel />;
}
