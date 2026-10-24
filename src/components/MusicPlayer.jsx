import { Music, Pause, Play, SkipForward, Volume2, VolumeX } from 'lucide-react';

/** 右下角的音樂控制列。CC BY 要求標示作者與授權，所以曲名、作者與授權連結固定顯示。 */
export default function MusicPlayer({ music }) {
  const { current, playing, volume, unavailable, toggle, next, setVolume } = music;
  if (!current) return null;

  const btn = 'grid h-8 w-8 place-items-center rounded-lg text-stone-200 transition hover:bg-stone-700 disabled:opacity-40';

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-xl bg-stone-900/90 p-2 text-stone-300 shadow-xl ring-1 ring-stone-700 backdrop-blur">
      <div className="flex items-center gap-1">
        <button type="button" onClick={toggle} disabled={unavailable} className={btn} aria-label={playing ? '暫停音樂' : '播放音樂'}>
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button type="button" onClick={next} disabled={unavailable} className={btn} aria-label="下一首">
          <SkipForward size={16} />
        </button>
        <button type="button" onClick={() => setVolume(volume > 0 ? 0 : 0.35)} className={btn} aria-label="靜音">
          {volume > 0 ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        <input
          type="range" min="0" max="1" step="0.05" value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-1 w-20 accent-amber-500" aria-label="音量"
        />
      </div>
      <div className="mt-1.5 flex max-w-[16rem] items-start gap-1.5 px-1 text-[11px] leading-tight">
        <Music size={12} className="mt-0.5 shrink-0 text-amber-500" />
        {unavailable ? (
          <span className="text-stone-500">尚未加入音樂（把 mp3 放進 public/music/）</span>
        ) : (
          <span className="min-w-0">
            <a href={current.page} target="_blank" rel="noreferrer" className="block truncate text-stone-200 hover:underline">{current.title}</a>
            <span className="text-stone-500">{current.artist} · </span>
            <a href={current.licenseUrl} target="_blank" rel="noreferrer" className="text-stone-500 hover:underline">{current.license}</a>
            <span className="text-stone-500"> · Free Music Archive</span>
          </span>
        )}
      </div>
    </div>
  );
}
