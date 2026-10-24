import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * 專注階段「完整跑完」時，寫入一筆 focus_logs（行事曆會顯示每天專注分鐘數）。
 * 中途離座、換狀態或關網頁都不會記錄；(user_id, started_at) 唯一，多個分頁也不會重複。
 */
export function useFocusLogger({ mySeat, userId, cafeId }) {
  const loggedRef = useRef(null);
  const status = mySeat?.status;
  const startedAt = mySeat?.phase_started_at;
  const endsAt = mySeat?.phase_ends_at;
  const task = mySeat?.task;

  useEffect(() => {
    if (!userId || status !== 'studying' || !startedAt || !endsAt) return undefined;
    const end = new Date(endsAt).getTime();
    const minutes = Math.round((end - new Date(startedAt).getTime()) / 60000);
    if (minutes < 1) return undefined;

    const timer = setTimeout(async () => {
      if (loggedRef.current === startedAt) return;
      loggedRef.current = startedAt;
      const { error } = await supabase.from('focus_logs').insert({
        user_id: userId, cafe_id: cafeId ?? null, task: task ?? null, minutes, started_at: startedAt,
      });
      if (error && error.code !== '23505') console.warn('[focus_logs] 寫入失敗：', error.message);
    }, Math.max(0, end - Date.now()) + 500);

    return () => clearTimeout(timer);
  }, [userId, cafeId, status, startedAt, endsAt, task]);
}
