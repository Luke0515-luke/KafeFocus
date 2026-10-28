import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { DEFAULT_GOAL, clampGoal, summarize } from '../lib/focusStats';

const GOAL_KEY = 'kf_daily_goal';
const GOAL_EVENT = 'kf:goal-change';
const readGoal = () => { try { return clampGoal(window.localStorage.getItem(GOAL_KEY) || DEFAULT_GOAL); } catch { return DEFAULT_GOAL; } };

/** 專注統計（最近 120 天的 focus_logs）+ 每日目標（存在這台裝置的 localStorage，不需要資料庫）。 */
export function useFocusStats(userId) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false); // 第一次成功載入完成（用來避免一進咖啡廳就誤報「目標達成」）
  const [goal, setGoalState] = useState(readGoal);

  const reload = useCallback(async () => {
    if (!userId) { setLogs([]); setLoaded(false); return; }
    const since = new Date(); since.setDate(since.getDate() - 120); since.setHours(0, 0, 0, 0);
    setLoading(true);
    const { data, error } = await supabase.from('focus_logs').select('minutes, started_at')
      .gte('started_at', since.toISOString()).order('started_at', { ascending: false }).limit(1000);
    if (!error) { setLogs(data ?? []); setLoaded(true); }
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  // 同一台裝置上的多個地方（咖啡廳面板、統計視窗）共用同一個目標
  useEffect(() => {
    const sync = () => setGoalState(readGoal());
    window.addEventListener(GOAL_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener(GOAL_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);

  const setGoal = useCallback((v) => {
    const g = clampGoal(v);
    try { window.localStorage.setItem(GOAL_KEY, String(g)); } catch { /* 無痕模式略過 */ }
    setGoalState(g);
    window.dispatchEvent(new Event(GOAL_EVENT));
  }, []);

  const summary = useMemo(() => summarize(logs, goal), [logs, goal]);
  return { summary, goal, setGoal, loading, loaded, reload };
}
