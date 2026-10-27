
/** 角色外觀（膚色、上衣、褲子、頭髮）：顏色都是 #rrggbb。沒設定的欄位用預設值；shirt 為 null 時依使用者 id 挑一個預設衣服色。 */
export const SWATCHES = {
  skin: ['#f5d6bd', '#e8b997', '#d2a984', '#b98763', '#8d5a3c', '#5e3a26'],
  shirt: ['#e9e4d8', '#c0392b', '#e08e45', '#e6c84a', '#4f9a6a', '#3f7cc0', '#6a5acd', '#d46a9a', '#2b2b30', '#7a5a3a'],
  pants: ['#2f3236', '#1b2a4a', '#4a5a52', '#7a5a3a', '#b9a98a', '#8c2f39'],
  hair: ['#241912', '#4a2f1d', '#8b5a2b', '#d6b36a', '#b5483a', '#6b6b72', '#f2f2f2'],
};
export const OUTFIT_LABELS = { skin: '膚色', shirt: '上衣', pants: '褲子', hair: '頭髮' };

/** 造型選項（id, 名稱）：頭型、臉（表情 / 配件）、髮型 */
export const HEAD_OPTIONS = [['round', '圓臉'], ['oval', '鵝蛋臉'], ['square', '方臉'], ['wide', '寬臉']];
export const FACE_OPTIONS = [['smile', '微笑'], ['happy', '笑瞇眼'], ['cool', '酷酷的'], ['sleepy', '睏睏'], ['blush', '害羞'], ['glasses', '眼鏡']];
export const HAIR_OPTIONS = [['short', '短髮'], ['buzz', '平頭'], ['bob', '鮑伯頭'], ['long', '長髮'], ['ponytail', '馬尾'], ['bun', '包子頭'], ['curly', '捲髮'], ['spiky', '刺蝟頭'], ['bald', '光頭']];
export const STYLE_OPTIONS = { head: HEAD_OPTIONS, face: FACE_OPTIONS, hairStyle: HAIR_OPTIONS };
export const STYLE_LABELS = { head: '頭型', face: '臉', hairStyle: '髮型' };
const STYLE_DEFAULTS = { head: 'round', face: 'smile', hairStyle: 'short' };

const DEFAULTS = { skin: '#d2a984', pants: '#2f3236', hair: '#241912' };
const CLOTHES = ['#5b4636', '#3f4f48', '#44465a', '#5d4343', '#51493a'];
const HEX = /^#[0-9a-f]{6}$/i;
const LS_KEY = 'kf_outfit';

export const hashShirt = (id = '') => {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return CLOTHES[h % CLOTHES.length];
};

/** 驗證（也用來檢查網路上收到的資料）：回傳乾淨的 { skin, shirt, pants, hair } 或 null（全都沒設定） */
export function sanitizeOutfit(o) {
  if (!o || typeof o !== 'object') return null;
  const pick = (k) => (typeof o[k] === 'string' && HEX.test(o[k]) ? o[k].toLowerCase() : null);
  const opt = (k) => (STYLE_OPTIONS[k].some(([id]) => id === o[k]) ? o[k] : null);
  const out = { skin: pick('skin'), shirt: pick('shirt'), pants: pick('pants'), hair: pick('hair'), head: opt('head'), face: opt('face'), hairStyle: opt('hairStyle') };
  return Object.values(out).some(Boolean) ? out : null;
}

/** 補上預設值，給 3D 角色使用。custom = 使用者有自訂過（沒自訂的 Ready Player Me 角色不去動它的材質） */
export function resolveOutfit(o, id) {
  const s = sanitizeOutfit(o);
  return {
    skin: s?.skin ?? DEFAULTS.skin,
    shirt: s?.shirt ?? hashShirt(id),
    pants: s?.pants ?? DEFAULTS.pants,
    hair: s?.hair ?? DEFAULTS.hair,
    head: s?.head ?? STYLE_DEFAULTS.head,
    face: s?.face ?? STYLE_DEFAULTS.face,
    hairStyle: s?.hairStyle ?? STYLE_DEFAULTS.hairStyle,
    custom: !!(s && (s.skin || s.shirt || s.pants || s.hair)),
  };
}

export const outfitKey = (o) => (sanitizeOutfit(o) ? JSON.stringify(sanitizeOutfit(o)) : '');

/** 讀取：登入帳號的 user_metadata（跨裝置）優先，沒有再用這台裝置的 localStorage */
export function loadOutfit(user) {
  const remote = sanitizeOutfit(user?.user_metadata?.outfit);
  if (remote) return remote;
  try { return sanitizeOutfit(JSON.parse(window.localStorage.getItem(LS_KEY))); } catch { return null; }
}

let timer = 0;
/** 儲存：立刻寫 localStorage；0.7 秒沒再改才寫到帳號（Supabase Auth 的 user_metadata，不用改資料庫） */
export function persistOutfit(supabase, outfit) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(outfit)); } catch { /* 無痕模式：忽略 */ }
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    supabase.auth.updateUser({ data: { outfit } }).catch(() => { /* 離線：下次再存 */ });
  }, 700);
}

/** 用材質自己的 Color 物件混色（白 → 目標色），這樣本檔不必 import three，大廳就不用下載 3D 引擎 */
const tint = (color, hex, strength) => { const t = color.clone().set(hex); return color.set('#ffffff').lerp(t, strength); };

/**
 * Ready Player Me 模型：依材質名稱換色（只有使用者自訂過才會呼叫）。
 * 上衣 / 褲子去掉貼圖改純色；膚色與頭髮保留貼圖、用顏色相乘上色（臉部細節才不會不見）。
 * 材質會先 clone，避免同一個 .glb 的其他人跟著變色。
 */
export function applyOutfitToRig(root, outfit) {
  if (!outfit?.custom) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const name = `${o.name} ${o.material.name ?? ''}`.toLowerCase();
    let kind = null;
    if (/outfit_top/.test(name)) kind = 'shirt';
    else if (/outfit_bottom/.test(name)) kind = 'pants';
    else if (/hair/.test(name)) kind = 'hair';
    else if (/wolf3d_(body|head|skin)/.test(name)) kind = 'skin';
    if (!kind) return;
    const m = o.material.clone();
    if (kind === 'shirt' || kind === 'pants') { m.map = null; m.color.set(outfit[kind]); } else tint(m.color, outfit[kind], kind === 'skin' ? 0.7 : 0.8);
    m.needsUpdate = true;
    o.material = m;
  });
}
