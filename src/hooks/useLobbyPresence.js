import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../lib/supabaseClient';

/**
 * 大廳專用：旁聽每間咖啡廳的 Presence（只看、不 track，所以不會算進任何人數）。
 * 回傳 { [cafeId]: Set<userId> }；還沒同步的咖啡廳不會出現在結果裡。
 *
 * 為什麼用另一個獨立的 client：supabase-js 對「同名 topic」會回傳同一個 channel 物件，
 * 若大廳和咖啡廳共用主 client，進出咖啡廳時會撞到還沒關乾淨的舊頻道，造成訂閱失敗。
 * 獨立 client 有自己的連線與頻道清單；而且大廳與咖啡廳不會同時存在，所以同一時間仍只有一條 Realtime 連線。
 */
export function useLobbyPresence(cafeIds) {
  const [state, setState] = useState({});
  const key = (cafeIds ?? []).join(',');

  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    setState({});
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'kf-lobby-presence' },
      realtime: { params: { eventsPerSecond: 2 } },
    });
    const me = `lobby-${Math.random().toString(36).slice(2, 10)}`;
    key.split(',').forEach((id) => {
      const ch = client.channel(`cafe:${id}`, { config: { presence: { key: me } } });
      const update = () => {
        if (!alive) return;
        // 只認真正 track 過的使用者（key = userId）；旁聽的大廳連線與訪客本來就不會出現在這裡
        const ids = new Set(Object.keys(ch.presenceState()).filter((k) => !k.startsWith('lobby-') && !k.startsWith('guest-')));
        setState((prev) => ({ ...prev, [id]: ids }));
      };
      ch.on('presence', { event: 'sync' }, update).subscribe();
    });

    return () => {
      alive = false;
      client.removeAllChannels();
      client.realtime.disconnect();
    };
  }, [key]);

  return state;
}
