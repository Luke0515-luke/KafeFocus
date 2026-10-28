import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, Coffee, LogIn, MessagesSquare, Leaf, ListChecks, LogOut, Music, Store, Sun, Trophy, Users, Zap, Flower2, Snowflake, Sunset, TreeDeciduous } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useLobbyPresence } from '../hooks/useLobbyPresence';
import { lobbyStats } from '../lib/lobbyStats';
import { CAFE_ORDER, getMeta, getTheme } from '../config/themes';
import { beanInfo, fmtDuration, levelFromXp, levelStart } from '../lib/openProfile';
import { Search, Shuffle } from 'lucide-react';

const ICONS = { Coffee, Music, Sun, Leaf, Store, Zap, Flower2, Snowflake, Sunset, TreeDeciduous };

/** 首頁：列出所有咖啡廳，顯示即時人數，點選進入。 */
export default function CafeLobby({ session, onSelect, onSignOut, onSignIn, onOpenCalendar, onOpenStats, onOpenPlanner, onOpenBoard, onOpenForum, onOpenCredits }) {
  const userId = session?.user?.id ?? null; // 訪客 = null：可以逛，但不載入個人資料
  const [cafes, setCafes] = useState(null);
  const [counts, setCounts] = useState({});
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default | quiet | busy
  const [me, setMe] = useState(null); // 我的狀態：經驗值 + 今天專注分鐘

  useEffect(() => {
    let alive = true;
    (async () => {
      const [c, p] = await Promise.all([
        supabase.from('cafes').select('id, slug, name'),
        userId ? supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      if (!alive) return;
      if (c.error) setError(`讀取咖啡廳失敗：${c.error.message}`); else setCafes(c.data ?? []);
      if (p.data?.display_name) setName(p.data.display_name);
    })();
    return () => { alive = false; };
  }, [userId]);

  // 我的狀態卡（登入後）：目前的咖啡豆、距離下一級還差多少、今天專注多久
  useEffect(() => {
    if (!userId) { setMe(null); return undefined; }
    let alive = true;
    const day = new Date(); day.setHours(0, 0, 0, 0);
    Promise.all([
      supabase.from('study_rewards').select('xp'),
      supabase.from('focus_logs').select('minutes').gte('started_at', day.toISOString()),
    ]).then(([r, f]) => {
      if (!alive || r.error) return; // 還沒執行 study_planner.sql 時就不顯示
      const xp = (r.data ?? []).reduce((a, x) => a + (x.xp || 0), 0);
      const today = (f.data ?? []).reduce((a, x) => a + (x.minutes || 0), 0);
      setMe({ xp, today, level: levelFromXp(xp) });
    });
    return () => { alive = false; };
  }, [userId]);

  // 資料庫端的座位資料：每間店有幾個座位、誰坐著（座位裡的人還要在 Presence 才算數，見 lobbyStats）
  // 再加上心跳計數 cafe_seat_counts（只在 Presence 連不上時當備援）。每 8 秒更新一次，資料量很小。
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [seatsRes, hbRes] = await Promise.all([
        supabase.from('cafe_seats').select('cafe_id, occupant_id'),
        supabase.rpc('cafe_seat_counts'),
      ]);
      if (!alive) return;
      const m = {};
      (seatsRes.data ?? []).forEach((x) => {
        const e = (m[x.cafe_id] ||= { total: 0, occupants: [], heartbeatTaken: null });
        e.total += 1;
        if (x.occupant_id) e.occupants.push(x.occupant_id);
      });
      if (!hbRes.error && hbRes.data) {
        hbRes.data.forEach((x) => {
          const e = (m[x.cafe_id] ||= { total: Number(x.total), occupants: [], heartbeatTaken: null });
          e.heartbeatTaken = Number(x.taken);
        });
      }
      setCounts(m);
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // 各店「真正在線」的人（Presence）：和進到咖啡廳裡看到的是同一份資料
  const presence = useLobbyPresence(useMemo(() => (cafes ?? []).map((c) => c.id), [cafes]));
  const statOf = (id) => lobbyStats(presence[id], counts[id]);

  const sorted = useMemo(() => {
    if (!cafes) return [];
    const rank = (s) => { const i = CAFE_ORDER.indexOf(s); return i === -1 ? 99 : i; };
    const kw = q.trim().toLowerCase();
    const list = cafes.filter((c) => {
      if (!kw) return true;
      const m = getMeta(c.slug);
      return `${c.name} ${m.name} ${m.blurb} ${(m.tags ?? []).join(' ')}`.toLowerCase().includes(kw);
    });
    const taken = (c) => statOf(c.id).online;
    return list.sort((a, b) => {
      if (sortBy === 'quiet') return taken(a) - taken(b) || rank(a.slug) - rank(b.slug);
      if (sortBy === 'busy') return taken(b) - taken(a) || rank(a.slug) - rank(b.slug);
      return rank(a.slug) - rank(b.slug);
    });
  }, [cafes, q, sortBy, counts, presence]);

  // 隨機挑一間還有空位的咖啡廳
  const joinRandom = () => {
    const open = (cafes ?? []).filter((c) => { const n = statOf(c.id); return n.total === 0 || n.seated < n.total; });
    const pool = open.length ? open : cafes ?? [];
    if (pool.length) onSelect(pool[Math.floor(Math.random() * pool.length)].slug);
  };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-stone-900 text-stone-200">
      <div className="mx-auto max-w-5xl px-4 py-6 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))] sm:py-8">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-stone-100">KafeFocus</h1>
            <p className="mt-1 text-sm text-stone-400">{userId ? `${name ? `${name}，` : ''}選一間咖啡廳，找個位子一起專注。` : '歡迎參觀！先逛逛每間咖啡廳，想入座或新增行程時再註冊就好。'}</p>
          </div>
          <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>button]:flex-1 max-sm:[&>button]:justify-center">
            <button type="button" onClick={onOpenPlanner} aria-label="讀書計畫" className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-600">
              <ListChecks size={16} /> <span className="max-sm:hidden">讀書計畫</span>
            </button>
            <button type="button" onClick={onOpenForum} aria-label="讀書論壇" className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
              <MessagesSquare size={16} /> <span className="max-sm:hidden">讀書論壇</span>
            </button>
            <button type="button" onClick={onOpenBoard} aria-label="排行榜" className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
              <Trophy size={16} /> <span className="max-sm:hidden">排行榜</span>
            </button>
            <button type="button" onClick={onOpenCalendar} aria-label="行事曆" className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
              <CalendarDays size={16} /> <span className="max-sm:hidden">行事曆</span>
            </button>
            {userId && (
              <button type="button" onClick={onOpenStats} aria-label="專注統計" className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
                <BarChart3 size={16} /> <span className="max-sm:hidden">統計</span>
              </button>
            )}
            {userId ? (
              <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
                <LogOut size={16} /> <span className="max-sm:hidden">登出</span>
              </button>
            ) : (
              <button type="button" onClick={() => onSignIn()} className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600">
                <LogIn size={16} /> <span className="max-sm:hidden">登入 / 註冊</span>
              </button>
            )}
          </div>
        </header>

        {me && (() => {
          const bean = beanInfo(me.level); const a = levelStart(me.level); const b = levelStart(me.level + 1);
          const pct = Math.min(100, Math.max(0, Math.round(((me.xp - a) / (b - a)) * 100)));
          return (
            <section className="mb-5 rounded-2xl bg-stone-800 p-4 ring-1 ring-stone-700" aria-label="我的狀態">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-stone-400">我的咖啡豆種子</div>
                  <div className="text-base font-semibold text-amber-300">{bean.emoji} Lv.{me.level} {bean.full}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-stone-400">今天專注</div>
                  <div className="text-base font-semibold text-emerald-400">{fmtDuration(me.today)}</div>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-700"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${pct}%` }} /></div>
              <div className="mt-1 text-[11px] text-stone-500">{me.xp} XP・距離下一級（{beanInfo(me.level + 1).full}）還差 {Math.max(0, Math.ceil(b - me.xp))} XP・完成整個讀書項目可直升一級</div>
            </section>
          );
        })()}

        <div className="mb-5 flex flex-wrap items-center gap-2">
          <label className="relative min-w-[10rem] flex-1">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋咖啡廳（例：爵士、北歐、雨夜）" aria-label="搜尋咖啡廳"
              className="w-full rounded-lg border border-stone-700 bg-stone-800 py-2 pl-9 pr-3 text-sm text-stone-100 outline-none focus:border-amber-500" />
          </label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="排序方式" className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 outline-none focus:border-amber-500">
            <option value="default">預設排序</option>
            <option value="quiet">人少優先（安靜）</option>
            <option value="busy">人多優先（熱鬧）</option>
          </select>
          <button type="button" onClick={joinRandom} disabled={!cafes?.length} className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"><Shuffle size={15} />隨機進一間</button>
        </div>

        {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
        {!cafes && !error && <p className="text-stone-500">載入咖啡廳中…</p>}

        {cafes && sorted.length === 0 && <p className="mb-4 text-sm text-stone-500">沒有符合「{q}」的咖啡廳。</p>}
        <div className="grid gap-5 sm:grid-cols-2">
          {sorted.map((cafe) => {
            const meta = getMeta(cafe.slug);
            const theme = getTheme(cafe.slug);
            const Icon = ICONS[meta.icon] ?? Coffee;
            const n = statOf(cafe.id);
            return (
              <button
                key={cafe.id} type="button" onClick={() => onSelect(cafe.slug)}
                className="group overflow-hidden rounded-2xl bg-stone-800 text-left ring-1 ring-stone-700 transition hover:-translate-y-0.5 hover:ring-amber-600"
              >
                <div
                  className="flex h-28 items-end justify-between p-4"
                  style={{ background: `linear-gradient(135deg, ${theme.preview[0]}, ${theme.preview[1]})` }}
                >
                  <Icon size={30} className="text-white/85" />
                  <span className="flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs text-white">
                    <Users size={12} />
                    <span className={`h-1.5 w-1.5 rounded-full ${n.online > 0 ? 'bg-emerald-400' : 'bg-stone-400'}`} />
                    {n.online} 人在線 · {n.seated}/{n.total || '–'} 入座
                  </span>
                </div>
                <div className="p-4">
                  <h2 className="text-lg font-semibold text-stone-100">{cafe.name || meta.name}</h2>
                  <p className="mt-1 min-h-[2.5rem] text-sm text-stone-400">{meta.blurb}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {meta.tags.map((t) => <span key={t} className="rounded-full bg-stone-700 px-2 py-0.5 text-[11px] text-stone-300">{t}</span>)}
                    </div>
                    <span className="text-sm text-amber-500 group-hover:underline">進入 →</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <footer className="mt-8 text-center text-xs text-stone-600">
          <button type="button" onClick={onOpenCredits} className="hover:text-stone-400 hover:underline">版權與授權</button>
          <span className="mx-2">·</span>
          <a href="https://www.threads.com/@0515luke" target="_blank" rel="noopener noreferrer" className="hover:text-stone-400 hover:underline">創作者 Threads @0515luke</a>
        </footer>
      </div>
    </div>
  );
}
