/**
 * 自動讀書排程（純函式，不碰資料庫，可單獨測試）。
 *
 * 依據的學習科學原則：
 *  1. 分散練習 Distributed practice（Cepeda 等 2006）：同一項目攤在多天，而不是塞在最後一天。
 *     → 每天用「剩餘量 ÷ 剩餘可用天數」平均分配。
 *  2. 交錯練習 Interleaving（Rohrer & Taylor 2007）：同一天內不同科目輪流，不連續讀同一科。
 *  3. 間隔複習 / 提取練習 Spaced retrieval（Roediger & Karpicke 2006）：有開啟複習的項目，
 *     把約 20% 的時間留給「接近期限的最後 1–2 天」做複習（間隔約為保留期的 10–20%）。
 *  4. 規劃謬誤 Planning fallacy（Buehler 等）：預估時間自動加 15% 緩衝，並提前 1 天排完（期限當天留空）。
 *  5. 有限的專注力：單一區塊上限 50 分鐘、區塊間休息 10 分鐘，連續 2 個區塊（約 90 分鐘，
 *     接近超晝夜節律週期）後休息 20 分鐘；每日預設上限 4 小時（刻意練習研究，Ericsson 1993）。
 *  6. 晝夜節律：燒腦的項目排在你的高峰時段（早鳥 / 夜貓可設定），低耗腦與複習排在午後低潮；
 *     預設不排 12:00–14:00。
 *  7. 避開行事曆中已有時間的行程。
 */

export const DEFAULT_PREFS = {
  dailyMax: 240,       // 每日最多讀幾分鐘
  blockMin: 50,        // 單一區塊上限
  breakMin: 10,        // 區塊間休息
  buffer: 0.15,        // 時間緩衝
  chronotype: 'morning', // morning | evening | neutral
  busyMin: 60,         // 行事曆事件預設佔用分鐘
  windows: {
    morning:   { on: true, start: '09:00', end: '12:00' },
    afternoon: { on: true, start: '14:00', end: '17:30' },
    evening:   { on: true, start: '19:00', end: '22:00' },
  },
};

export const mergePrefs = (saved) => ({
  ...DEFAULT_PREFS,
  ...(saved || {}),
  windows: Object.fromEntries(Object.keys(DEFAULT_PREFS.windows).map((k) => [k, { ...DEFAULT_PREFS.windows[k], ...(saved?.windows?.[k] || {}) }])),
});

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (k) => { const [y, m, d] = String(k).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k, n) => { const d = parseDate(k); d.setDate(d.getDate() + n); return dateKey(d); };
export const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
export const toMin = (hhmm) => { const [h, m] = String(hhmm).split(':').map(Number); return h * 60 + (m || 0); };
export const fmtMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const ceil5 = (n) => Math.ceil(n / 5) * 5;
const round5 = (n) => Math.round(n / 5) * 5;

function splitBlocks(minutes, maxBlock) {
  const n = Math.max(1, Math.ceil(minutes / maxBlock));
  const base = Math.min(maxBlock, Math.max(5, round5(minutes / n)));
  const out = [];
  let left = minutes;
  for (let i = 0; i < n; i += 1) {
    const sz = i === n - 1 ? left : Math.min(base, left);
    if (sz > 0) out.push(sz);
    left -= sz;
  }
  return out;
}

/**
 * @param {object} a
 * @param {Array}  a.items         study_items 資料列
 * @param {Array}  a.doneSessions  已完成的 study_sessions（會從剩餘量扣掉，也佔用當天額度）
 * @param {object} a.prefs         mergePrefs() 的結果
 * @param {Date}   a.now
 * @param {Array}  a.busy          [{date:'YYYY-MM-DD', start:分鐘, end:分鐘}]
 * @returns {{sessions:Array, warnings:Array, stats:object}}
 */
