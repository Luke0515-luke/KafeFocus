import { useEffect, useState } from 'react';

const calc = (endsAt) =>
  endsAt ? Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000)) : null;

/** 依「結束時間」在本地每秒推算剩餘秒數；沒有結束時間回傳 null。
 *  只同步 phase_ends_at 一個欄位，不需要每秒打資料庫。 */
export function useCountdown(endsAt) {
  const [remaining, setRemaining] = useState(() => calc(endsAt));

  useEffect(() => {
    setRemaining(calc(endsAt));
    if (!endsAt) return undefined;
    const id = setInterval(() => setRemaining(calc(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return remaining;
}

export function formatMMSS(totalSec) {
  if (totalSec == null) return '--:--';
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
