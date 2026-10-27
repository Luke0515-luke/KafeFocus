import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const pad = (n) => String(n).padStart(2, '0');
/** 本地時區的日期 key：YYYY-MM-DD */
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** 讀寫某個月份的行事曆事件，並彙整當月每天的專注分鐘數。 */
export function useCalendar(userId, year, month /* 0 起算 */) {
  const [events, setEvents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(null); // { id, title }：剛打勾完成、短暫可復原，之後自動刪除
  const pending = useRef(null); // { id, timer }
  const purged = useRef(false);

  const range = useMemo(() => ({ first: new Date(year, month, 1), next: new Date(year, month + 1, 1) }), [year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!purged.current) { // 第一次開啟：先把上次沒來得及刪的「已完成」行程清掉
      purged.current = true;
      await supabase.from('calendar_events').delete().eq('done', true);
    }
    const [ev, lg] = await Promise.all([
      supabase.from('calendar_events').select('*')
        .gte('event_date', dateKey(range.first)).lt('event_date', dateKey(range.next))
        .order('event_date').order('start_time', { nullsFirst: true }),
      supabase.from('focus_logs').select('id, minutes, started_at, task')
        .gte('started_at', range.first.toISOString()).lt('started_at', range.next.toISOString()),
    ]);
    if (ev.error) setError(ev.error.message); else setEvents(ev.data ?? []);
    if (lg.error) setError((e) => e || lg.error.message); else setLogs(lg.data ?? []);
    setLoading(false);
  }, [range]);

  useEffect(() => { if (userId) load(); }, [userId, load]);

  const eventsByDay = useMemo(() => {
    const m = {};
    events.forEach((e) => { (m[e.event_date] ||= []).push(e); });
    return m;
  }, [events]);

  const focusByDay = useMemo(() => {
    const m = {};
    logs.forEach((l) => { const k = dateKey(new Date(l.started_at)); m[k] = (m[k] ?? 0) + l.minutes; });
    return m;
  }, [logs]);

  // 每天的專注紀錄清單（依開始時間排序）＋當月總分鐘數
  const focusLogsByDay = useMemo(() => {
    const m = {};
    [...logs].sort((a, b) => new Date(a.started_at) - new Date(b.started_at))
      .forEach((l) => { (m[dateKey(new Date(l.started_at))] ||= []).push(l); });
    return m;
  }, [logs]);
  const focusMonthTotal = useMemo(() => logs.reduce((a, l) => a + l.minutes, 0), [logs]);

  const addEvent = useCallback(async ({ title, date, time, color, note }) => {
    const { data, error: err } = await supabase.from('calendar_events')
      .insert({ title, event_date: date, start_time: time || null, color, note: note || null })
      .select().single();
    if (err) throw new Error(err.message);
    setEvents((prev) => [...prev, data].sort((a, b) =>
      a.event_date.localeCompare(b.event_date) || (a.start_time ?? '').localeCompare(b.start_time ?? '')));
  }, []);

  /** 立刻把剛完成的行程刪掉（資料庫與畫面） */
  const flushPending = useCallback(async () => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setFinishing(null);
    setEvents((prev) => prev.filter((e) => e.id !== p.id));
    await supabase.from('calendar_events').delete().eq('id', p.id);
  }, []);

  // 打勾完成 → 6 秒內可以復原，時間到就從資料庫刪除（不留紀錄）；關掉行事曆時也會立刻刪
  const toggleDone = useCallback(async (ev) => {
    if (ev.done) { // 還留著的已完成行程：改回未完成
      setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, done: false } : e)));
      const { error: err } = await supabase.from('calendar_events').update({ done: false }).eq('id', ev.id);
      if (err) { setError(err.message); load(); }
      return;
    }
    await flushPending();
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, done: true } : e)));
    const { error: err } = await supabase.from('calendar_events').update({ done: true }).eq('id', ev.id);
    if (err) { setError(err.message); load(); return; }
    setFinishing({ id: ev.id, title: ev.title });
    pending.current = { id: ev.id, timer: setTimeout(() => { flushPending(); }, 6000) };
  }, [load, flushPending]);

  const undoFinish = useCallback(async () => {
    const p = pending.current;
    if (!p) return;
    clearTimeout(p.timer);
    pending.current = null;
    setFinishing(null);
    setEvents((prev) => prev.map((e) => (e.id === p.id ? { ...e, done: false } : e)));
    const { error: err } = await supabase.from('calendar_events').update({ done: false }).eq('id', p.id);
    if (err) { setError(err.message); load(); }
  }, [load]);

  useEffect(() => () => { // 關掉行事曆：還在倒數的行程立刻刪除
    const p = pending.current;
    if (p) { clearTimeout(p.timer); supabase.from('calendar_events').delete().eq('id', p.id).then(() => {}); }
  }, []);

  const removeEvent = useCallback(async (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    const { error: err } = await supabase.from('calendar_events').delete().eq('id', id);
    if (err) { setError(err.message); load(); }
  }, [load]);

  return { events, eventsByDay, focusByDay, focusLogsByDay, focusMonthTotal, loading, error, reload: load, addEvent, toggleDone, removeEvent, finishing, undoFinish };
}
