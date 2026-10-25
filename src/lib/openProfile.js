/** 任何地方點到使用者名字 → 開啟他的資料卡（由 App 監聽） */
export const openProfile = (uid) => {
  if (uid) window.dispatchEvent(new CustomEvent('kf-open-profile', { detail: uid }));
};
export const LEVEL_TITLES = ['生豆', '淺焙', '中焙', '深焙', '手沖達人', '拿鐵藝術家', '義式大師', '咖啡廳常客', '傳奇烘豆師'];
export const levelTitle = (lv) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length, Math.max(1, lv)) - 1];
export const levelStart = (lv) => 50 * (lv - 1) ** 2; // 與 SQL 的 floor(sqrt(xp/50))+1 對應
export const fmtDuration = (m) => {
  m = Math.round(m || 0);
  if (m < 60) return `${m} 分鐘`;
  const h = Math.floor(m / 60); const r = m % 60;
  return r ? `${h} 小時 ${r} 分` : `${h} 小時`;
};
