import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Coffee, LogIn, MessagesSquare, Leaf, ListChecks, LogOut, Music, Store, Sun, Trophy, Users, Zap, Flower2, Snowflake } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { CAFE_ORDER, getMeta, getTheme } from '../config/themes';

const ICONS = { Coffee, Music, Sun, Leaf, Store, Zap, Flower2, Snowflake };

/** 首頁：列出所有咖啡廳，顯示即時人數，點選進入。 */
export default function CafeLobby({ session, onSelect, onSignOut, onSignIn, onOpenCalendar, onOpenPlanner, onOpenBoard, onOpenForum }) {
  const userId = session?.user?.id ?? null; // 訪客 = null：可以逛，但不載入個人資料
  const [cafes, setCafes] = useState(null);
  const [counts, setCounts] = useState({});
  const [name, setName] = useState('');
  const [error, setError] = useState('');

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

  // 每 15 秒更新各店人數（只抓兩個欄位，資料量很小）
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase.from('cafe_seats').select('cafe_id, occupant_id');
      if (!alive || !data) return;
      const m = {};
      data.forEach((r) => {
        const e = (m[r.cafe_id] ||= { total: 0, taken: 0 });
        e.total += 1;
        if (r.occupant_id) e.taken += 1;
      });
      setCounts(m);
    };
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const sorted = useMemo(() => {
    if (!cafes) return [];
    const rank = (s) => { const i = CAFE_ORDER.indexOf(s); return i === -1 ? 99 : i; };
    return [...cafes].sort((a, b) => rank(a.slug) - rank(b.slug));
  }, [cafes]);

  return (
    <div className="h-[100dvh] overflow-y-auto bg-stone-900 text-stone-200">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-stone-100">KafeFocus</h1>
            <p className="mt-1 text-sm text-stone-400">{userId ? `${name ? `${name}，` : ''}選一間咖啡廳，找個位子一起專注。` : '歡迎參觀！先逛逛每間咖啡廳，想入座或新增行程時再註冊就好。'}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onOpenPlanner} className="flex items-center gap-1.5 rounded-lg bg-amber-700 px-3 py-2 text-sm text-white hover:bg-amber-600">
              <ListChecks size={16} /> 讀書計畫
            </button>
            <button type="button" onClick={onOpenForum} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
              <MessagesSquare size={16} /> 讀書論壇
            </button>
            <button type="button" onClick={onOpenBoard} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
              <Trophy size={16} /> 排行榜
            </button>
            <button type="button" onClick={onOpenCalendar} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
              <CalendarDays size={16} /> 行事曆
            </button>
            {userId ? (
              <button type="button" onClick={onSignOut} className="flex items-center gap-1.5 rounded-lg bg-stone-800 px-3 py-2 text-sm hover:bg-stone-700">
                <LogOut size={16} /> 登出
              </button>
            ) : (
              <button type="button" onClick={() => onSignIn()} className="flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white hover:bg-emerald-600">
                <LogIn size={16} /> 登入 / 註冊
              </button>
            )}
          </div>
        </header>

        {error && <p className="mb-4 text-sm text-rose-400">{error}</p>}
        {!cafes && !error && <p className="text-stone-500">載入咖啡廳中…</p>}

        <div className="grid gap-5 sm:grid-cols-2">
          {sorted.map((cafe) => {
            const meta = getMeta(cafe.slug);
            const theme = getTheme(cafe.slug);
            const Icon = ICONS[meta.icon] ?? Coffee;
            const n = counts[cafe.id] ?? { total: 0, taken: 0 };
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
                    <span className={`h-1.5 w-1.5 rounded-full ${n.taken > 0 ? 'bg-emerald-400' : 'bg-stone-400'}`} />
                    {n.taken}/{n.total || '–'} 人在座
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
      </div>
    </div>
  );
}
