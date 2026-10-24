import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Coffee, LogOut, Users, Wifi, WifiOff } from 'lucide-react';
import { sanitizeAvatarUrl } from '../../lib/avatarUrl';

const FOCUS_KEY = 'kf_focus_min';
const BREAK_KEY = 'kf_break_min';
const PRESETS = [[25, 5], [50, 10], [90, 15]];

const lsGet = (k, d) => { try { const v = Number(window.localStorage.getItem(k)); return Number.isFinite(v) && v > 0 ? v : d; } catch { return d; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, String(v)); } catch { /* 忽略 */ } };
const clampMin = (v, fallback) => Math.min(120, Math.max(1, Math.round(Number(v)) || fallback));

/** 左上角控制面板：返回大廳、番茄鐘（可自訂分鐘）、頭像、行事曆、登出。純 UI，動作都由 props 傳入。 */
export default function ControlPanel({
  cafeName, profile, mySeat, connection, onlineCount, notice,
  onSetStatus, onLeave, onSaveAvatar, onBack, onSignOut, onOpenCalendar,
}) {
  const [task, setTask] = useState('');
  const [focusMin, setFocusMin] = useState(() => lsGet(FOCUS_KEY, 25));
  const [breakMin, setBreakMin] = useState(() => lsGet(BREAK_KEY, 5));
  const [avatarInput, setAvatarInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setAvatarInput(profile?.avatar_url ?? ''); }, [profile?.avatar_url]);

  const run = async (fn) => {
    setBusy(true);
    setMsg('');
    try { await fn(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const setMinutes = (kind, value) => {
    if (kind === 'focus') { setFocusMin(value); lsSet(FOCUS_KEY, clampMin(value, 25)); }
    else { setBreakMin(value); lsSet(BREAK_KEY, clampMin(value, 5)); }
  };

  const startFocus = () => run(() => onSetStatus('studying', task, clampMin(focusMin, 25) * 60));
  const startBreak = () => run(() => onSetStatus('break', '', clampMin(breakMin, 5) * 60));

  const saveAvatar = () => run(async () => {
    const trimmed = avatarInput.trim();
    if (trimmed && !sanitizeAvatarUrl(trimmed)) {
      throw new Error('請貼上 Ready Player Me 的 .glb 網址（https://models.readyplayer.me/xxxx.glb）');
    }
    await onSaveAvatar(trimmed || null);
    setMsg('頭像已更新');
  });

  const online = connection === 'online';
  const btn = 'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition disabled:opacity-50';
  const input = 'w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500';

  return (
    <div className="absolute left-4 top-4 max-h-[calc(100vh-2rem)] w-80 max-w-[calc(100vw-2rem)] space-y-3 overflow-y-auto rounded-2xl bg-stone-900/85 p-4 text-stone-300 shadow-xl ring-1 ring-stone-700 backdrop-blur">
      <div>
        <button type="button" onClick={onBack} className="mb-2 flex items-center gap-1 text-xs text-stone-400 hover:text-stone-100">
          <ArrowLeft size={14} /> 回到咖啡廳大廳
        </button>
        <div className="flex items-center justify-between gap-2">
          <div className="truncate font-semibold text-stone-100">{cafeName ?? '咖啡廳'}</div>
          <div className="flex shrink-0 items-center gap-2 text-xs">
            <span className="flex items-center gap-1"><Users size={14} />{onlineCount}</span>
            <span className={`flex items-center gap-1 ${online ? 'text-emerald-400' : 'text-rose-400'}`}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? '已連線' : '重新連線中…'}
            </span>
          </div>
        </div>
      </div>

      {!mySeat && <p className="text-sm">點場景裡發光的小圓點，就能坐下開始讀書。</p>}

      {/* 時間設定（入座前後都能調整） */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-stone-400">
            專注（分鐘）
            <input type="number" min={1} max={120} value={focusMin} onChange={(e) => setMinutes('focus', e.target.value)} className={`${input} mt-1`} />
          </label>
          <label className="flex-1 text-xs text-stone-400">
            休息（分鐘）
            <input type="number" min={1} max={120} value={breakMin} onChange={(e) => setMinutes('break', e.target.value)} className={`${input} mt-1`} />
          </label>
        </div>
        <div className="flex gap-1.5">
          {PRESETS.map(([f, b]) => (
            <button key={f} type="button" onClick={() => { setMinutes('focus', f); setMinutes('break', b); }}
              className="flex-1 rounded-md bg-stone-800 py-1 text-xs hover:bg-stone-700">
              {f}/{b}
            </button>
          ))}
        </div>
      </div>

      {mySeat && (
        <div className="space-y-2">
          <input value={task} onChange={(e) => setTask(e.target.value)} maxLength={40} placeholder="這輪要做什麼？（例：微積分習題）" className={input} />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={startFocus} className={`${btn} bg-amber-600 text-white hover:bg-amber-500`}>
              <BookOpen size={16} /> 開始專注
            </button>
            <button type="button" disabled={busy} onClick={startBreak} className={`${btn} bg-emerald-800 text-emerald-50 hover:bg-emerald-700`}>
              <Coffee size={16} /> 休息
            </button>
          </div>
          <button type="button" disabled={busy} onClick={() => run(onLeave)} className={`${btn} w-full bg-stone-800 text-stone-300 ring-1 ring-stone-600 hover:bg-stone-700`}>
            離座
          </button>
        </div>
      )}

      <div className="space-y-1.5 border-t border-stone-700 pt-3">
        <label className="text-xs font-medium" htmlFor="avatar-url">我的頭像（Ready Player Me .glb）</label>
        <div className="flex gap-2">
          <input id="avatar-url" value={avatarInput} onChange={(e) => setAvatarInput(e.target.value)}
            placeholder="https://models.readyplayer.me/…glb"
            className="min-w-0 flex-1 rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-xs text-stone-100 outline-none focus:border-amber-500" />
          <button type="button" disabled={busy} onClick={saveAvatar} className="rounded-lg bg-stone-700 px-3 text-xs font-medium text-white hover:bg-stone-600 disabled:opacity-50">
            套用
          </button>
        </div>
        <p className="text-[11px] text-stone-500">沒有頭像時會顯示一個簡約的人形。</p>
      </div>

      <div className="flex gap-2 border-t border-stone-700 pt-3">
        <button type="button" onClick={onOpenCalendar} className={`${btn} bg-stone-800 hover:bg-stone-700`}>
          <CalendarDays size={16} /> 行事曆
        </button>
        <button type="button" disabled={busy} onClick={() => run(onSignOut)} className={`${btn} bg-stone-800 hover:bg-stone-700`}>
          <LogOut size={16} /> 登出
        </button>
      </div>

      {(msg || notice) && <p className="text-xs text-rose-400">{msg || notice}</p>}
    </div>
  );
}
