import { useEffect, useState } from 'react';
import { BookOpen, Flame, Trophy, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { dateKey } from '../lib/scheduler';
import { BEANS, ROASTS, beanInfo, fmtDuration, levelTitle, openProfile, weekStart } from '../lib/openProfile';
import { backdropProps } from '../lib/backdrop';

const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); };
const dbMsg = (m = '') => (/study_leaderboard|study_user_card|schema cache|does not exist/i.test(m) ? '資料庫還沒有排行榜功能：請到 Supabase → SQL Editor 執行 study_planner.sql 一次。' : m);
const Avatar = ({ name }) => <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-700 text-sm font-semibold text-amber-50">{(name || '?').slice(0, 1)}</span>;

/** 點名字跳出的資料卡：總讀書時間、今天讀書時間、等級、連續天數、徽章 */
export function UserCard({ userId, myId, onClose }) {
  const [card, setCard] = useState(undefined);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    supabase.rpc('study_user_card', { p_user_id: userId, p_day_start: dayStart(), p_today: dateKey(new Date()), p_week_start: weekStart() }).then(({ data, error }) => {
      if (!alive) return;
      if (error) setErr(dbMsg(error.message)); setCard(data ?? null);
    });
    return () => { alive = false; };
  }, [userId]);
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-3" {...backdropProps(onClose)}>
      <div className="w-full max-w-sm rounded-2xl bg-stone-900 p-5 text-stone-200 shadow-2xl ring-1 ring-stone-700" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="使用者資料卡">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar name={card?.display_name} />
            <div>
              <div className="text-lg font-semibold text-stone-100">{card?.display_name ?? (card === undefined ? '載入中…' : '找不到使用者')}{userId === myId ? '（你）' : ''}</div>
              {card && <div className="text-xs text-amber-400">Lv.{card.level} {beanInfo(card.level).emoji} {levelTitle(card.level)} · {card.xp} XP</div>}
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="關閉"><X size={18} /></button>
        </div>
        {err && <p className="mb-2 text-xs text-rose-400">{err}</p>}
        {card && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-stone-800 p-3"><div className="text-xs text-stone-400">今天</div><div className="mt-1 text-sm font-semibold text-emerald-400">{fmtDuration(card.today_minutes)}</div></div>
              <div className="rounded-xl bg-stone-800 p-3"><div className="text-xs text-stone-400">本週</div><div className="mt-1 text-sm font-semibold text-sky-400">{fmtDuration(card.week_minutes ?? 0)}</div></div>
              <div className="rounded-xl bg-stone-800 p-3"><div className="text-xs text-stone-400">累計</div><div className="mt-1 text-sm font-semibold text-stone-100">{fmtDuration(card.total_minutes)}</div></div>
            </div>
            <div className="mt-3 rounded-xl bg-stone-800 p-3">
              <div className="text-xs text-stone-400">目前的咖啡豆種子</div>
              {(() => { const bi = beanInfo(card.level); return (
                <>
                  <div className="mt-0.5 text-sm font-semibold text-amber-300">{bi.emoji} {bi.full}</div>
                  <div className="text-[11px] text-stone-500">{bi.origin}・{bi.note}</div>
                  <div className="mt-2 flex items-center gap-1" aria-label="烘焙程度">
                    {ROASTS.map((r, i) => (
                      <span key={r} className={`rounded px-1.5 py-0.5 text-[10px] ${i <= bi.roastIdx ? 'bg-amber-700/80 text-amber-50' : 'bg-stone-700/50 text-stone-500'}`}>{r}</span>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1" aria-label="咖啡豆圖鑑">
                    {BEANS.map((b, i) => (
                      <span key={b.name} title={i <= bi.beanIdx ? b.name : '尚未解鎖'} className={`grid h-5 w-5 place-items-center rounded text-[11px] ${i <= bi.beanIdx ? 'bg-amber-700/70' : 'bg-stone-700/50 opacity-40'} ${i === bi.beanIdx ? 'ring-1 ring-amber-300' : ''}`}>{i <= bi.beanIdx ? b.emoji : '·'}</span>
                    ))}
                  </div>
                </>
              ); })()}
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-sm text-stone-300"><Flame size={15} className="text-orange-400" />連續完成計畫 {card.streak} 天</div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(card.badges ?? []).length === 0 && <span className="text-xs text-stone-500">還沒有徽章</span>}
              {(card.badges ?? []).map((b) => <span key={b} className="rounded-full bg-stone-800 px-2.5 py-1 text-xs">{b}</span>)}
            </div>
            <p className="mt-3 text-[11px] text-stone-500">讀書時間＝在咖啡廳專注計時「完整跑完」的分鐘數。</p>
          </>
        )}
      </div>
    </div>
  );
}

