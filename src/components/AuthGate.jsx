import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import AuthPanel from './AuthPanel'; // 你原本的登入／註冊面板，直接沿用

/**
 * 只負責「有沒有登入」：未登入顯示 AuthPanel，登入後用 render prop 把 session 交給子元件。
 * AuthPanel 登入／註冊成功後不需要回呼，這裡的 onAuthStateChange 會自動收到新 session。
 */
export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = 還在讀取

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setSession(data.session); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  // AuthPanel 用 h-full 置中，所以外層要給它高度與深色底
  if (session === undefined) {
    return <div className="grid h-[100dvh] place-items-center bg-stone-900 text-stone-400">載入中…</div>;
  }
  if (!session) {
    return <div className="h-[100dvh] bg-stone-900 text-stone-100"><AuthPanel /></div>;
  }
  return children(session);
}
