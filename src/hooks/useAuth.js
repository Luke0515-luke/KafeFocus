import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/** 目前登入狀態；session === undefined 代表還在讀取。 */
export function useAuth() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading: session === undefined };
}
