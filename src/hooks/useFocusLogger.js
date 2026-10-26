import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const RETRY_MS = [2000, 5000, 15000, 30000, 60000]; // 網路失敗時的重試間隔
const NOT_FINISHED_RETRY_MS = 2000;                 // 前後端時鐘有落差、伺服器說還沒到時，稍後再問
const MAX_NOT_FINISHED = 15;

/** SQL 還沒更新（沒有 log_my_finished_focus）時，退回舊的直接 insert，程式仍可運作 */
const rpcMissing = (e) => /log_my_finished_focus|schema cache|could not find the function|does not exist/i.test(e?.message ?? '');

/**
 * 專注階段「完整跑完」時確保寫入一筆 focus_logs，並通知畫面（onLogged）。
 *
 * 真正的保證在資料庫（focus_log_fix.sql 的 trigger + 每分鐘排程）：就算分頁在背景、手機鎖屏、
 * 關掉網頁，跑完的階段也會被補記。這裡負責「人還在線上」時的即時確認與回饋：
 *   - 時間到（setTimeout）、回到分頁 / 視窗取得焦點 / 網路恢復 / 從 bfcache 還原，都會檢查一次
 *   - 呼叫 RPC log_my_finished_focus，失敗會依 RETRY_MS 重試，全部失敗才回報 onError
 *   - 階段剛好跑完時使用者按了「休息」或離開，cleanup 仍會通知一次（紀錄已由 trigger 寫入）
 */
export function useFocusLogger({ mySeat, userId, cafeId, onLogged, onError }) {
  const cbRef = useRef({ onLogged, onError });
  cbRef.current = { onLogged, onError };
  const doneRef = useRef(null); // 已確認記錄的階段（以毫秒時間戳為 key，避免字串格式差異）

  const status = mySeat?.status;
  const startedAt = mySeat?.phase_started_at;
  const endsAt = mySeat?.phase_ends_at;
  const taskRef = useRef(mySeat?.task);
  taskRef.current = mySeat?.task;
  const cafeRef = useRef(cafeId);
  cafeRef.current = cafeId;

  useEffect(() => {
    if (!userId || status !== 'studying' || !startedAt || !endsAt) return undefined;
    const startMs = new Date(startedAt).getTime();
    const end = new Date(endsAt).getTime();
    const minutes = Math.round((end - startMs) / 60000);
    if (!(minutes >= 1)) return undefined;

    let cancelled = false;
    let busy = false;
    let failures = 0;
    let notFinished = 0;
    let timer = null;

    const schedule = (ms) => { clearTimeout(timer); timer = setTimeout(attempt, Math.max(0, ms)); };
    const finish = (result) => {
      if (doneRef.current === startMs) return;
      doneRef.current = startMs;
      cbRef.current.onLogged?.({ minutes, task: taskRef.current ?? null, startedAt, result });
    };
    const fail = (message) => {
      if (failures < RETRY_MS.length) { schedule(RETRY_MS[failures++]); return; }
      cbRef.current.onError?.(message);
    };

    async function attempt() {
      if (cancelled || busy || doneRef.current === startMs) return;
      const left = end - Date.now();
      if (left > 1000) { schedule(left + 300); return; } // 還沒到時間（被事件提早喚醒）
      busy = true;
      try {
        const { data, error } = await supabase.rpc('log_my_finished_focus');
        if (error) {
          if (rpcMissing(error)) {
            // 舊版資料庫：直接 insert（started_at 用原始字串，才會和唯一鍵一致）
            const ins = await supabase.from('focus_logs').insert({
              user_id: userId, cafe_id: cafeRef.current ?? null, task: taskRef.current ?? null, minutes, started_at: startedAt,
            });
            if (!ins.error || ins.error.code === '23505') finish('legacy');
            else fail(ins.error.message);
          } else {
            fail(error.message);
          }
          return;
        }
        const result = data?.result;
        if (result === 'logged' || result === 'already') finish(result);
        else if (result === 'not_finished') {
          if (++notFinished <= MAX_NOT_FINISHED) schedule(NOT_FINISHED_RETRY_MS);
          else fail('伺服器回報這一輪還沒結束');
        } else if (result === 'no_seat' || result === 'not_studying') finish('server'); // 座位已變更：紀錄由資料庫 trigger 寫入
        else fail('專注紀錄寫入失敗');
      } catch (e) {
        fail(e?.message ?? '網路錯誤');
      } finally {
        busy = false;
      }
    }

    const wake = () => { if (document.visibilityState === 'visible') attempt(); };
    schedule(end - Date.now() + 300);
    document.addEventListener('visibilitychange', wake);
    window.addEventListener('focus', wake);
    window.addEventListener('online', wake);
    window.addEventListener('pageshow', wake);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('focus', wake);
      window.removeEventListener('online', wake);
      window.removeEventListener('pageshow', wake);
      // 階段已跑完（3 秒內視為跑完）才被切換 / 離開：資料庫 trigger 已負責記錄，這裡只補通知
      if (doneRef.current !== startMs && Date.now() >= end - 3000) finish('server');
    };
  }, [userId, status, startedAt, endsAt]);
}