/** 排行榜：今日 / 本週 / 累計 / 經驗值。點名字看資料卡。 */
export function LeaderboardPanel({ myId, onClose }) {
  const [sort, setSort] = useState('today');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let alive = true;
    setRows(null);
    supabase.rpc('study_leaderboard', { p_day_start: dayStart(), p_sort: sort, p_limit: 50, p_week_start: weekStart() }).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setErr(dbMsg(error.message)); setRows([]); } else { setErr(''); setRows(data ?? []); }
    });
    return () => { alive = false; };
  }, [sort]);
  const medal = (n) => ['🥇', '🥈', '🥉'][n - 1] ?? n;
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-2 sm:p-3" {...backdropProps(onClose)}>
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl bg-stone-900 text-stone-200 shadow-2xl ring-1 ring-stone-700" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="排行榜">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-stone-100"><Trophy size={18} className="text-amber-400" />讀書排行榜</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="關閉"><X size={18} /></button>
        </div>
        <div className="flex gap-1.5 px-4 py-3 text-sm">
          {[['today', '今日'], ['week', '本週'], ['total', '累計'], ['xp', '經驗值']].map(([k, v]) => (
            <button key={k} type="button" onClick={() => setSort(k)} className={`rounded-lg px-3 py-1.5 ${sort === k ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-400 hover:bg-stone-700'}`}>{v}</button>
          ))}
        </div>
        <ul className="flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
          {err && <li className="text-sm text-rose-400">{err}</li>}
          {!rows && <li className="text-sm text-stone-500">載入中…</li>}
          {rows?.map((r) => (
            <li key={r.user_id}>
              <button type="button" onClick={() => openProfile(r.user_id)} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left hover:bg-stone-700 ${r.user_id === myId ? 'bg-amber-900/30 ring-1 ring-amber-700' : 'bg-stone-800'}`}>
                <span className="w-7 text-center text-base font-semibold text-stone-300">{medal(Number(r.rank))}</span>
                <Avatar name={r.display_name} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-stone-100">{r.display_name}{r.user_id === myId ? '（你）' : ''}</span>
                  <span className="block text-xs text-stone-500">Lv.{r.level} {beanInfo(r.level).emoji} {levelTitle(r.level)} · {r.xp} XP</span>
                </span>
                <span className="shrink-0 text-right text-xs">
                  <span className={`flex items-center justify-end gap-1 ${sort === 'today' ? 'font-semibold text-emerald-400' : 'text-emerald-500/80'}`}><BookOpen size={11} />今天 {fmtDuration(r.today_minutes)}</span>
                  <span className={`block ${sort === 'week' ? 'font-semibold text-sky-400' : 'text-sky-500/80'}`}>本週 {fmtDuration(r.week_minutes ?? 0)}</span>
                  <span className={`block ${sort === 'total' ? 'font-semibold text-stone-200' : 'text-stone-400'}`}>累計 {fmtDuration(r.total_minutes)}</span>
                </span>
              </button>
            </li>
          ))}
          {rows?.length === 0 && !err && <li className="text-sm text-stone-500">還沒有人有紀錄，去咖啡廳開始第一輪專注吧！</li>}
        </ul>
      </div>
    </div>
  );
}