export function generatePlan({ items, doneSessions = [], prefs: rawPrefs, now = new Date(), busy = [] }) {
  const prefs = mergePrefs(rawPrefs);
  const today = dateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const warnings = [];

  // ---- 1. 把每個項目轉成「任務」（主體 + 可選的複習）----
  const doneByItem = {};
  const reviewDone = new Set();
  const doneByDay = {};
  doneSessions.forEach((s) => {
    doneByItem[s.item_id] = (doneByItem[s.item_id] || 0) + s.minutes;
    if (s.kind === 'review') reviewDone.add(s.item_id);
    doneByDay[s.plan_date] = (doneByDay[s.plan_date] || 0) + s.minutes;
  });

  const tasks = [];
  items.forEach((it) => {
    const remaining = Math.max(0, it.est_minutes - (doneByItem[it.id] || 0));
    if (remaining <= 0) return;
    const need = ceil5(remaining * (1 + prefs.buffer));
    const start = it.start_date && it.start_date > today ? it.start_date : today;
    let last = it.deadline;
    if (last < today) { warnings.push({ type: 'overdue', itemId: it.id, text: `「${it.title}」的期限已過，已盡快排入近期。` }); last = addDays(today, 1); }
    else if (diffDays(start, last) >= 3) last = addDays(last, -1); // 期限當天留空當緩衝
    if (last < start) last = start;

    const weekdays = it.weekdays?.length ? it.weekdays : [0, 1, 2, 3, 4, 5, 6];
    let days = [];
    for (let d = start; d <= last; d = addDays(d, 1)) if (weekdays.includes(parseDate(d).getDay())) days.push(d);
    if (!days.length) {
      warnings.push({ type: 'weekday', itemId: it.id, text: `「${it.title}」在你選的星期幾與期限之間沒有可用的日子，已改為任何一天。` });
      for (let d = start; d <= last; d = addDays(d, 1)) days.push(d);
    }
    const base = { itemId: it.id, title: it.title, diff: it.difficulty || 2, deadline: it.deadline, windows: it.windows?.length ? it.windows : Object.keys(prefs.windows) };

    if (it.review && !reviewDone.has(it.id) && days.length >= 4 && need >= 60) {
      const reviewMin = Math.min(30, Math.max(10, round5(need * 0.2)));
      const k = days.length >= 8 ? 2 : 1;
      tasks.push({ ...base, key: `${it.id}:study`, kind: 'study', need: need - reviewMin, remaining: need - reviewMin, days: days.slice(0, -k) });
      tasks.push({ ...base, key: `${it.id}:review`, kind: 'review', diff: 1, need: reviewMin, remaining: reviewMin, days: days.slice(-k) });
    } else {
      tasks.push({ ...base, key: `${it.id}:study`, kind: 'study', need, remaining: need, days });
    }
  });
  if (!tasks.length) return { sessions: [], warnings, stats: { totalMinutes: 0, unmet: {}, overloadDays: [] } };

  const horizonEnd = tasks.reduce((m, t) => (t.days[t.days.length - 1] > m ? t.days[t.days.length - 1] : m), today);
  const winOrder = Object.keys(prefs.windows).sort((a, b) => toMin(prefs.windows[a].start) - toMin(prefs.windows[b].start));
  const peak = prefs.chronotype === 'evening' ? 'evening' : prefs.chronotype === 'morning' ? 'morning' : null;

  // ---- 2. 逐日配置 ----
  const run = (cap) => {
    const ts = tasks.map((t) => ({ ...t, remaining: t.need, daysSet: new Set(t.days) }));
    const sessions = [];
    const overloadDays = [];

    for (let day = today; day <= horizonEnd; day = addDays(day, 1)) {
      let used = doneByDay[day] || 0;
      let capLeft = cap - used;
      if (capLeft < 15) continue;
      const active = ts.filter((t) => t.remaining > 0 && t.daysSet.has(day));
      if (!active.length) continue;
      active.sort((a, b) => (a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : b.diff - a.diff));

      // 2a. 今天要給每個任務多少分鐘（平均分散）
      const alloc = [];
      active.forEach((t) => {
        const daysLeft = t.days.filter((d) => d >= day).length || 1;
        let m = Math.max(ceil5(t.remaining / daysLeft), Math.min(15, t.remaining));
        m = Math.min(m, t.remaining, capLeft);
        if (m <= 0) return;
        capLeft -= m;
        alloc.push({ t, blocks: splitBlocks(m, prefs.blockMin) });
      });

      // 2b. 排成交錯的序列：困難的先、同一科不連續
      const order = [...alloc].sort((a, b) => b.t.diff - a.t.diff || (a.t.deadline < b.t.deadline ? -1 : 1));
      const seq = [];
      let prev = null;
      while (order.some((o) => o.blocks.length)) {
        const pick = order.find((o) => o.blocks.length && o.t.key !== prev) || order.find((o) => o.blocks.length);
        seq.push({ t: pick.t, size: pick.blocks.shift() });
        prev = pick.t.key;
      }

      // 2c. 放進時段
      const wins = {};
      winOrder.forEach((id) => {
        const w = prefs.windows[id];
        if (!w.on) return;
        let start = toMin(w.start);
        const end = toMin(w.end);
        if (day === today) start = Math.max(start, ceil5(nowMin + 10));
        if (end - start >= 15) wins[id] = { id, cursor: start, end, run: 0 };
      });
      const busyToday = busy.filter((b) => b.date === day);
      const skipBusy = (c, size) => {
        let moved = true;
        while (moved) {
          moved = false;
          for (const b of busyToday) if (c < b.end && c + size > b.start) { c = b.end; moved = true; }
        }
        return c;
      };
      const placed = [];
      seq.forEach(({ t, size }) => {
        const allowed = winOrder.filter((id) => wins[id] && t.windows.includes(id));
        const pool = allowed.length ? allowed : winOrder.filter((id) => wins[id]);
        const ordered = t.diff >= 2 && peak
          ? [...pool.filter((i) => i === peak), ...pool.filter((i) => i !== peak)]
          : t.diff === 1 && peak
            ? [...pool.filter((i) => i !== peak), ...pool.filter((i) => i === peak)]
            : pool;
        for (const id of ordered) {
          const w = wins[id];
          const c = skipBusy(w.cursor, size);
          if (c + size <= w.end) {
            placed.push({ t, size, start: c });
            w.run += 1;
            w.cursor = c + size + (w.run >= 2 ? Math.max(20, prefs.breakMin * 2) : prefs.breakMin);
            if (w.run >= 2) w.run = 0;
            return;
          }
        }
      });
      placed.sort((a, b) => a.start - b.start);
      placed.forEach((p) => {
        p.t.remaining -= p.size;
        used += p.size;
        sessions.push({ item_id: p.t.itemId, kind: p.t.kind, plan_date: day, start_time: fmtMin(p.start), minutes: p.size });
      });
      if (used > prefs.dailyMax) overloadDays.push(day);
    }
    const unmet = {};
    ts.forEach((t) => { if (t.remaining > 0) unmet[t.itemId] = (unmet[t.itemId] || 0) + t.remaining; });
    return { sessions, unmet, overloadDays };
  };

  let result = run(prefs.dailyMax);
  const unmetSum = (r) => Object.values(r.unmet).reduce((a, b) => a + b, 0);
  if (unmetSum(result)) {
    const heavy = run(Math.min(600, Math.round(prefs.dailyMax * 1.5)));
    if (unmetSum(heavy) < unmetSum(result)) result = heavy;
  }
  if (result.overloadDays.length) {
    warnings.push({ type: 'overload', text: `有 ${result.overloadDays.length} 天超過你設定的每日上限（${prefs.dailyMax} 分鐘），因為期限太緊。建議放寬期限或減少項目。` });
  }
  items.forEach((it) => {
    const miss = result.unmet[it.id];
    if (miss > 0) warnings.push({ type: 'unmet', itemId: it.id, text: `「${it.title}」在期限前仍排不下 ${miss} 分鐘：請延後期限、增加可用時段／星期，或提高每日上限。` });
  });

  return {
    sessions: result.sessions,
    warnings,
    stats: { totalMinutes: result.sessions.reduce((a, s) => a + s.minutes, 0), unmet: result.unmet, overloadDays: result.overloadDays },
  };
}
