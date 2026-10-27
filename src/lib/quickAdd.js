import { addDays, dateKey, parseDate } from './scheduler';

const CN = { 零: 0, 一: 1, 二: 2, 兩: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const num = (s) => {
  if (/^\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === '半') return 0.5;
  if (s.length === 1) return CN[s] ?? NaN;
  if (s[0] === '十') return 10 + (CN[s[1]] ?? 0);
  if (s[1] === '十') return CN[s[0]] * 10 + (CN[s[2]] ?? 0);
  return NaN;
};
const WD = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
const N = '(\\d+(?:\\.\\d+)?|[零一二兩两三四五六七八九十]{1,3})';

/**
 * 把一句話拆成項目表單：「微積分第3章 2小時 週五前 燒腦」→ { title, minutes: 120, deadline, difficulty: 3 }
 * 能辨認：時間（2小時 / 90分 / 1.5h / 半小時）、期限（今天 明天 後天 3天後 兩週後 下週五 週日前 12/25 12月25日 月底）、難度（燒腦 / 輕鬆）。
 * 回傳 found 是辨認到的項目（用來顯示給使用者確認）。
 */
export function parseQuick(input, now = new Date()) {
  let text = ` ${String(input ?? '')} `;
  const out = { title: '', found: [] };
  const take = (re, fn) => {
    const m = text.match(re);
    if (!m) return false;
    const r = fn(m);
    if (r === false) return false;
    text = text.replace(m[0], ' ');
    return true;
  };
  const today = dateKey(now);

  // 時間
  take(new RegExp(`${N}\\s*個?\\s*半?\\s*(?:小時|小时|時|hrs?|h)(?![a-z])(半)?`, 'i'), (m) => {
    const v = num(m[1]); if (Number.isNaN(v)) return false;
    out.minutes = Math.round((v + (m[2] ? 0.5 : 0)) * 60); out.found.push(`${out.minutes} 分鐘`); return true;
  }) || take(/半\s*(?:個)?\s*小時/, () => { out.minutes = 30; out.found.push('30 分鐘'); }) ||
    take(new RegExp(`${N}\\s*(?:分鐘|分钟|分|mins?|m)(?![a-z])`, 'i'), (m) => {
      const v = num(m[1]); if (Number.isNaN(v)) return false;
      out.minutes = Math.round(v); out.found.push(`${out.minutes} 分鐘`); return true;
    });
  if (out.minutes) out.minutes = Math.min(12000, Math.max(5, out.minutes));

  // 難度
  if (take(/燒腦|烧脑|困難|很難|高難度|硬骨頭/, () => { out.difficulty = 3; out.found.push('難度：燒腦'); })) { /* ok */ } else
  take(/輕鬆|简单|簡單|背誦|複習用|低難度/, () => { out.difficulty = 1; out.found.push('難度：輕鬆'); });

  // 期限
  const setDate = (d, label) => { out.deadline = d; out.found.push(`期限 ${d}（${label}）`); return true; };
  take(/大後天|大后天/, () => setDate(addDays(today, 3), '大後天'))
    || take(/後天|后天/, () => setDate(addDays(today, 2), '後天'))
    || take(/明天|明日/, () => setDate(addDays(today, 1), '明天'))
    || take(/今天|今日|今晚/, () => setDate(today, '今天'))
    || take(new RegExp(`${N}\\s*(?:天|日)\\s*(?:後|后|內|内)`), (m) => { const v = num(m[1]); return Number.isNaN(v) ? false : setDate(addDays(today, Math.round(v)), `${v} 天後`); })
    || take(new RegExp(`${N}\\s*(?:週|周|星期)\\s*(?:後|后|內|内)`), (m) => { const v = num(m[1]); return Number.isNaN(v) ? false : setDate(addDays(today, Math.round(v * 7)), `${v} 週後`); })
    || take(new RegExp(`${N}\\s*個?月\\s*(?:後|后|內|内)`), (m) => { const v = num(m[1]); return Number.isNaN(v) ? false : setDate(addDays(today, Math.round(v * 30)), `${v} 個月後`); })
    || take(/(下+)\s*(?:個)?\s*(?:週|周|星期|禮拜)\s*([一二三四五六日天])/, (m) => {
      const wd = WD[m[2]]; const cur = parseDate(today).getDay();
      const base = addDays(today, (7 - ((cur + 6) % 7)) + 7 * (m[1].length - 1)); // 下週一
      return setDate(addDays(base, (wd + 6) % 7), `下週${m[2]}`);
    })
    || take(/(?:本|這|这)?\s*(?:週|周|星期|禮拜)\s*([一二三四五六日天])/, (m) => {
      const wd = WD[m[1]]; const cur = parseDate(today).getDay();
      let diff = (wd - cur + 7) % 7; if (diff === 0) diff = 7;
      return setDate(addDays(today, diff), `週${m[1]}`);
    })
    || take(/(\d{1,2})\s*[/月]\s*(\d{1,2})\s*日?/, (m) => {
      const mo = Number(m[1]); const da = Number(m[2]);
      if (mo < 1 || mo > 12 || da < 1 || da > 31) return false;
      let y = now.getFullYear();
      let d = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
      if (d < today) { y += 1; d = `${y}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`; }
      return setDate(d, `${mo}/${da}`);
    })
    || take(/月底|月末/, () => {
      const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const k = dateKey(d); return setDate(k < today ? dateKey(new Date(now.getFullYear(), now.getMonth() + 2, 0)) : k, '月底');
    });
  text = text.replace(/(?:之前|以前|前|截止|交|完成|為止|内|內)(?=\s|$)/g, ' ');

  out.title = text.replace(/[，,。；;、]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || String(input ?? '').trim().slice(0, 60);
  return out;
}
