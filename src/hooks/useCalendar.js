import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const range = useMemo(() => ({ first: new Date(year, month, 1), next: new Date(year, month + 1, 1) }), [year, month]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [ev, lg] = await Promise.all([
      supabase.from('calendar_events').select('*')
        .gte('event_date', dateKey(range.first)).lt('event_date', dateKey(range.next))
        .order('event_date').order('start_time', { nullsFirst: true }),
      supabase.from('focus_logs').select('minutes, started_at')
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

  const addEvent = useCallback(async ({ title, date, time, color, note }) => {
    const { data, error: err } = await supabase.from('calendar_events')
      .insert({ title, event_date: date, start_time: time || null, color, note: note || null })
      .select().single();
    if (err) throw new Error(err.message);
    setEvents((prev) => [...prev, data].sort((a, b) =>
      a.event_date.localeCompare(b.event_date) || (a.start_time ?? '').localeCompare(b.start_time ?? '')));
  }, []);

  const toggleDone = useCallback(async (ev) => {
    setEvents((prev) => prev.map((e) => (e.id === ev.id ? { ...e, done: !e.done } : e)));
    const { error: err } = await supabase.from('calendar_events').update({ done: !ev.done }).eq('id', ev.id);
    if (err) { setError(err.message); load(); }
  }, [load]);

  const removeEvent = useCallback(async (id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    const { error: err } = await supabase.from('calendar_events').delete().eq('id', id);
    if (err) { setError(err.message); load(); }
  }, [load]);

  return { events, eventsByDay, focusByDay, loading, error, addEvent, toggleDone, removeEvent };
}
