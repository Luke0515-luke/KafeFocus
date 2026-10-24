/**
 * 背景音樂清單。曲目來自 Free Music Archive 的 Alex Morgan《Jazz Cafe & Coffee Shop》Vol.1 / Vol.2，
 * 專輯頁標示授權為 CC BY 4.0（要求標示作者），但頁面也提醒「以單曲頁的授權為準」，使用前請逐首確認。
 *
 * 使用方式：到各曲 page 連結登入 FMA 下載 mp3，改成下面的 file 檔名，放進 public/music/。
 * 沒放檔案也不會壞，音樂列只會顯示「尚未加入音樂」。
 */
const V1 = 'https://freemusicarchive.org/music/alex-morgan/jazz-cafe-coffee-shop-vol-1/';
const V2 = 'https://freemusicarchive.org/music/alex-morgan/jazz-cafe-coffee-shop-vol-2/';

const tracks = [
  ['peaceful-cafe-background-music-with-soft-dynamics', 'Peaceful Cafe Background Music With Soft Dynamics', V1],
  ['warm-cafe-background-music-without-drums', 'Warm Cafe Background Music Without Drums', V1],
  ['cocktail-jazz-coffee-shop-light-trio', 'Cocktail Jazz Coffee Shop Light Trio', V1],
  ['cool-jazz-sunny-cafe-quiet-free-form', 'Cool Jazz Sunny Cafe Quiet Free Form', V2],
  ['cocktail-jazz-rainy-night-slow-piano-set', 'Cocktail Jazz Rainy Night Slow Piano Set', V2],
  ['cool-jazz-midnight-club-without-a-pulse', 'Cool Jazz Midnight Club Without a Pulse', V2],
];

export const PLAYLIST = tracks.map(([slug, title, base]) => ({
  file: `${slug}.mp3`,
  src: `/music/${slug}.mp3`,
  title,
  artist: 'Alex Morgan',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0',
  page: `${base}${slug}/`,
}));
