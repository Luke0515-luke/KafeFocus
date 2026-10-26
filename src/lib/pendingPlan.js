// 「這輪專注綁定哪個今日計畫區塊」。存在 localStorage，重新整理 / 關掉網頁再回來也不會忘，
// 專注跑完（即使當時人不在）就能自動完成該區塊並給 XP。
const KEY = 'kf_pending_plan';
const MAX_AGE_MS = 12 * 3600 * 1000;

export function savePendingPlan(planId, uid) {
  try {
    if (planId && uid) window.localStorage.setItem(KEY, JSON.stringify({ id: planId, uid, at: Date.now() }));
    else window.localStorage.removeItem(KEY);
  } catch { /* 無痕模式等情況略過 */ }
}

export function readPendingPlan(uid) {
  try {
    const v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (!v?.id || v.uid !== uid || Date.now() - v.at > MAX_AGE_MS) return null;
    return v;
  } catch { return null; }
}

export const clearPendingPlan = () => savePendingPlan(null);
