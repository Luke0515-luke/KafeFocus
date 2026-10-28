/** 專注統計：把 focus_logs 整理成「今日進度、連續天數、本週圖表」。全部用本地時區的日期，純函式方便測試。 */
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const WEEKDAY = '日一二三四五六';

export const DEFAULT_GOAL = 120;
export const GOAL_MIN = 10;
export const GOAL_MAX = 720;
export const clampGoal = (v) => Math.min(GOAL_MAX, Math.max(GOAL_MIN, Math.round(Number(v)) || DEFAULT_GOAL));

/**
 * @param logs [{ minutes, started_at }]
 * @param goal 每日目標（分鐘）
 * 連續天數：從今天往回數「每天至少有一筆專注」；今天還沒讀的話從昨天開始數，所以早上不會看到連續天數歸零。
 */
export function summarize(logs, goal = DEFAULT_GOAL, now = new Date()) {
  const g = clampGoal(goal);
  const byDay = {};
  let total = 0;
  for (const l of logs ?? []) {
    const m = Number(l.minutes) || 0;
    const t = new Date(l.started_at);
    if (m <= 0 || Number.isNaN(t.getTime())) continue;
    const k = dayKey(t);
    byDay[k] = (byDay[k] || 0) + m;
    total += m;
  }

  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const today = byDay[dayKey(today0)] || 0;

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today0, i - 6);
    const minutes = byDay[dayKey(d)] || 0;
    return { key: dayKey(d), label: WEEKDAY[d.getDay()], minutes, isToday: i === 6, hitGoal: minutes >= g };
  });
  const weekTotal = week.reduce((a, x) => a + x.minutes, 0);

  let cur = today > 0 ? today0 : addDays(today0, -1);
  let streak = 0;
  while (byDay[dayKey(cur)]) { streak += 1; cur = addDays(cur, -1); }

  // 資料範圍內最長的連續天數
  let best = 0; let run = 0; let prev = null;
  Object.keys(byDay).sort().forEach((k) => {
    const [y, mo, da] = k.split('-').map(Number);
    const d = new Date(y, mo - 1, da);
    run = prev && dayKey(addDays(prev, 1)) === k ? run + 1 : 1;
    best = Math.max(best, run); prev = d;
  });

  const bestDay = Object.entries(byDay).reduce((a, [k, m]) => (m > a.minutes ? { key: k, minutes: m } : a), { key: null, minutes: 0 });
  return {
    today, goal: g, pct: Math.min(1, today / g), reached: today >= g,
    streak, bestStreak: best, week, weekTotal,
    weekAvg: Math.round(weekTotal / 7), goalDays: week.filter((x) => x.hitGoal).length,
    total, bestDay,
  };
}

export function fmtMinutes(m) {
  const v = Math.max(0, Math.round(m));
  if (v < 60) return `${v} 分`;
  return `${Math.floor(v / 60)} 小時${v % 60 ? ` ${v % 60} 分` : ''}`;
}
