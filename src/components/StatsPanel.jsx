import { Flame, Target, Trophy, X } from 'lucide-react';
import { useFocusStats } from '../hooks/useFocusStats';
import { fmtMinutes } from '../lib/focusStats';
import { backdropProps } from '../lib/backdrop';

const GOALS = [60, 120, 180, 240];

function Ring({ pct, today, goal, reached }) {
  const r = 54; const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="11" className="stroke-stone-800" />
        <circle cx="64" cy="64" r={r} fill="none" strokeWidth="11" strokeLinecap="round"
          className={reached ? 'stroke-emerald-400' : 'stroke-amber-500'}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-2xl font-semibold text-stone-100">{today}<span className="text-sm font-normal text-stone-500"> / {goal}</span></div>
          <div className="text-[11px] text-stone-400">{reached ? '🎉 今日達標' : '今日專注（分）'}</div>
        </div>
      </div>
    </div>
  );
}

/** 專注統計：每日目標進度、連續天數、本週長條圖。資料來自 focus_logs，目標存在這台裝置。 */
export default function StatsPanel({ userId, onClose }) {
  const { summary: s, goal, setGoal, loading } = useFocusStats(userId);
  const max = Math.max(goal, ...s.week.map((d) => d.minutes), 1);
  const stat = 'rounded-xl bg-stone-800/70 p-3';

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-2 sm:p-3" {...backdropProps(onClose)}>
      <div className="max-h-[94dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl bg-stone-900 p-4 text-stone-200 shadow-2xl ring-1 ring-stone-700 sm:p-5"
        onClick={(e) => e.stopPropagation()} role="dialog" aria-label="專注統計">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">專注統計{loading && <span className="ml-2 text-xs font-normal text-stone-500">載入中…</span>}</h2>
          <button type="button" onClick={onClose} aria-label="關閉" className="rounded-lg p-1.5 hover:bg-stone-800"><X size={18} /></button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:justify-start">
          <Ring pct={s.pct} today={s.today} goal={s.goal} reached={s.reached} />
          <div className="min-w-[11rem] flex-1 space-y-2">
            <div className={`${stat} flex items-center gap-3`}>
              <Flame size={22} className={s.streak > 0 ? 'text-orange-400' : 'text-stone-600'} />
              <div>
                <div className="text-lg font-semibold text-stone-100">{s.streak} 天</div>
                <div className="text-[11px] text-stone-400">連續專注{s.bestStreak > s.streak ? `（最長 ${s.bestStreak} 天）` : s.streak > 0 ? '（目前最長）' : ''}</div>
              </div>
            </div>
            <div className={`${stat} flex items-center gap-3`}>
              <Target size={22} className="text-amber-400" />
              <div>
                <div className="text-lg font-semibold text-stone-100">{s.goalDays} / 7 天</div>
                <div className="text-[11px] text-stone-400">近 7 天達成目標</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-baseline justify-between text-xs text-stone-400">
            <span>近 7 天</span><span>共 {fmtMinutes(s.weekTotal)} · 日均 {s.weekAvg} 分</span>
          </div>
          <div className="h-36 rounded-xl bg-stone-800/50 px-3 pb-6 pt-3">
            {/* 虛線與長條共用同一個高度基準（這個 div 的高度 = 最大值） */}
            <div className="relative flex h-full items-end gap-2">
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-amber-600/70" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden />
              {s.week.map((d) => (
                <div key={d.key} className="relative flex h-full flex-1 flex-col justify-end">
                  <div className={`w-full rounded-t-md ${d.hitGoal ? 'bg-emerald-500' : d.isToday ? 'bg-amber-500' : 'bg-stone-500'}`}
                    title={`${d.key}：${d.minutes} 分`}
                    style={{ height: `${d.minutes > 0 ? Math.max(3, (d.minutes / max) * 100) : 0}%`, transition: 'height .5s ease' }} />
                  <span className={`absolute -bottom-5 left-0 right-0 text-center text-[11px] ${d.isToday ? 'font-semibold text-amber-300' : 'text-stone-500'}`}>{d.label}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-1 text-[11px] text-stone-500">綠色 = 達成目標，虛線 = 每日目標。</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className={stat}><div className="text-[11px] text-stone-400">最近 120 天累計</div><div className="font-semibold text-stone-100">{fmtMinutes(s.total)}</div></div>
          <div className={stat}><div className="flex items-center gap-1 text-[11px] text-stone-400"><Trophy size={11} />單日最高</div>
            <div className="font-semibold text-stone-100">{s.bestDay.minutes ? `${fmtMinutes(s.bestDay.minutes)}（${s.bestDay.key.slice(5)}）` : '—'}</div></div>
        </div>

        <div className="mt-4 rounded-xl bg-stone-800/70 p-3">
          <div className="mb-2 text-xs text-stone-400">每日目標（分鐘，只存在這台裝置）</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {GOALS.map((g) => (
              <button key={g} type="button" onClick={() => setGoal(g)}
                className={`rounded-full px-3 py-1 text-xs ${goal === g ? 'bg-amber-600 text-white' : 'bg-stone-700 text-stone-300 hover:bg-stone-600'}`}>{g}</button>
            ))}
            <input type="number" min={10} max={720} value={goal} onChange={(e) => setGoal(e.target.value)} aria-label="自訂每日目標分鐘數"
              className="w-20 rounded-lg border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-100 outline-none focus:border-amber-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
