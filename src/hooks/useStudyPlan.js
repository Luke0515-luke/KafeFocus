import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { dateKey, generatePlan, mergePrefs, toMin } from '../lib/scheduler';

const COLORS = ['#f59e0b', '#10b981', '#0ea5e9', '#f43f5e', '#8b5cf6', '#14b8a6', '#f97316', '#ec4899'];
const friendly = (m = '') => (/study_items|study_sessions|study_prefs|study_rewards|schema cache|does not exist|replace_study_plan/i.test(m)
  ? '資料庫還沒有讀書計畫的資料表：請到 Supabase → SQL Editor 執行 study_planner.sql 一次。' : m);

/** 讀書項目 / 自動排程 / 完成與獎勵。排程在瀏覽器算（src/lib/scheduler.js），寫入走 RPC。 */
export function useStudyPlan(userId) {
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [prefs, setPrefs] = useState(mergePrefs());
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  const load = useCallback(async () => {
    const [it, se, pr, rw] = await Promise.all([
      supabase.from('study_items').select('*').order('deadline').order('created_at'),
      supabase.from('study_sessions').select('*').order('plan_date').order('start_time'),
      supabase.from('study_prefs').select('prefs').maybeSingle(),
      supabase.from('study_rewards').select('xp'),
    ]);
    const err = it.error || se.error || pr.error || rw.error;
    if (err) { setError(friendly(err.message)); setLoading(false); return null; }
    setError('');
    setItems(it.data ?? []);
    setSessions(se.data ?? []);
    setPrefs(mergePrefs(pr.data?.prefs));
    setXp((rw.data ?? []).reduce((a, r) => a + r.xp, 0));
    setLoading(false);
    return { items: it.data ?? [], prefs: mergePrefs(pr.data?.prefs) };
  }, []);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  /** 抓最新資料 → 重新排程 → 取代所有「未完成」區塊（已完成的保留） */
  const regenerate = useCallback(async (override) => {
    const now = new Date();
    const today = dateKey(now);
    const [it, done, pr, ev] = await Promise.all([
      supabase.from('study_items').select('*'),
      supabase.from('study_sessions').select('*').eq('done', true),
      supabase.from('study_prefs').select('prefs').maybeSingle(),
      supabase.from('calendar_events').select('event_date, start_time').eq('done', false).not('start_time', 'is', null).gte('event_date', today),
    ]);
    const e = it.error || done.error || pr.error;
    if (e) throw new Error(friendly(e.message));
    const p = override ?? mergePrefs(pr.data?.prefs);
    const busyList = (ev.data ?? []).map((r) => ({ date: r.event_date, start: toMin(r.start_time.slice(0, 5)), end: toMin(r.start_time.slice(0, 5)) + p.busyMin }));
    const plan = generatePlan({ items: it.data ?? [], doneSessions: done.data ?? [], prefs: p, now, busy: busyList });
    const { error: rpcErr } = await supabase.rpc('replace_study_plan', { p_sessions: plan.sessions });
    if (rpcErr) throw new Error(friendly(rpcErr.message));
    setWarnings(plan.warnings);
    await load();
    return plan;
  }, [load]);

  const wrap = useCallback(async (fn) => {
    setBusy(true); setError('');
    try { return await fn(); } catch (e) { setError(friendly(e.message)); return null; } finally { setBusy(false); }
  }, []);

  const addItem = useCallback((f) => wrap(async () => {
    const { error: err } = await supabase.from('study_items').insert({ ...f, color: COLORS[items.length % COLORS.length] });
    if (err) throw new Error(err.message);
    await regenerate();
  }), [wrap, regenerate, items.length]);

  const removeItem = useCallback((id) => wrap(async () => {
    const { error: err } = await supabase.from('study_items').delete().eq('id', id);
    if (err) throw new Error(err.message);
    await regenerate();
  }), [wrap, regenerate]);

  const savePrefs = useCallback((next) => wrap(async () => {
    const { error: err } = await supabase.from('study_prefs').upsert({ user_id: userId, prefs: next });
    if (err) throw new Error(err.message);
    await regenerate(mergePrefs(next));
  }), [wrap, regenerate, userId]);

  const replan = useCallback(() => wrap(() => regenerate()), [wrap, regenerate]);

  /** 勾選 / 取消完成。回傳獎勵結果（xp_gained、bonuses、level…） */
  const complete = useCallback(async (session, done = true) => {
    setError('');
    const { data, error: err } = await supabase.rpc('complete_study_session', { p_session_id: session.id, p_today: dateKey(new Date()), p_done: done });
    if (err) {
      setError(/future_session/.test(err.message) ? '還沒到這個區塊的日期，不能提前打勾。' : friendly(err.message));
      return null;
    }
    await load();
    return data;
  }, [load]);

  const today = dateKey(new Date());
  const overdue = useMemo(() => sessions.filter((s) => !s.done && s.plan_date < today).length, [sessions, today]);

  return { items, sessions, prefs, xp, loading, busy, error, warnings, overdue, addItem, removeItem, savePrefs, replan, complete };
}
