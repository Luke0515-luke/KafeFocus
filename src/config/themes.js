/**
 * 每間咖啡廳的主題與介紹。key（slug）必須和資料庫 cafes.slug 一致。
 * 想新增咖啡廳：1) 這裡加一筆 CAFES  2) 在 SQL 的 slug 清單加上同一個 slug  3)（可選）新增一個 THEME。
 * 新增咖啡廳後，要在 Supabase 執行 new_bright_cafe.sql（或用 scripts/gen-seats-sql.mjs 產生座位 SQL）。
 */
export const THEMES = {
  roast: {
    id: 'roast',
    bg: '#2b1d16', fog: [26, 46],
    ambient: ['#ffd1a3', 0.5],
    hemi: ['#ffe0bd', '#3a2418', 0.5],
    key: ['#ffcb94', 0.85],
    lamp: ['#ffb470', 1.15],                       // [燈光顏色, 亮度倍率]
    floor: ['#5a3a26', '#4d3120', '#63402a', '#46301f', '#553826'],
    backWall: { type: 'brick', colors: ['#7e4634', '#8a4e3a', '#6f3b2d', '#7a4333', '#613629'], mortar: '#3a2c26' },
    sideWall: { base: '#1d120c', slat: '#5a3822' },
    sky: 'dusk', trim: '#241810',
    features: { piano: true, records: true, hanging: 3, plants: 4 },
    preview: ['#2b1d16', '#a35a40'],
  },
  jazz: {
    id: 'jazz',
    bg: '#141a2c', fog: [24, 44],
    ambient: ['#b9c4ff', 0.42],
    hemi: ['#c9d2ff', '#241a22', 0.42],
    key: ['#ffbf88', 0.7],
    lamp: ['#ffa85a', 1.3],
    floor: ['#3d2c26', '#34251f', '#45322a', '#2f221c', '#3a2a23'],
    backWall: { type: 'plaster', color: '#27344e' },
    sideWall: { base: '#10151f', slat: '#2f3e5c' },
    sky: 'night', trim: '#0e1118',
    features: { piano: true, records: true, hanging: 2, plants: 3 },
    preview: ['#141a2c', '#c58a4a'],
  },
  morning: {
    id: 'morning',
    bg: '#cdbfae', fog: [30, 55],
    ambient: ['#fff2dc', 1.0],
    hemi: ['#fff6e6', '#b79a78', 0.8],
    key: ['#fff0d6', 1.35],
    lamp: ['#ffd9a0', 0.45],
    floor: ['#b98f63', '#c29a6d', '#ae8458', '#c8a276', '#b48a5e'],
    backWall: { type: 'plaster', color: '#eadcc3' },
    sideWall: { base: '#c9b595', slat: '#e2cfa9' },
    sky: 'day', trim: '#8a6a48', light: true,
    features: { piano: false, records: false, hanging: 4, plants: 6 },
    preview: ['#d8c4a2', '#f1e3c8'],
  },
  bright: {
    id: 'bright',
    light: true,                                   // 淺色主題：地毯、大理石桌面改用淺色
    bg: '#eef3ee', fog: [34, 60],
    ambient: ['#ffffff', 1.25],
    hemi: ['#ffffff', '#d8d2c2', 1.0],
    key: ['#fff8ea', 1.6],
    lamp: ['#fff0cf', 0.35],                       // 白天幾乎不靠燈，吊燈只當裝飾
    floor: ['#d9bc8e', '#d0b283', '#e1c797', '#cbac7c', '#d6b88a'],
    backWall: { type: 'plaster', color: '#f6f2e8' },
    sideWall: { base: '#e9e3d3', slat: '#f3eee1' },
    sky: 'day', trim: '#2a6b4d',
    accent: '#2a6b4d',                             // 品牌綠：牆裙
    rugs: [['#bcd9c6', '#d3e6d9', '#eef5ef'], ['#d9cfb8', '#e7dfcb', '#f4eedd']],
    palette: {
      leathers: ['#2f7556', '#3a8564', '#27634a', '#4a9573'],   // 綠色椅墊
      chairWood: { color: '#cfae82', roughness: 0.55 },
      barBody: '#d6b88c', barTop: '#ead6b4',
      slab: '#e3c9a0', square: '#e8d3ad', low: '#d8bd92',
      counter: '#2a6b4d', sofa: '#3c8564', shade: '#2a6b4d',
      orb: '#35a874', orbHover: '#58d79e',
    },
    features: { piano: false, records: false, hanging: 5, plants: 8 },
    preview: ['#f6f2e8', '#2a6b4d'],
  },
  forest: {
    id: 'forest',
    bg: '#16221a', fog: [24, 44],
    ambient: ['#e8ffdc', 0.55],
    hemi: ['#d6f2c8', '#22301f', 0.5],
    key: ['#ffe8b8', 0.8],
    lamp: ['#ffc77a', 1.0],
    floor: ['#5b4631', '#4f3c2a', '#63503a', '#47362a', '#58442f'],
    backWall: { type: 'plaster', color: '#5c7357' },
    sideWall: { base: '#1e2e21', slat: '#3e5a42' },
    sky: 'forest', trim: '#1c2a1e',
    features: { piano: false, records: false, hanging: 5, plants: 7 },
    preview: ['#16221a', '#5c7357'],
  },
};

export const CAFES = {
  'main-street': {
    theme: 'roast', icon: 'Coffee', name: '街角自習咖啡廳',
    blurb: '深焙咖啡色調，紅磚牆配木質吧台，安靜專注的夜間自習室。', tags: ['安靜', '夜晚'],
  },
  'jazz-night': {
    theme: 'jazz', icon: 'Music', name: '爵士夜曲',
    blurb: '藍調夜色與黃銅燈光，角落立著一台鋼琴，黑膠唱片慢慢轉。', tags: ['爵士', '夜晚'],
  },
  'morning-light': {
    theme: 'morning', icon: 'Sun', name: '晨光窗邊',
    blurb: '淺色木地板與大面窗，陽光灑進來，適合早起讀書。', tags: ['明亮', '白天'],
  },
  'bright-corner': {
    theme: 'bright', icon: 'Store', name: '晴光轉角咖啡館',
    blurb: '白牆、淺色木地板與品牌綠牆裙，落地窗灑進整片日光，明亮寬敞的連鎖咖啡館風格。', tags: ['明亮', '白天', '綠意'],
  },
  'forest-reading': {
    theme: 'forest', icon: 'Leaf', name: '森林書屋',
    blurb: '滿滿的綠植與書牆，像在森林裡安靜地讀書。', tags: ['綠意', '書香'],
  },
};

export const CAFE_ORDER = Object.keys(CAFES);
export const getMeta = (slug) =>
  CAFES[slug] ?? { theme: 'roast', icon: 'Coffee', name: slug, blurb: '', tags: [] };
export const getTheme = (slug) => THEMES[getMeta(slug).theme] ?? THEMES.roast;
