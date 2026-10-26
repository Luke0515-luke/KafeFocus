import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * 只負責「讀取登入狀態」：不再擋住沒登入的人。
 * 沒登入（訪客）時 session 為 null，children(session) 照常渲染，讓大家先逛逛；
 * 需要帳號的動作（新增行程 / 入座 / 聊天 / 發文）再由 App 跳出登入／註冊視窗。
 */
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 還在讀取

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session ?? null); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  if (session === undefined) {
    return <div className="grid h-[100dvh] place-items-center bg-stone-900 text-stone-400">載入中…</div>;
  }
  return children(session);
}
