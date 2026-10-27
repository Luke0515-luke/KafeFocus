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
  neon: {
    id: 'neon',
    bg: '#0a0716', fog: [20, 40],
    ambient: ['#7c6cff', 0.4],
    hemi: ['#6a5cff', '#1a0b2e', 0.45],
    key: ['#ff6ad5', 0.55],
    lamp: ['#ff3fa4', 1.5],                        // 霓虹粉燈光
    floor: ['#15122a', '#1b1636', '#110e24', '#1e1840', '#161230'],
    backWall: { type: 'plaster', color: '#1d1840' },
    sideWall: { base: '#0b0818', slat: '#2a1f5c' },
    sky: 'neon', trim: '#05030d', decor: 'neon', furniture: 'neon',
    accent: '#22d3ee',                             // 青色霓虹牆裙
    rugs: [['#2a0f4a', '#3d1566', '#12082a'], ['#0e2a3d', '#14405a', '#081824']],
    palette: {
      leathers: ['#3b1c63', '#4a2380', '#2a1347', '#5b2a99'],
      chairWood: { color: '#14102a', roughness: 0.35 },
      barBody: '#120d26', barTop: '#241a4a',
      slab: '#1e1740', square: '#261d52', low: '#150f30',
      counter: '#0f2a3a', sofa: '#4a1d7a', shade: '#ff2e93',
      orb: '#22d3ee', orbHover: '#7df3ff',
    },
    features: { piano: false, records: true, hanging: 4, plants: 3 },
    preview: ['#1a0f3a', '#ff2e93'],
  },
  zen: {
    id: 'zen',
    bg: '#241b14', fog: [26, 48],
    ambient: ['#ffe6c4', 0.62],
    hemi: ['#ffeed2', '#3a2a1c', 0.55],
    key: ['#ffd9a8', 0.8],
    lamp: ['#ffb36b', 1.0],
    floor: ['#b99a68', '#ad8f5f', '#c2a373', '#a88a5a', '#b49565'],
    backWall: { type: 'plaster', color: '#d8c8a2' },
    sideWall: { base: '#3a2616', slat: '#7a5a3a' },
    sky: 'sakura', trim: '#2a1a0e', decor: 'zen', furniture: 'zen', floorType: 'tatami',
    accent: '#a32a2a',
    rugs: [['#7a8a5a', '#8d9b6c', '#5f6e45'], ['#c9b98f', '#d6c8a2', '#b8a87c']],
    palette: {
      leathers: ['#2b3a55', '#34466a', '#222f46', '#3d5079'],
      chairWood: { color: '#6b4a2b', roughness: 0.6 },
      barBody: '#3a2a1c', barTop: '#8a6a45',
      slab: '#8a6a45', square: '#7a5a3a', low: '#5a3f26',
      counter: '#2a1d14', sofa: '#2b3a55', shade: '#e8d9b0',
      orb: '#d94f4f', orbHover: '#ff8a8a',
    },
    features: { piano: false, records: false, hanging: 0, plants: 0 },
    preview: ['#d8c8a2', '#a32a2a'],
  },
  nordic: {
    id: 'nordic',
    light: true,
    bg: '#e9ecee', fog: [34, 60],
    ambient: ['#fffdf8', 1.15],
    hemi: ['#f6f8fb', '#d8d2c6', 0.95],
    key: ['#fff3df', 1.4],
    lamp: ['#ffe2b0', 0.8],
    // 淺橡木地板（偏灰的淡木色，不要太黃）
    floor: ['#d9c8a8', '#d2c1a0', '#dfcfb0', '#cdbb99', '#d6c5a4'],
    floorType: 'birch',
    backWall: { type: 'plaster', color: '#f3f2ee' },          // 暖白牆
    sideWall: { base: '#ebe9e3', slat: '#f5f3ee' },
    sky: 'snow', trim: '#ece9e2', decor: 'nordic', furniture: 'nordic',
    // 地毯：燕麥色羊毛 + 淺灰色
    rugs: [['#d9d3c4', '#e7e2d5', '#c8c1b0'], ['#c3c4c0', '#d3d4d0', '#aeafab']],
    palette: {
      sofa: '#b9b3a8', counter: '#efebe2', barBody: '#e6d8bd', barTop: '#f1e8d6',
      slab: '#e3d3b4', square: '#e3d3b4', low: '#d9c8a8', shade: '#f4f2ec',
      orb: '#8aa39a', orbHover: '#b3c9c0',
    },
    features: { piano: false, records: false, hanging: 0, plants: 0 },
    preview: ['#f3f2ee', '#b9b3a8'],
  },
  seaside: {
    id: 'seaside',
    light: true,
    bg: '#e9c9a6', fog: [32, 58],
    ambient: ['#ffd9b8', 0.85],
    hemi: ['#ffe6cc', '#6a5568', 0.7],
    key: ['#ffb27a', 1.2],                         // 夕陽的金橘色主光
    lamp: ['#ffcf94', 0.8],
    floor: ['#bfa98d', '#b49f84', '#c9b59a', '#ad987d', '#bba68a'],   // 海風吹過的漂流木地板
    floorType: 'birch',
    backWall: { type: 'plaster', color: '#f3e8d6' },                  // 沙白色灰泥牆
    sideWall: { base: '#d6c2a2', slat: '#ecdcc0' },
    sky: 'sunset', trim: '#5e4838',
    glassWall: true,                               // 後牆改成整面落地窗（CafeDecor.jsx 的 GlassWall）
    accent: '#2f7fa3',                             // 海藍色牆裙
    rugs: [['#9cc3d1', '#b7d6e0', '#7fa9ba'], ['#ead8b8', '#f4e6cb', '#d6c19c']],
    palette: {
      leathers: ['#2f7fa3', '#3a8fb5', '#256a88', '#4aa0c4'],         // 海藍色椅墊
      chairWood: { color: '#c79a62', roughness: 0.65 },               // 藤編木色
      barBody: '#c9a878', barTop: '#f0dfc0',
      slab: '#d9b98a', square: '#dcc194', low: '#c8a878',
      counter: '#2f7fa3', sofa: '#3a8fb5', shade: '#f3e6c8',
      orb: '#2f9bc4', orbHover: '#6fd0f0',
    },
    features: { piano: false, records: false, hanging: 4, plants: 6 },
    preview: ['#f3e8d6', '#e88a5c'],
  },
  treehouse: {
    id: 'treehouse',
    decor: 'tree',                                  // 專屬場景：src/components/cafe/TreeDecor.jsx
    bg: '#0d1a17', fog: [30, 70],
    ambient: ['#a8f0c8', 0.6],
    hemi: ['#c8ffd8', '#2a1c10', 0.65],
    key: ['#ffe9b0', 0.7],                          // 從樹冠灑下來的陽光
    lamp: ['#ffd27a', 1.2],
    floor: ['#8a6a43', '#7e5f3b', '#94734a', '#755734', '#876840'],   // 樹屋的木頭平台
    floorType: 'birch',
    backWall: { type: 'plaster', color: '#3b2717' },
    sideWall: { base: '#3b2717', slat: '#4a3220' },
    sky: 'forest', trim: '#3d2815',
    rugs: [['#3f6b3a', '#5b8a4c', '#2f5430'], ['#6a8f4a', '#86ad5e', '#4f7438']],   // 葉子地毯
    palette: {
      leathers: ['#3f6b3a', '#4f7f45', '#34582f', '#5d8f4e'],         // 青苔綠椅墊
      chairWood: { color: '#5a3d22', roughness: 0.85 },
      barBody: '#4a3320', barTop: '#7a5a38',
      slab: '#6b4a2b', square: '#6f5030', low: '#4d3520',
      counter: '#3d2a1a', sofa: '#3f6b3a', shade: '#ffe0a0',
      orb: '#8be3b0', orbHover: '#c8ffe0',
    },
    features: { piano: false, records: false, hanging: 0, plants: 0 },
    preview: ['#2f5430', '#ffd27a'],
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
  'neon-rain': {
    theme: 'neon', icon: 'Zap', name: '雨夜霓虹',
    blurb: '窗外是下著雨的賽博城市，粉紫與青色霓虹映在深色桌面上，夜貓子專屬的專注角落。', tags: ['賽博', '霓虹', '夜晚'],
  },
  'zen-tea': {
    theme: 'zen', icon: 'Flower2', name: '櫻語茶屋',
    blurb: '鋪滿榻榻米的和室，矮茶几配布座墊，需要跪坐。拉門紙窗、床之間掛軸、紙燈籠與枯山水。', tags: ['和風', '榻榻米', '跪坐'],
  },
  'nordic-cafe': {
    theme: 'nordic', icon: 'Snowflake', name: '北歐暖光咖啡館',
    blurb: '暖白牆、淺橡木地板，燕麥與灰色的布面座椅，白色穹頂吊燈、黑色小壁爐與雪景窗外，簡潔溫暖的北歐風。', tags: ['北歐', '明亮', '溫暖'],
  },
  'seaside-sunset': {
    theme: 'seaside', icon: 'Sunset', name: '夕照海岸咖啡館',
    blurb: '黃昏的海景落地窗，夕陽把海面染成金橘色。沙白牆、漂流木地板、藤編椅與海藍色椅墊，像在度假的海邊讀書。', tags: ['海景', '黃昏', '度假'],
  },
  'treehouse-hollow': {
    theme: 'treehouse', icon: 'TreeDeciduous', name: '精靈樹洞咖啡館',
    blurb: '藏在一棵巨大空心樹幹裡的咖啡館，像奇妙仙子的樹洞世界：螺旋樹梯、圓形窗洞、發光的蘑菇、吊燈籠與漫天螢火蟲。可以自由移動視角逛整個樹洞。', tags: ['奇幻', '樹屋', '螢火蟲'],
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
