import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock, Trash2, X } from 'lucide-react';
import { dateKey, useCalendar } from '../hooks/useCalendar';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];
// Tailwind 需要完整字串才會產生對應樣式，所以不能用字串拼接
const COLORS = {
  amber: { dot: 'bg-amber-500', ring: 'ring-amber-500' },
  emerald: { dot: 'bg-emerald-500', ring: 'ring-emerald-500' },
  sky: { dot: 'bg-sky-500', ring: 'ring-sky-500' },
  rose: { dot: 'bg-rose-500', ring: 'ring-rose-500' },
  violet: { dot: 'bg-violet-500', ring: 'ring-violet-500' },
};

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

/** 行事曆：月曆 + 當天事件清單 + 每天專注分鐘數（來自讀書階段完成紀錄） */
export default function CalendarPanel({ userId, onClose }) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [selected, setSelected] = useState(dateKey(today));
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [note, setNote] = useState('');
  const [color, setColor] = useState('amber');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const { eventsByDay, focusByDay, loading, error, addEvent, toggleDone, removeEvent } = useCalendar(userId, cursor.y, cursor.m);
  const grid = useMemo(() => buildGrid(cursor.y, cursor.m), [cursor]);
  const todayKey = dateKey(today);
  const dayEvents = eventsByDay[selected] ?? [];

  const shift = (delta) => setCursor(({ y, m }) => {
    const d = new Date(y, m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const goToday = () => { setCursor({ y: today.getFullYear(), m: today.getMonth() }); setSelected(todayKey); };

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setMsg('');
    try {
      await addEvent({ title: t, date: selected, time, color, note: note.trim() });
      setTitle(''); setTime(''); setNote('');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500';
  const [sy, sm, sd] = selected.split('-').map(Number);

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-3" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-stone-900 text-stone-200 shadow-2xl ring-1 ring-stone-700 md:flex-row"
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-label="行事曆"
      >
        {/* 月曆 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => shift(-1)} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="上個月"><ChevronLeft size={18} /></button>
              <h2 className="min-w-[7.5rem] text-center text-lg font-semibold text-stone-100">{cursor.y} 年 {cursor.m + 1} 月</h2>
              <button type="button" onClick={() => shift(1)} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="下個月"><ChevronRight size={18} /></button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={goToday} className="rounded-lg bg-stone-800 px-3 py-1 text-xs hover:bg-stone-700">今天</button>
              <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-800 md:hidden" aria-label="關閉"><X size={18} /></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
            {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((d) => {
              const k = dateKey(d);
              const inMonth = d.getMonth() === cursor.m;
              const evs = inMonth ? (eventsByDay[k] ?? []) : [];
              const mins = inMonth ? focusByDay[k] : 0;
              return (
                <button
                  key={k} type="button" onClick={() => setSelected(k)}
                  className={`flex h-16 flex-col items-start rounded-lg p-1.5 text-left text-xs transition ${
                    inMonth ? 'bg-stone-800/70 hover:bg-stone-800' : 'bg-transparent text-stone-600'
                  } ${k === selected ? 'ring-2 ring-amber-500' : ''} ${k === todayKey ? 'outline outline-1 outline-amber-700' : ''}`}
                >
                  <span className={k === todayKey ? 'font-bold text-amber-400' : ''}>{d.getDate()}</span>
                  <span className="mt-auto flex w-full items-end justify-between">
                    <span className="flex gap-0.5">
                      {evs.slice(0, 4).map((e) => <i key={e.id} className={`h-1.5 w-1.5 rounded-full ${COLORS[e.color]?.dot ?? 'bg-amber-500'} ${e.done ? 'opacity-40' : ''}`} />)}
                    </span>
                    {mins > 0 && <span className="text-[10px] text-emerald-400">{mins}分</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-stone-500">綠色數字 = 當天「完整跑完」的專注分鐘數。{loading && ' 載入中…'}</p>
        </div>

        {/* 當天 */}
        <div className="flex w-full flex-col border-t border-stone-700 p-4 md:w-80 md:border-l md:border-t-0">
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-base font-semibold text-stone-100">{sm} 月 {sd} 日</div>
              <div className="text-xs text-stone-500">{sy} 年 · 週{WEEKDAYS[new Date(sy, sm - 1, sd).getDay()]}{focusByDay[selected] ? ` · 專注 ${focusByDay[selected]} 分鐘` : ''}</div>
            </div>
            <button type="button" onClick={onClose} className="hidden rounded-lg p-1.5 hover:bg-stone-800 md:block" aria-label="關閉"><X size={18} /></button>
          </div>

          <ul className="mb-3 min-h-[3rem] flex-1 space-y-1.5 overflow-y-auto">
            {dayEvents.length === 0 && <li className="text-sm text-stone-500">這天還沒有行程。</li>}
            {dayEvents.map((e) => (
              <li key={e.id} className="flex items-start gap-2 rounded-lg bg-stone-800 p-2">
                <button
                  type="button" onClick={() => toggleDone(e)} aria-label={e.done ? '標示為未完成' : '標示為完成'}
                  className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${e.done ? `${COLORS[e.color]?.dot ?? 'bg-amber-500'} border-transparent` : 'border-stone-500'}`}
                >
                  {e.done && <Check size={12} className="text-stone-950" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`break-words text-sm ${e.done ? 'text-stone-500 line-through' : 'text-stone-100'}`}>{e.title}</div>
                  {(e.start_time || e.note) && (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                      {e.start_time && <span className="flex items-center gap-0.5"><Clock size={11} />{e.start_time.slice(0, 5)}</span>}
                      {e.note && <span className="break-words">{e.note}</span>}
                    </div>
                  )}
                </div>
                <button type="button" onClick={() => removeEvent(e.id)} className="rounded p-1 text-stone-500 hover:bg-stone-700 hover:text-rose-400" aria-label="刪除"><Trash2 size={14} /></button>
              </li>
            ))}
          </ul>

          <form onSubmit={submit} className="space-y-2 border-t border-stone-700 pt-3">
            <input className={field} placeholder="新增行程（例：微積分期中考）" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex gap-2">
              <input className={field} type="time" value={time} onChange={(e) => setTime(e.target.value)} aria-label="時間（可不填）" />
              <div className="flex items-center gap-1.5">
                {Object.keys(COLORS).map((c) => (
                  <button
                    key={c} type="button" onClick={() => setColor(c)} aria-label={`顏色 ${c}`}
                    className={`h-5 w-5 rounded-full ${COLORS[c].dot} ${color === c ? `ring-2 ring-offset-2 ring-offset-stone-900 ${COLORS[c].ring}` : ''}`}
                  />
                ))}
              </div>
            </div>
            <input className={field} placeholder="備註（可不填）" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
            <button disabled={busy || !title.trim()} className="w-full rounded-lg bg-amber-600 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">
              加入 {sm}/{sd}
            </button>
            {(msg || error) && <p className="text-xs text-rose-400">{msg || error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
