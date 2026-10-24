import { useEffect, useState } from 'react';
import { BookOpen, Coffee, LogOut, Users, Wifi, WifiOff } from 'lucide-react';
import { sanitizeAvatarUrl } from '../../lib/avatarUrl';

const FOCUS_SEC = 25 * 60;
const BREAK_SEC = 5 * 60;

/** 左上角控制面板：連線狀態、頭像網址、入座後的番茄鐘按鈕。純 UI，動作都由 props 傳入。 */
export default function SeatControlPanel({
  cafeName, profile, mySeat, connection, onlineCount, notice,
  onSetStatus, onLeave, onSaveAvatar,
}) {
  const [task, setTask] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { setAvatarInput(profile?.avatar_url ?? ''); }, [profile?.avatar_url]);

  const run = async (fn) => {
    setBusy(true);
    setMsg('');
    try { await fn(); } catch (e) { setMsg(e.message); } finally { setBusy(false); }
  };

  const saveAvatar = () => run(async () => {
    const trimmed = avatarInput.trim();
    if (trimmed && !sanitizeAvatarUrl(trimmed)) {
      throw new Error('請貼上 Ready Player Me 的 .glb 網址（https://models.readyplayer.me/xxxx.glb）');
    }
    await onSaveAvatar(trimmed || null);
    setMsg('頭像已更新');
  });

  const online = connection === 'online';
  const btn = 'flex flex-1 items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50';

  return (
    <div className="absolute left-4 top-4 w-72 space-y-3 rounded-3xl bg-amber-50/90 p-4 text-stone-700 shadow-xl ring-1 ring-amber-200 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="font-bold text-stone-800">{cafeName ?? '咖啡廳'}</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1"><Users size={14} />{onlineCount}</span>
          <span className={`flex items-center gap-1 ${online ? 'text-emerald-700' : 'text-rose-600'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? '已連線' : '重新連線中…'}
          </span>
        </div>
      </div>

      {mySeat ? (
        <div className="space-y-2">
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            maxLength={40}
            placeholder="這輪要做什麼？（例：微積分習題）"
            className="w-full rounded-2xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
          />
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => run(() => onSetStatus('studying', task, FOCUS_SEC))} className={`${btn} bg-amber-300 text-amber-950 hover:bg-amber-400`}>
              <BookOpen size={16} /> 專注 25 分
            </button>
            <button type="button" disabled={busy} onClick={() => run(() => onSetStatus('break', '', BREAK_SEC))} className={`${btn} bg-emerald-200 text-emerald-950 hover:bg-emerald-300`}>
              <Coffee size={16} /> 休息 5 分
            </button>
          </div>
          <button type="button" disabled={busy} onClick={() => run(onLeave)} className={`${btn} w-full bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-100`}>
            <LogOut size={16} /> 離座
          </button>
        </div>
      ) : (
        <p className="text-sm">點場景裡發光的小球，就能坐下開始讀書 ☕</p>
      )}

      <div className="space-y-1.5 border-t border-amber-200 pt-3">
        <label className="text-xs font-medium" htmlFor="avatar-url">我的頭像（Ready Player Me .glb）</label>
        <div className="flex gap-2">
          <input
            id="avatar-url"
            value={avatarInput}
            onChange={(e) => setAvatarInput(e.target.value)}
            placeholder="https://models.readyplayer.me/…glb"
            className="min-w-0 flex-1 rounded-2xl border border-amber-200 bg-white px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-300"
          />
          <button type="button" disabled={busy} onClick={saveAvatar} className="rounded-2xl bg-stone-700 px-3 text-xs font-semibold text-white disabled:opacity-50">
            套用
          </button>
        </div>
        <p className="text-[11px] text-stone-500">沒有頭像時會顯示可愛的小熊角色。</p>
      </div>

      {(msg || notice) && <p className="text-xs text-rose-600">{msg || notice}</p>}
    </div>
  );
}
