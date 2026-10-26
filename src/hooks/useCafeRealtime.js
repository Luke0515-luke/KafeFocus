import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabaseClient';

const HEARTBEAT_MS = 25_000;

const ERROR_TEXT = {
  seat_taken: '這個座位剛被別人坐走了',
  not_authenticated: '請先登入',
  no_seat: '你還沒有入座',
  invalid_status: '無效的狀態',
  profile_missing: '找不到你的個人檔案',
};

function toError(e) {
  const key = Object.keys(ERROR_TEXT).find((k) => e?.message?.includes(k));
  const err = new Error(key ? ERROR_TEXT[key] : e?.message ?? '發生未知錯誤');
  err.code = key ?? e?.code;
  return err;
}

const bySeatIndex = (a, b) => a.seat_index - b.seat_index;
const emptyPatch = {
  occupant_id: null, occupant_name: null, occupant_avatar_url: null,
  status: 'empty', task: null, phase_started_at: null, phase_ends_at: null,
};

/**
 * 監聽某間咖啡廳的座位即時異動，並提供入座 / 離座 / 切換狀態的動作。
 *
 * 即時層 = Postgres Changes（座位資料，權威來源）+ Presence（誰還在線，秒級反應）
 * 斷線層 = Presence 即時隱藏幽靈座位 → pagehide/unmount 主動釋放 → 伺服器 cron 兜底
 */
export function useCafeRealtime(cafeId, userId) {
  const [seats, setSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connection, setConnection] = useState('connecting'); // connecting | online | reconnecting | offline
  const [onlineIds, setOnlineIds] = useState(null);           // null = Presence 尚未同步

  const accessTokenRef = useRef(null);
  const mySeatIdRef = useRef(null);

  const guestKeyRef = useRef(`guest-${Math.random().toString(36).slice(2, 10)}`); // 訪客（未登入）只看不坐
  const mySeat = useMemo(() => (userId ? seats.find((s) => s.occupant_id === userId) ?? null : null), [seats, userId]);
  useEffect(() => { mySeatIdRef.current = mySeat?.id ?? null; }, [mySeat?.id]);

  // 合併單筆異動；用 updated_at 擋掉亂序到達的舊事件
  const mergeSeat = useCallback((row) => {
    setSeats((prev) => {
      const i = prev.findIndex((s) => s.id === row.id);
      if (i === -1) return [...prev, row].sort(bySeatIndex);
      if (new Date(prev[i].updated_at) > new Date(row.updated_at)) return prev;
      const next = [...prev];
      next[i] = { ...prev[i], ...row };
      return next;
    });
  }, []);

  const fetchSeats = useCallback(async () => {
    if (!cafeId) return;
    const { data, error: err } = await supabase
      .from('cafe_seats').select('*').eq('cafe_id', cafeId).order('seat_index');
    if (err) { setError(toError(err)); return; }
    setSeats(data ?? []);
    setError(null);
  }, [cafeId]);

  // ---- 訂閱：座位異動 + Presence ----
  useEffect(() => {
    if (!cafeId) return undefined;
    let cancelled = false;

    setLoading(true);
    fetchSeats().finally(() => { if (!cancelled) setLoading(false); });

    const channel = supabase.channel(`cafe:${cafeId}`, { config: { presence: { key: userId ?? guestKeyRef.current } } });

    channel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cafe_seats', filter: `cafe_id=eq.${cafeId}` },
        (payload) => { if (payload.new?.id) mergeSeat(payload.new); },
      )
      .on('presence', { event: 'sync' }, () => {
        setOnlineIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          setConnection('online');
          if (userId) await channel.track({ user_id: userId, at: Date.now() }); // 訪客不佔在線人數
          fetchSeats(); // 斷線重連後補抓，避免漏掉離線期間的異動
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnection('reconnecting'); // supabase-js 會自動重連
        } else if (status === 'CLOSED') {
          setConnection('offline');
        }
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setOnlineIds(null);
    };
  }, [cafeId, userId, fetchSeats, mergeSeat]);

  // ---- 追蹤 access token（pagehide 時要同步取用） ----
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { accessTokenRef.current = data.session?.access_token ?? null; });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      accessTokenRef.current = session?.access_token ?? null;
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // ---- 心跳：入座期間定時回報，伺服器 cron 靠它判斷誰是幽靈 ----
  useEffect(() => {
    if (!mySeat?.id) return undefined;
    const beat = () => { supabase.rpc('heartbeat').then(() => {}, () => {}); };
    beat();
    const id = setInterval(beat, HEARTBEAT_MS);
    return () => clearInterval(id);
  }, [mySeat?.id]);

  // ---- 分頁回到前景 / 從 bfcache 還原：重新同步 ----
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      fetchSeats();
      if (mySeatIdRef.current) supabase.rpc('heartbeat').then(() => {}, () => {});
    };
    const onPageShow = (e) => { if (e.persisted) fetchSeats(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [fetchSeats]);

  // ---- 關閉網頁 / 元件卸載 → 自動釋放座位 ----
  // supabase-js 的請求在頁面卸載時會被瀏覽器中斷，所以用 fetch + keepalive 直打 REST。
  useEffect(() => {
    const release = () => {
      if (!mySeatIdRef.current || !accessTokenRef.current) return;
      try {
        fetch(`${SUPABASE_URL}/rest/v1/rpc/release_my_seat`, {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessTokenRef.current}`,
          },
          body: '{}',
        }).catch(() => {});
      } catch { /* 忽略：伺服器 cron 會兜底 */ }
    };
    window.addEventListener('pagehide', release);
    return () => {
      window.removeEventListener('pagehide', release);
      release();
    };
  }, []);

  // ---- 動作 ----
  const claimSeat = useCallback(async (seatId) => {
    const { data, error: err } = await supabase.rpc('claim_seat', { p_seat_id: seatId });
    if (err) throw toError(err);
    // 換位時舊座位的清空事件也會由 Realtime 送達；這裡先套用自己的結果讓畫面立即反應
    setSeats((prev) => prev.map((s) => (s.occupant_id === userId && s.id !== seatId ? { ...s, ...emptyPatch } : s)));
    mergeSeat(data);
    return data;
  }, [mergeSeat, userId]);

  const leaveSeat = useCallback(async () => {
    const { error: err } = await supabase.rpc('release_my_seat');
    if (err) throw toError(err);
    setSeats((prev) => prev.map((s) => (s.occupant_id === userId ? { ...s, ...emptyPatch } : s)));
  }, [userId]);

  const setStatus = useCallback(async ({ status, task, durationSec }) => {
    const { data, error: err } = await supabase.rpc('set_seat_state', {
      p_status: status, p_task: task ?? '', p_duration_sec: durationSec ?? null,
    });
    if (err) throw toError(err);
    mergeSeat(data);
    return data;
  }, [mergeSeat]);

  // Presence 說已不在線的佔用者 → 畫面上視為空位（DB 由 cron 清理）
  const visibleSeats = useMemo(() => seats.map((s) => {
    if (!s.occupant_id || !onlineIds || onlineIds.has(s.occupant_id)) return s;
    return { ...s, ...emptyPatch, ghost: true };
  }), [seats, onlineIds]);

  return {
    seats: visibleSeats, mySeat, loading, error, connection,
    onlineCount: onlineIds?.size ?? 0,
    claimSeat, leaveSeat, setStatus, refetch: fetchSeats,
  };
}
