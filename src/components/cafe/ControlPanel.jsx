import { useState } from "react";
import { BookOpen, Coffee, LogOut, Wifi, WifiOff } from "lucide-react";

const btn = "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50";

export default function ControlPanel({
  mySeat, connection, onlineCount, busy,
  onStudy, onBreak, onLeave, onSaveAvatar, onSignOut, displayName,
}) {
  const [task, setTask] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [avatar, setAvatar] = useState("");

  const online = connection === "online";

  return (
    <aside className="absolute left-4 top-4 w-72 space-y-3 rounded-2xl bg-stone-900/85 p-4 text-sm shadow-xl backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{displayName ?? "同學"}</div>
        <div className={`flex items-center gap-1 text-xs ${online ? "text-emerald-400" : "text-amber-400"}`}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? `${onlineCount} 人在線` : "連線中…"}
        </div>
      </div>

      {!mySeat ? (
        <p className="text-stone-300">點選桌邊的空位入座。</p>
      ) : (
        <>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            maxLength={40}
            placeholder="這一輪要做什麼？"
            className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 outline-none focus:border-amber-500"
          />
          <label className="flex items-center gap-2 text-stone-300">
            專注
            <input
              type="number" min={1} max={120} value={minutes}
              onChange={(e) => setMinutes(Math.min(120, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-md border border-stone-600 bg-stone-800 px-2 py-1 text-center"
            />
            分鐘
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={busy} onClick={() => onStudy({ task, minutes })} className={`${btn} bg-amber-600 hover:bg-amber-500`}>
              <BookOpen size={16} /> 開始專注
            </button>
            <button disabled={busy} onClick={() => onBreak()} className={`${btn} bg-emerald-700 hover:bg-emerald-600`}>
              <Coffee size={16} /> 休息 5 分
            </button>
          </div>
          <button disabled={busy} onClick={onLeave} className={`${btn} w-full bg-stone-700 hover:bg-stone-600`}>
            離開座位
          </button>
        </>
      )}

      <div className="space-y-2 border-t border-stone-700 pt-3">
        <input
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="Ready Player Me .glb 網址"
          className="w-full rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-xs outline-none focus:border-amber-500"
        />
        <button
          disabled={busy || !avatar}
          onClick={() => onSaveAvatar(avatar)}
          className={`${btn} w-full bg-stone-700 hover:bg-stone-600`}
        >
          儲存頭像
        </button>
      </div>

      <button onClick={onSignOut} className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200">
        <LogOut size={12} /> 登出
      </button>
    </aside>
  );
}
