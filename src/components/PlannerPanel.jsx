import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Flag, Pencil, RefreshCw, Sparkles, Trash2, Undo2, X } from 'lucide-react';
import { useStudyPlan } from '../hooks/useStudyPlan';
import { addDays, dateKey, diffDays, parseDate, toMin } from '../lib/scheduler';
import { beanInfo, fmtDuration, levelFromXp, levelStart, levelTitle } from '../lib/openProfile';
import { backdropProps } from '../lib/backdrop';
import { parseQuick } from '../lib/quickAdd';

const WD = ['日', '一', '二', '三', '四', '五', '六'];
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WINS = { morning: '早上', afternoon: '下午', evening: '晚上' };
const CELL = 28;
const field = 'w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500';

const chip = (on) => `rounded-full px-2.5 py-1 text-xs transition ${on ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`;

/* ---------------- 甘特圖 ---------------- */
function Gantt({ items, sessions, today, selDay, onPick }) {
  const { days, byItemDay, stats } = useMemo(() => {
    const keys = [today, ...items.map((i) => i.deadline), ...sessions.map((s) => s.plan_date)];
    let min = keys.reduce((a, b) => (a < b ? a : b));
    let max = keys.reduce((a, b) => (a > b ? a : b));
    if (diffDays(min, today) > 14) min = addDays(today, -14);
    if (diffDays(min, max) > 150) max = addDays(min, 150);
    const list = [];
    for (let d = min; d <= max; d = addDays(d, 1)) list.push(d);
    const m = {}; const st = {};
    sessions.forEach((s) => {
      const k = `${s.item_id}|${s.plan_date}`;
      const c = (m[k] ||= { total: 0, done: 0, mins: 0, doneMins: 0 });
      c.total += 1; c.mins += s.minutes; if (s.done) { c.done += 1; c.doneMins += s.minutes; }
      const t = (st[s.item_id] ||= { mins: 0, doneMins: 0, first: s.plan_date, last: s.plan_date });
      t.mins += s.minutes; if (s.done) t.doneMins += s.minutes;
      if (s.plan_date < t.first) t.first = s.plan_date; if (s.plan_date > t.last) t.last = s.plan_date;
    });
    return { days: list, byItemDay: m, stats: st };
  }, [items, sessions, today]);

  if (!items.length) return <p className="py-6 text-center text-sm text-stone-500">先到「項目」新增要讀的東西，系統會自動排好每天的進度。</p>;
  const months = days.map((d, i) => (i === 0 || d.endsWith('-01') ? `${Number(d.slice(5, 7))}月` : ''));

  return (
    <div className="overflow-x-auto rounded-xl bg-stone-950/40 ring-1 ring-stone-700">
      <div style={{ width: 148 + days.length * CELL }} className="text-xs">
        <div className="flex">
          <div className="sticky left-0 z-10 w-[148px] shrink-0 bg-stone-900 px-2 py-1 text-stone-500">項目 / 進度</div>
          {days.map((d, i) => (
            <div key={d} style={{ width: CELL }} className={`shrink-0 text-center leading-tight ${d === today ? 'bg-amber-500/15 text-amber-300' : 'text-stone-500'}`}>
              <div className="h-4 text-[10px] text-stone-400">{months[i]}</div>
              <div>{Number(d.slice(8))}</div>
              <div className="text-[9px]">{WD[parseDate(d).getDay()]}</div>
            </div>
          ))}
        </div>
        {items.map((it) => {
          const st = stats[it.id];
          const pct = st ? Math.round((st.doneMins / st.mins) * 100) : 0;
          return (
            <div key={it.id} className="flex border-t border-stone-800">
              <div className="sticky left-0 z-10 flex w-[148px] shrink-0 flex-col justify-center bg-stone-900 px-2 py-1">
                <div className="truncate text-stone-200" title={it.title}>{it.title}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-700"><div className="h-full" style={{ width: `${pct}%`, background: it.color }} /></div>
                  <span className="w-8 text-right text-[10px] text-stone-400">{pct}%</span>
                </div>
              </div>
              {days.map((d) => {
                const c = byItemDay[`${it.id}|${d}`];
                const inSpan = st && d > st.first && d < st.last;
                const full = c && c.done === c.total;
                return (
                  <button
                    key={d} type="button" onClick={() => onPick(d)} style={{ width: CELL, background: inSpan ? `${it.color}22` : undefined }}
                    title={c ? `${d}：${fmtDuration(c.mins)}（已完成 ${fmtDuration(c.doneMins)}）` : d}
                    className={`relative h-10 shrink-0 border-l border-stone-800/70 ${d === today ? 'bg-amber-500/10' : ''} ${d === selDay ? 'outline outline-1 -outline-offset-1 outline-amber-500' : ''}`}
                  >
                    {c && (
                      <span className="absolute inset-x-0.5 inset-y-1.5 grid place-items-center rounded" style={{ background: it.color, opacity: full ? 1 : c.done ? 0.7 : 0.35 }}>
                        {full && <Check size={12} className="text-stone-950" />}
                      </span>
                    )}
                    {d === it.deadline && <Flag size={12} className="absolute right-0.5 top-0.5 text-rose-400" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- 新增 / 編輯項目表單 ---------------- */
const MIN_PRESETS = [30, 60, 120, 300, 600, 1200];
const DEADLINE_PRESETS = [['明天', 1], ['3 天後', 3], ['1 週後', 7], ['2 週後', 14], ['1 個月後', 30]];
const DEFAULT_FORM = { title: '', note: '', minutes: 300, deadline: addDays(dateKey(new Date()), 7), start_date: '', difficulty: 2, weekdays: [0, 1, 2, 3, 4, 5, 6], windows: ['morning', 'afternoon', 'evening'], review: true };

function ItemForm({ onSubmit, busy, initial, submitLabel, onCancel }) {
  const editing = !!initial;
  const [f, setF] = useState(() => (initial
    ? { title: initial.title, note: initial.note ?? '', minutes: initial.est_minutes, deadline: initial.deadline, start_date: initial.start_date ?? '', difficulty: initial.difficulty, weekdays: initial.weekdays, windows: initial.windows, review: initial.review }
    : DEFAULT_FORM));
  const [quick, setQuick] = useState('');
  const parsed = useMemo(() => (quick.trim() ? parseQuick(quick) : null), [quick]);
  const toggle = (key, v) => setF((p) => ({ ...p, [key]: p[key].includes(v) ? p[key].filter((x) => x !== v) : [...p[key], v] }));
  const applyQuick = () => {
    if (!parsed) return;
    setF((p) => ({ ...p, title: parsed.title || p.title, minutes: parsed.minutes ?? p.minutes, deadline: parsed.deadline ?? p.deadline, difficulty: parsed.difficulty ?? p.difficulty }));
    setQuick('');
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!f.title.trim() || !f.weekdays.length || !f.windows.length) return;
    await onSubmit({
      title: f.title.trim(), note: f.note.trim() || null, est_minutes: Math.min(12000, Math.max(5, Math.round(Number(f.minutes) || 0))),
      deadline: f.deadline, start_date: f.start_date || null, difficulty: Number(f.difficulty), weekdays: f.weekdays, windows: f.windows, review: f.review,
    });
    if (!editing) setF((p) => ({ ...p, title: '', note: '' }));
  };
  return (
    <form onSubmit={submit} className="space-y-2 rounded-xl bg-stone-800/60 p-3">
      {!editing && (
        <div className="space-y-1.5 rounded-lg bg-stone-900/60 p-2.5">
          <label className="text-xs text-stone-400">快速新增：用一句話描述（例：微積分第3章 2小時 週五前 燒腦）
            <div className="mt-1 flex gap-2">
              <input className={field} placeholder="項目 + 時間 + 期限 + 難度" maxLength={80} value={quick} onChange={(e) => setQuick(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyQuick(); } }} />
              <button type="button" onClick={applyQuick} disabled={!parsed} className="shrink-0 rounded-lg bg-stone-700 px-3 text-xs font-medium text-stone-100 hover:bg-stone-600 disabled:opacity-40">填入</button>
            </div>
          </label>
          {parsed && (
            <p className="text-[11px] text-stone-400">
              項目「<span className="text-stone-200">{parsed.title}</span>」{parsed.found.length ? `・${parsed.found.join('・')}` : '・沒有辨認到時間或期限，會保留表單原本的設定'}
            </p>
          )}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <input className={field} placeholder="項目（例：微積分第 1–5 章）" maxLength={60} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        <input className={field} placeholder="內容 / 範圍（可不填）" maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
        <div className="text-xs text-stone-400">預計總時間（分鐘）≈ {fmtDuration(Number(f.minutes) || 0)}
          <input className={`${field} mt-1`} type="number" inputMode="numeric" min={5} max={12000} step={1} value={f.minutes} onChange={(e) => setF({ ...f, minutes: e.target.value })} />
          <div className="mt-1 flex flex-wrap gap-1">{MIN_PRESETS.map((m) => <button key={m} type="button" className={chip(Number(f.minutes) === m)} onClick={() => setF({ ...f, minutes: m })}>{fmtDuration(m)}</button>)}</div>
        </div>
        <label className="text-xs text-stone-400">難度
          <select className={`${field} mt-1`} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value })}>
            <option value={1}>輕鬆（背誦、整理、複習）</option><option value={2}>普通</option><option value={3}>燒腦（需要高度專注）</option>
          </select>
        </label>
        <div className="text-xs text-stone-400">最晚完成日
          <input className={`${field} mt-1`} type="date" min={dateKey(new Date())} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          <div className="mt-1 flex flex-wrap gap-1">{DEADLINE_PRESETS.map(([label, n]) => { const d = addDays(dateKey(new Date()), n); return <button key={label} type="button" className={chip(f.deadline === d)} onClick={() => setF({ ...f, deadline: d })}>{label}</button>; })}</div>
        </div>
        <label className="text-xs text-stone-400">最早開始日（可不填）
          <input className={`${field} mt-1`} type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-stone-400">打算在星期</span>
        {WD_ORDER.map((d) => <button key={d} type="button" className={chip(f.weekdays.includes(d))} onClick={() => toggle('weekdays', d)}>{WD[d]}</button>)}
        <button type="button" className="ml-1 text-[11px] text-stone-500 underline hover:text-stone-300" onClick={() => setF({ ...f, weekdays: [1, 2, 3, 4, 5] })}>只排平日</button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-stone-400">打算在</span>
        {Object.entries(WINS).map(([k, v]) => <button key={k} type="button" className={chip(f.windows.includes(k))} onClick={() => toggle('windows', k)}>{v}</button>)}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-stone-300">
          <input type="checkbox" checked={f.review} onChange={(e) => setF({ ...f, review: e.target.checked })} /> 期限前安排間隔複習
        </label>
      </div>
      <div className="flex gap-2">
        {onCancel && <button type="button" onClick={onCancel} className="rounded-lg bg-stone-700 px-4 text-sm hover:bg-stone-600">取消</button>}
        <button disabled={busy || !f.title.trim() || !f.deadline} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">
          <Sparkles size={15} /> {busy ? '排程中…' : (submitLabel ?? '加入並自動排程')}
        </button>
      </div>
    </form>
  );
}

/* ---------------- 設定 ---------------- */
function Settings({ prefs, onSave, busy }) {
  const [p, setP] = useState(prefs);
  useEffect(() => setP(prefs), [prefs]);
  const setWin = (k, patch) => setP((x) => ({ ...x, windows: { ...x.windows, [k]: { ...x.windows[k], ...patch } } }));
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-stone-400">每日最多（分鐘）
          <input className={`${field} mt-1`} type="number" min={30} max={600} step={15} value={p.dailyMax} onChange={(e) => setP({ ...p, dailyMax: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-stone-400">單一區塊最長（分鐘）
          <input className={`${field} mt-1`} type="number" min={20} max={90} step={5} value={p.blockMin} onChange={(e) => setP({ ...p, blockMin: Number(e.target.value) })} />
        </label>
        <label className="text-xs text-stone-400">精神最好的時段
          <select className={`${field} mt-1`} value={p.chronotype} onChange={(e) => setP({ ...p, chronotype: e.target.value })}>
            <option value="morning">早上（早鳥）</option><option value="evening">晚上（夜貓）</option><option value="neutral">沒特別偏好</option>
          </select>
        </label>
      </div>
      {Object.entries(WINS).map(([k, label]) => (
        <div key={k} className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex w-20 items-center gap-1.5"><input type="checkbox" checked={p.windows[k].on} onChange={(e) => setWin(k, { on: e.target.checked })} />{label}</label>
          <input type="time" className={`${field} !w-32`} value={p.windows[k].start} onChange={(e) => setWin(k, { start: e.target.value })} />
          <span className="text-stone-500">～</span>
          <input type="time" className={`${field} !w-32`} value={p.windows[k].end} onChange={(e) => setWin(k, { end: e.target.value })} />
        </div>
      ))}
      <p className="text-[11px] leading-relaxed text-stone-500">
        排程原則：分散練習（同一項目攤到多天）、交錯練習（同天不同科輪流）、燒腦項目放高峰時段、低耗腦與複習放午後、
        預估時間加 15% 緩衝並提前 1 天完成、區塊 ≤50 分鐘且每 2 區塊長休息、期限前最後 1–2 天安排間隔複習、自動避開行事曆有時間的行程。
      </p>
      <button disabled={busy || Object.values(p.windows).some((w) => w.on && toMin(w.end) <= toMin(w.start))} onClick={() => onSave(p)} className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50">
        儲存並重新排程
      </button>
    </div>
  );
}

/* ---------------- 主面板 ---------------- */
export default function PlannerPanel({ userId, onClose }) {
  const plan = useStudyPlan(userId);
  const { items, sessions, prefs, xp, loading, busy, error, warnings, overdue } = plan;
  const today = dateKey(new Date());
  const [tab, setTab] = useState('plan');
  const [selDay, setSelDay] = useState(today);
  const [reward, setReward] = useState(null);
  const [finished, setFinished] = useState(null); // { title, session }：整個項目完成，短暫的「可復原」時間後自動刪除
  const [notice, setNotice] = useState('');
  const [editId, setEditId] = useState(null);
  const pendingRef = useRef(null);
  const autoRef = useRef(false);

  // 項目全部完成 → 8 秒內可復原；時間到（或關掉面板）就從資料庫刪除
  const flushFinished = async () => {
    if (!pendingRef.current) return;
    clearTimeout(pendingRef.current);
    pendingRef.current = null;
    setFinished(null);
    await plan.purge();
    await plan.reload();
  };
  const startFinished = async (info) => {
    await flushFinished();
    setFinished(info);
    pendingRef.current = setTimeout(() => { flushFinished(); }, 8000);
  };
  useEffect(() => () => { if (pendingRef.current) { clearTimeout(pendingRef.current); plan.purge(); } }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 有逾期未完成的區塊：開啟時自動重新排進接下來的日子
  useEffect(() => {
    if (loading || autoRef.current || !overdue || busy) return;
    autoRef.current = true;
    plan.replan().then((r) => { if (r) setNotice(`有 ${overdue} 個逾期的區塊，已自動重新排進接下來的日子。`); });
  }, [loading, overdue, busy]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(t); } return undefined; }, [notice]);

  useEffect(() => { if (reward) { const t = setTimeout(() => setReward(null), 5000); return () => clearTimeout(t); } return undefined; }, [reward]);

  const itemById = useMemo(() => Object.fromEntries(items.map((i) => [i.id, i])), [items]);
  const daySessions = useMemo(() => sessions.filter((s) => s.plan_date === selDay), [sessions, selDay]);
  const totalMin = sessions.reduce((a, s) => a + s.minutes, 0);
  const doneMin = sessions.filter((s) => s.done).reduce((a, s) => a + s.minutes, 0);
  const pct = totalMin ? Math.round((doneMin / totalMin) * 100) : 0;
  const level = levelFromXp(xp);
  const lvPct = Math.round(((xp - levelStart(level)) / (levelStart(level + 1) - levelStart(level))) * 100);

  const toggle = async (s) => {
    const r = await plan.complete(s, !s.done);
    if (!r) return;
    if (r.undone) { if (finished?.session.id === s.id) { clearTimeout(pendingRef.current); pendingRef.current = null; setFinished(null); } return; }
    if (!r.already) setReward(r);
    if (r.item_finished) startFinished({ title: itemById[s.item_id]?.title ?? '', session: s });
  };
  const undoFinished = async () => {
    if (!finished) return;
    clearTimeout(pendingRef.current); pendingRef.current = null;
    const s = finished.session; setFinished(null);
    await plan.complete(s, false);
  };

  // 今天 / 明天的摘要
  const todaySessions = sessions.filter((s) => s.plan_date === today);
  const leftToday = todaySessions.filter((s) => !s.done);
  const leftMin = leftToday.reduce((a, s) => a + s.minutes, 0);
  const nextUp = leftToday.find((s) => s.start_time) ?? leftToday[0];
  const tomorrowSessions = sessions.filter((s) => s.plan_date === addDays(today, 1) && !s.done);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-2 sm:p-3" {...backdropProps(onClose)}>
      <div className="relative flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-stone-900 text-stone-200 shadow-2xl ring-1 ring-stone-700" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="讀書計畫">
        <div className="flex items-center justify-between gap-3 border-b border-stone-700 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-stone-100">讀書計畫</h2>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-400">
              <span className="rounded bg-amber-600/90 px-1.5 py-0.5 font-medium text-stone-950">Lv.{level} {levelTitle(level)}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-700"><div className="h-full bg-amber-500" style={{ width: `${lvPct}%` }} /></div>
              <span>{xp} XP</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden text-right text-xs text-stone-400 sm:block">總進度 <b className="text-emerald-400">{pct}%</b><br />{fmtDuration(doneMin)} / {fmtDuration(totalMin)}</div>
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="關閉"><X size={18} /></button>
          </div>
        </div>

        <div className="flex gap-1.5 border-b border-stone-800 px-4 py-2 text-sm">
          {[['plan', '計畫 / 甘特圖'], ['items', `項目 (${items.length})`], ['settings', '排程設定']].map(([k, v]) => (
            <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-lg px-3 py-1.5 ${tab === k ? 'bg-stone-700 text-white' : 'text-stone-400 hover:bg-stone-800'}`}>{v}</button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {error && <p className="rounded-lg bg-rose-950/50 p-2.5 text-sm text-rose-300">{error}</p>}
          {loading && <p className="text-sm text-stone-500">載入中…</p>}
          {notice && <p className="rounded-lg bg-sky-950/50 p-2.5 text-sm text-sky-200">{notice}</p>}
          {warnings.map((w, i) => <p key={i} className="flex gap-1.5 rounded-lg bg-amber-950/40 p-2.5 text-xs text-amber-200"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{w.text}</p>)}

          {tab === 'plan' && (
            <>
              {overdue > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-stone-800 p-2.5 text-sm">
                  <span>有 {overdue} 個區塊已逾期未完成。</span>
                  <button type="button" disabled={busy} onClick={plan.replan} className="flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500 disabled:opacity-50"><RefreshCw size={13} /> 重新排程</button>
                </div>
              )}
              <div className="rounded-xl bg-stone-800 p-3 text-sm">
                {todaySessions.length === 0 ? (
                  <span className="text-stone-400">今天沒有安排，好好休息，或到「項目」新增要讀的東西。</span>
                ) : leftToday.length === 0 ? (
                  <span className="text-emerald-400">🎉 今天的計畫全部完成了！</span>
                ) : (
                  <span>今天還剩 <b className="text-amber-300">{leftToday.length}</b> 個區塊・<b className="text-amber-300">{fmtDuration(leftMin)}</b>
                    {nextUp && <>，下一個：<span className="text-stone-100">{nextUp.start_time ? `${nextUp.start_time.slice(0, 5)} ` : ''}{itemById[nextUp.item_id]?.title ?? ''}</span>（{nextUp.minutes} 分）</>}</span>
                )}
                {tomorrowSessions.length > 0 && <div className="mt-1 text-xs text-stone-500">明天 {tomorrowSessions.length} 個區塊・{fmtDuration(tomorrowSessions.reduce((a, s) => a + s.minutes, 0))}</div>}
              </div>
              <Gantt items={items} sessions={sessions} today={today} selDay={selDay} onPick={setSelDay} />
              <p className="text-[11px] text-stone-500">深色＝已完成、淡色＝待完成、🚩＝期限。點日期格子查看當天。</p>
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-stone-100">{Number(selDay.slice(5, 7))} 月 {Number(selDay.slice(8))} 日{selDay === today ? '（今天）' : ''}</h3>
                <button type="button" disabled={busy} onClick={plan.replan} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-100"><RefreshCw size={12} /> 重新排程</button>
              </div>
              <ul className="space-y-1.5">
                {daySessions.length === 0 && <li className="text-sm text-stone-500">這天沒有安排。</li>}
                {daySessions.map((s) => {
                  const it = itemById[s.item_id];
                  const future = s.plan_date > today;
                  return (
                    <li key={s.id} className="flex items-center gap-3 rounded-lg bg-stone-800 p-2.5">
                      <button type="button" disabled={future} onClick={() => toggle(s)} aria-label={s.done ? '取消完成' : '標示完成'}
                        title={future ? '還沒到這天' : ''} className={`grid h-6 w-6 shrink-0 place-items-center rounded border ${s.done ? 'border-transparent' : 'border-stone-500'} disabled:opacity-40`} style={s.done ? { background: it?.color } : undefined}>
                        {s.done && <Check size={14} className="text-stone-950" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`truncate text-sm ${s.done ? 'text-stone-500 line-through' : 'text-stone-100'}`}>
                          <i className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: it?.color }} />{it?.title ?? '（已刪除）'}{s.kind === 'review' && <span className="ml-1.5 rounded bg-violet-900/60 px-1.5 text-[10px] text-violet-200">複習</span>}
                        </div>
                        {it?.note && <div className="truncate text-xs text-stone-500">{it.note}</div>}
                      </div>
                      <div className="shrink-0 text-right text-xs text-stone-400">{s.start_time?.slice(0, 5)}<br />{s.minutes} 分</div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {tab === 'items' && (
            <>
              <ItemForm onSubmit={plan.addItem} busy={busy} />
              <p className="text-[11px] text-stone-500">整個項目的區塊都完成後，會自動從資料庫刪除（不留下項目名稱與紀錄；經驗值、連勝與讀書時間仍會保留）。</p>
              <ul className="space-y-1.5">
                {items.map((it) => {
                  const mine = sessions.filter((s) => s.item_id === it.id);
                  const d = mine.filter((s) => s.done).reduce((a, s) => a + s.minutes, 0);
                  const t = mine.reduce((a, s) => a + s.minutes, 0);
                  if (editId === it.id) {
                    return <li key={it.id}><ItemForm initial={it} busy={busy} submitLabel="儲存並重新排程" onCancel={() => setEditId(null)} onSubmit={async (p) => { await plan.updateItem(it.id, p); setEditId(null); }} /></li>;
                  }
                  return (
                    <li key={it.id} className="flex items-center gap-3 rounded-lg bg-stone-800 p-2.5">
                      <i className="h-8 w-1.5 shrink-0 rounded" style={{ background: it.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-stone-100">{it.title}</div>
                        <div className="text-xs text-stone-500">{fmtDuration(it.est_minutes)} · 期限 {it.deadline} · 進度 {t ? Math.round((d / t) * 100) : 0}%</div>
                      </div>
                      <button type="button" disabled={busy} onClick={() => setEditId(it.id)} className="rounded p-1.5 text-stone-500 hover:bg-stone-700 hover:text-amber-300" aria-label="編輯"><Pencil size={15} /></button>
                      <button type="button" disabled={busy} onClick={() => { if (window.confirm(`刪除「${it.title}」並重新排程？`)) plan.removeItem(it.id); }} className="rounded p-1.5 text-stone-500 hover:bg-stone-700 hover:text-rose-400" aria-label="刪除"><Trash2 size={15} /></button>
                    </li>
                  );
                })}
                {!items.length && <li className="text-sm text-stone-500">還沒有項目。</li>}
              </ul>
            </>
          )}

          {tab === 'settings' && <Settings prefs={prefs} onSave={plan.savePrefs} busy={busy} />}
        </div>

        {finished && (
          <div className="absolute inset-x-0 bottom-24 z-20 flex justify-center px-4">
            <div className="flex max-w-md items-center gap-3 rounded-2xl bg-stone-800 px-4 py-3 text-sm text-stone-100 shadow-2xl ring-1 ring-amber-500/60">
              <span>🏁 「{finished.title}」全部完成！8 秒後自動從資料庫刪除。</span>
              <button type="button" onClick={undoFinished} className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-500"><Undo2 size={13} /> 復原</button>
            </div>
          </div>
        )}
        {reward && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center px-4">
            <div className="animate-bounce rounded-2xl bg-amber-500 px-5 py-3 text-center text-stone-950 shadow-2xl">
              <div className="text-lg font-bold">☕ +{reward.xp_gained} XP{reward.capped ? '（今日已達經驗上限）' : ''}</div>
              {(reward.bonuses ?? []).map((b, i) => <div key={i} className="text-sm font-medium">{b.label} +{b.xp}</div>)}
              {reward.level > reward.prev_level && <div className="mt-1 text-sm font-bold">🎉 升級！Lv.{reward.level} {beanInfo(reward.level).emoji} {levelTitle(reward.level)}</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
