/** 任何地方點到使用者名字 → 開啟他的資料卡（由 App 監聽） */
export const openProfile = (uid) => {
  if (uid) window.dispatchEvent(new CustomEvent('kf-open-profile', { detail: uid }));
};
/** 20 種咖啡豆種子：等級越高，豆子越稀有。完成整個讀書項目（完成者）會自動直升下一級。 */
export const BEANS = [
  { emoji: '🌱', name: '生豆種子', origin: '尚未烘焙', note: '一切都從一顆種子開始' },
  { emoji: '🫘', name: '巴西 聖多斯', origin: '巴西', note: '堅果、巧克力，溫和順口' },
  { emoji: '🫘', name: '哥倫比亞 蘇帝摩', origin: '哥倫比亞', note: '焦糖甜感，酸度柔和' },
  { emoji: '🫘', name: '越南 羅布斯塔', origin: '越南', note: '濃厚厚實，咖啡因滿滿' },
  { emoji: '🫘', name: '墨西哥 恰帕斯', origin: '墨西哥', note: '乾淨輕盈，帶可可香' },
  { emoji: '🫘', name: '印度 邁索爾', origin: '印度', note: '低酸、辛香料尾韻' },
  { emoji: '☕', name: '瓜地馬拉 安提瓜', origin: '瓜地馬拉', note: '煙燻可可與微微花香' },
  { emoji: '☕', name: '哥斯大黎加 塔拉珠', origin: '哥斯大黎加', note: '蜂蜜甜、乾淨明亮' },
  { emoji: '☕', name: '薩爾瓦多 帕卡馬拉', origin: '薩爾瓦多', note: '大顆粒豆，柑橘與黑糖' },
  { emoji: '☕', name: '蘇門答臘 曼特寧', origin: '印尼', note: '藥草、雪松，醇厚綿長' },
  { emoji: '🏔️', name: '台灣 阿里山', origin: '台灣', note: '高山茶感，花果甜' },
  { emoji: '🏔️', name: '肯亞 AA', origin: '肯亞', note: '黑醋栗、莓果酸甜' },
  { emoji: '🏔️', name: '坦尚尼亞 吉力馬札羅', origin: '坦尚尼亞', note: '明亮酸質，紅酒尾韻' },
  { emoji: '🏔️', name: '盧安達 波旁', origin: '盧安達', note: '紅茶、紅糖與柑橘' },
  { emoji: '🌺', name: '夏威夷 可娜', origin: '美國夏威夷', note: '火山土壤，圓潤細緻' },
  { emoji: '🌸', name: '衣索比亞 耶加雪菲', origin: '衣索比亞', note: '茉莉花香、檸檬與莓果' },
  { emoji: '🌸', name: '葉門 摩卡 馬塔里', origin: '葉門', note: '紅酒、乾果與巧克力' },
  { emoji: '👑', name: '牙買加 藍山', origin: '牙買加', note: '平衡無瑕，優雅甘甜' },
  { emoji: '👑', name: '巴拿馬 藝伎', origin: '巴拿馬', note: '茉莉、蜜桃、佛手柑' },
  { emoji: '💎', name: '傳奇 競標級藝伎', origin: '巴拿馬翡翠莊園', note: '萬中選一的傳奇種子' },
];
export const LEVEL_TITLES = BEANS.map((b) => b.name);
export const beanInfo = (lv) => BEANS[Math.min(BEANS.length, Math.max(1, Math.floor(Number(lv)) || 1)) - 1];
export const levelTitle = (lv) => beanInfo(lv).name;
export const levelStart = (lv) => 50 * (lv - 1) ** 2; // 與 SQL 的 floor(sqrt(xp/50))+1 對應
export const fmtDuration = (m) => {
  m = Math.round(m || 0);
  if (m < 60) return `${m} 分鐘`;
  const h = Math.floor(m / 60); const r = m % 60;
  return r ? `${h} 小時 ${r} 分` : `${h} 小時`;
};
