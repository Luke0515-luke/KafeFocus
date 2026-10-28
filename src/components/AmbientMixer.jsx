import { useEffect, useRef, useState } from 'react';
import { Headphones, X } from 'lucide-react';
import { AmbientEngine, SOUNDS } from '../lib/ambient';

const KEY = 'kf_ambient';
const load = () => {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || '{}');
    return Object.fromEntries(SOUNDS.map((s) => [s.id, Math.min(1, Math.max(0, Number(v?.[s.id]) || 0))]));
  } catch { return Object.fromEntries(SOUNDS.map((s) => [s.id, 0])); }
};

/**
 * 環境音混音器（音樂播放器上方的小耳機按鈕）：雨聲、棕噪音、壁爐、微風、咖啡廳人聲，各自調音量、可以疊加。
 * 聲音全部即時合成，不需要音檔。上次的音量會記住；瀏覽器不允許自動播放，所以重新開啟網頁後，
 * 要等你第一次點擊 / 按鍵才會開始出聲。放在最上層，大廳與咖啡廳之間切換時不會中斷。
 */
export default function AmbientMixer() {
  const engine = useRef(null);
  const [open, setOpen] = useState(false);
  const [levels, setLevels] = useState(load);
  const active = Object.values(levels).some((v) => v > 0);
  const started = useRef(false);

  const eng = () => (engine.current ||= new AmbientEngine());

  // 還原上次的音量：等第一次使用者操作才開始（自動播放政策）
  useEffect(() => {
    if (!eng().supported) return undefined;
    const start = () => {
      if (started.current) return;
      started.current = true;
      eng().setAll(load());
      ['click', 'keydown', 'touchend'].forEach((t) => window.removeEventListener(t, start));
    };
    if (Object.values(load()).some((v) => v > 0)) ['click', 'keydown', 'touchend'].forEach((t) => window.addEventListener(t, start));
    return () => ['click', 'keydown', 'touchend'].forEach((t) => window.removeEventListener(t, start));
  }, []);

  useEffect(() => () => { engine.current?.dispose(); engine.current = null; }, []);

  const change = (id, v) => {
    started.current = true;
    const next = { ...levels, [id]: v };
    setLevels(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 無痕模式略過 */ }
    eng().set(id, v);
  };
  const muteAll = () => {
    const next = Object.fromEntries(SOUNDS.map((s) => [s.id, 0]));
    setLevels(next);
    try { window.localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* 忽略 */ }
    eng().setAll(next);
  };

  if (typeof window !== 'undefined' && !new AmbientEngine().supported) return null;

  return (
    <div className="fixed bottom-[6.5rem] right-4 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-stone-900/95 p-3 text-stone-300 shadow-xl ring-1 ring-stone-700 backdrop-blur" role="dialog" aria-label="環境音">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-stone-100">環境音</span>
            <div className="flex items-center gap-1">
              {active && <button type="button" onClick={muteAll} className="rounded px-2 py-0.5 text-[11px] text-stone-400 hover:bg-stone-800 hover:text-stone-100">全部關閉</button>}
              <button type="button" onClick={() => setOpen(false)} aria-label="收起環境音" className="rounded p-1 hover:bg-stone-800"><X size={14} /></button>
            </div>
          </div>
          <ul className="space-y-2">
            {SOUNDS.map((s) => (
              <li key={s.id}>
                <label className="flex items-center justify-between text-xs">
                  <span>{s.emoji} {s.label}</span>
                  <span className="font-mono text-stone-500">{Math.round(levels[s.id] * 100)}</span>
                </label>
                <input type="range" min="0" max="1" step="0.05" value={levels[s.id]} aria-label={s.label}
                  onChange={(e) => change(s.id, Number(e.target.value))} className="h-1 w-full accent-amber-500" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-tight text-stone-500">聲音由程式即時合成，可以和背景音樂一起疊加。</p>
        </div>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="環境音"
        className={`grid h-10 w-10 place-items-center rounded-full shadow-xl ring-1 backdrop-blur transition ${active ? 'bg-amber-600 text-white ring-amber-400' : 'bg-stone-900/90 text-stone-300 ring-stone-700 hover:bg-stone-800'}`}>
        <Headphones size={18} />
      </button>
    </div>
  );
}
