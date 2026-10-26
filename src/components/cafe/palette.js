import { createContext, useContext } from 'react';

/** 家具用的顏色（椅墊、木頭、桌面、吧台、燈罩…）。每個主題可以在 theme.palette 覆蓋其中幾項。 */
export const DEFAULT_PALETTE = {
  leathers: ['#6b3f26', '#5a3420', '#4b2b18', '#74482c'],
  chairWood: { color: '#2c1b11', roughness: 0.6 },
  barBody: '#24160e', barTop: '#3a2415',
  slab: '#5a3a24', square: '#6b4a30', low: '#2f1f15',
  counter: '#2a1a11',
  sofa: '#4b2b18',
  shade: '#141414',
  orb: '#e0a766', orbHover: '#ffbe73',
  furniture: null,   // null = 預設皮革桌椅；'neon' | 'nordic' | 'zen' = 主題專屬桌椅（ThemeFurniture.jsx）
};

export const makePalette = (over) => ({ ...DEFAULT_PALETTE, ...(over ?? {}) });
export const PaletteContext = createContext(DEFAULT_PALETTE);
export const usePalette = () => useContext(PaletteContext);
