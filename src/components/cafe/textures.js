import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// 全部用 canvas 在本地產生，不需要任何外部圖檔。依主題換顏色。
function rngFactory(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.min(255, Math.max(0, v + amt));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

function make(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** 榻榻米：每格 2 塊疊成磚紋，長邊有深色包邊（緣），表面有藺草紋 */
function drawTatami(g, W, H) {
  const rnd = rngFactory(23);
  const rows = 5; const mh = H / rows; const mw = W / 2;
  g.fillStyle = '#2b3a2a'; g.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r += 1) {
    const off = r % 2 ? mw / 2 : 0;
    for (let x = -off; x < W; x += mw) {
      g.fillStyle = shade('#c3bd86', (rnd() - 0.5) * 16);
      g.fillRect(x + 1.5, r * mh + 5, mw - 3, mh - 10);
      g.strokeStyle = 'rgba(90,100,50,0.16)'; g.lineWidth = 1;
      for (let y = r * mh + 7; y < (r + 1) * mh - 6; y += 3) { g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x + mw - 2, y); g.stroke(); }
    }
  }
}

function drawFloor(g, W, H, pal, light = false) {
  const rnd = rngFactory(11);
  const rows = light ? 22 : 32;
  const ph = H / rows;
  for (let r = 0; r < rows; r += 1) {
    let x = -rnd() * 200;
    while (x < W) {
      const w = 150 + rnd() * 160;
      g.fillStyle = shade(pal[Math.floor(rnd() * pal.length)], (rnd() - 0.5) * 14);
      g.fillRect(x, r * ph, w, ph);
      g.strokeStyle = 'rgba(20,10,5,0.22)';
      g.lineWidth = 1;
      for (let k = 0; k < 2; k += 1) {
        const y = r * ph + rnd() * ph;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y + (rnd() - 0.5) * 2);
        g.stroke();
      }
      g.strokeStyle = light ? 'rgba(120,95,60,0.35)' : 'rgba(10,5,2,0.7)';
      g.lineWidth = light ? 1.5 : 2;
      g.strokeRect(x, r * ph, w, ph);
      x += w;
    }
  }
}

function drawBrick(g, W, H, { colors, mortar }) {
  const rnd = rngFactory(5);
  g.fillStyle = mortar;
  g.fillRect(0, 0, W, H);
  const rows = 16;
  const bh = H / rows;
  const bw = 64;
  for (let r = 0; r < rows; r += 1) {
    const off = r % 2 ? bw / 2 : 0;
    for (let x = -off; x < W; x += bw) {
      g.fillStyle = shade(colors[Math.floor(rnd() * colors.length)], (rnd() - 0.5) * 22);
      g.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
  }
}

function drawPlaster(g, W, H, { color }) {
  const rnd = rngFactory(17);
  g.fillStyle = color;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 1400; i += 1) {
    g.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.012 + rnd() * 0.03})`;
    g.fillRect(rnd() * W, rnd() * H, 2 + rnd() * 6, 2 + rnd() * 6);
  }
}

function drawSlats(g, W, H, { base, slat }) {
  const rnd = rngFactory(3);
  g.fillStyle = base;
  g.fillRect(0, 0, W, H);
  const n = 8;
  const sw = W / n;
  for (let i = 0; i < n; i += 1) {
    g.fillStyle = shade(slat, (rnd() - 0.5) * 16);
    g.fillRect(i * sw + 3, 0, sw - 6, H);
    g.strokeStyle = 'rgba(20,10,5,0.3)';
    g.lineWidth = 1;
    for (let k = 0; k < 3; k += 1) {
      const x = i * sw + 6 + rnd() * (sw - 12);
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + (rnd() - 0.5) * 3, H);
      g.stroke();
    }
  }
}

function drawMarble(g, W, H, light = false) {
  const rnd = rngFactory(9);
  g.fillStyle = light ? '#ebe7de' : '#17171a';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i += 1) {
    g.strokeStyle = light ? `rgba(110,118,112,${0.12 + rnd() * 0.3})` : `rgba(235,235,235,${0.12 + rnd() * 0.35})`;
    g.lineWidth = 0.6 + rnd() * 1.8;
    g.beginPath();
    let x = rnd() * W;
    let y = 0;
    g.moveTo(x, y);
    while (y < H) {
      x += (rnd() - 0.5) * 50;
      y += 20 + rnd() * 30;
      g.lineTo(x, y);
    }
    g.stroke();
  }
}

// 窗外景色：黃昏 / 夜晚 / 白天 / 森林
function drawSky(kind) {
  return (g, W, H) => {
    const rnd = rngFactory(21);
    const grad = g.createLinearGradient(0, 0, 0, H);
    const stops = {
      dusk: ['#0c1220', '#1f2840', '#3a2f3b'],
      night: ['#050814', '#111a33', '#2a2a44'],
      day: ['#8fc3ee', '#c5e1f5', '#eef6fb'],
      forest: ['#6fa070', '#3f6b45', '#233d2a'],
      neon: ['#07061a', '#1a0f3a', '#3a1450'],
      sakura: ['#f4cfd8', '#f0b9c7', '#d9a0ae'],
      snow: ['#cfdbe8', '#e6edf4', '#f6f8fb'],
      sunset: ['#5b5a9c', '#f09a78', '#ffd9a4'],
    }[kind];
    grad.addColorStop(0, stops[0]);
    grad.addColorStop(0.6, stops[1]);
    grad.addColorStop(1, stops[2]);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    if (kind === 'neon') {
      // 雨夜賽博城市：遠處高樓剪影 + 霓虹招牌 + 斜斜的雨絲
      const neon = ['#ff2e93', '#22d3ee', '#a855f7', '#facc15', '#34d399'];
      for (let i = 0; i < 9; i += 1) {
        const bw = 26 + rnd() * 34; const bh = H * (0.25 + rnd() * 0.5); const bx = (i / 9) * W + rnd() * 10;
        g.fillStyle = `rgba(10,8,28,${0.8 + rnd() * 0.2})`;
        g.fillRect(bx, H - bh, bw, bh);
        for (let k = 0; k < 7; k += 1) {
          g.fillStyle = rnd() > 0.55 ? neon[Math.floor(rnd() * neon.length)] : 'rgba(255,255,255,0.12)';
          g.fillRect(bx + 4 + rnd() * (bw - 10), H - bh + 6 + rnd() * (bh - 14), 3, 4);
        }
      }
      for (let i = 0; i < 5; i += 1) {
        const c = neon[Math.floor(rnd() * neon.length)];
        g.shadowColor = c; g.shadowBlur = 16; g.fillStyle = c;
        g.fillRect(rnd() * (W - 40), H * (0.3 + rnd() * 0.4), 14 + rnd() * 26, 5);
      }
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(190,210,255,0.35)'; g.lineWidth = 1;
      for (let i = 0; i < 90; i += 1) {
        const x = rnd() * W; const y = rnd() * H;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y + 16); g.stroke();
      }
    } else if (kind === 'sunset') {
      // 夕照海岸：地平線上的落日 + 金色海面反光 + 遠方帆船與海鷗
      const hy = H * 0.64;
      const sun = g.createRadialGradient(W * 0.62, hy, 4, W * 0.62, hy, H * 0.5);
      sun.addColorStop(0, 'rgba(255,248,214,0.95)'); sun.addColorStop(0.25, 'rgba(255,196,120,0.55)'); sun.addColorStop(1, 'rgba(255,160,110,0)');
      g.fillStyle = sun; g.fillRect(0, 0, W, hy);
      g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(W * 0.62, hy - 2, H * 0.07, Math.PI, 0); g.fill();
      for (let i = 0; i < 4; i += 1) { // 晚霞
        g.fillStyle = `rgba(255,${170 + Math.floor(rnd() * 40)},${140 + Math.floor(rnd() * 40)},0.35)`;
        g.beginPath(); g.ellipse(rnd() * W, H * (0.12 + rnd() * 0.3), 50 + rnd() * 50, 6 + rnd() * 6, 0, 0, Math.PI * 2); g.fill();
      }
      const sea = g.createLinearGradient(0, hy, 0, H);
      sea.addColorStop(0, '#f2a27a'); sea.addColorStop(0.35, '#b86f84'); sea.addColorStop(1, '#2f4f78');
      g.fillStyle = sea; g.fillRect(0, hy, W, H - hy);
      for (let i = 0; i < 38; i += 1) { // 海面反光
        const y = hy + 4 + rnd() * (H - hy - 6); const half = 3 + (y - hy) * 0.35 * rnd();
        g.fillStyle = `rgba(255,${220 + Math.floor(rnd() * 30)},${160 + Math.floor(rnd() * 40)},${0.35 + rnd() * 0.4})`;
        g.fillRect(W * 0.62 - half + (rnd() - 0.5) * 18, y, half * 2, 1.6);
      }
      g.fillStyle = 'rgba(40,30,60,0.8)'; // 帆船
      g.beginPath(); g.moveTo(W * 0.3, hy - 1); g.lineTo(W * 0.3 + 18, hy - 1); g.lineTo(W * 0.3 + 14, hy + 4); g.lineTo(W * 0.3 + 3, hy + 4); g.fill();
      g.beginPath(); g.moveTo(W * 0.3 + 9, hy - 22); g.lineTo(W * 0.3 + 16, hy - 3); g.lineTo(W * 0.3 + 9, hy - 3); g.fill();
      g.strokeStyle = 'rgba(60,40,70,0.75)'; g.lineWidth = 1.6; // 海鷗
      [[0.2, 0.22], [0.27, 0.3], [0.8, 0.2]].forEach(([fx, fy]) => {
        const x = W * fx; const y = H * fy;
        g.beginPath(); g.moveTo(x - 7, y + 2); g.quadraticCurveTo(x - 3, y - 4, x, y); g.quadraticCurveTo(x + 3, y - 4, x + 7, y + 2); g.stroke();
      });
    } else if (kind === 'snow') {
      g.fillStyle = '#6f8a86';
      for (let i = 0; i < 8; i += 1) {
        const x = (i / 8) * W + rnd() * 20; const th = 50 + rnd() * 60;
        g.beginPath(); g.moveTo(x, H); g.lineTo(x + 18, H - th); g.lineTo(x + 36, H); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.moveTo(x + 18, H - th); g.lineTo(x + 26, H - th * 0.7); g.lineTo(x + 10, H - th * 0.7); g.fill();
        g.fillStyle = '#6f8a86';
      }
      for (let i = 0; i < 70; i += 1) { g.fillStyle = `rgba(255,255,255,${0.5 + rnd() * 0.5})`; g.beginPath(); g.arc(rnd() * W, rnd() * H, 1 + rnd() * 2.2, 0, Math.PI * 2); g.fill(); }
    } else if (kind === 'sakura') {
      for (let i = 0; i < 60; i += 1) {
        g.fillStyle = `rgba(255,${200 + Math.floor(rnd() * 40)},${215 + Math.floor(rnd() * 30)},${0.5 + rnd() * 0.5})`;
        g.beginPath();
        g.ellipse(rnd() * W, rnd() * H, 4 + rnd() * 6, 2.5 + rnd() * 3, rnd() * Math.PI, 0, Math.PI * 2);
        g.fill();
      }
      g.strokeStyle = '#5a3a2a'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, H * 0.9); g.quadraticCurveTo(W * 0.4, H * 0.55, W, H * 0.35); g.stroke();
    } else if (kind === 'dusk' || kind === 'night') {
      for (let i = 0; i < 46; i += 1) {
        g.fillStyle = `rgba(255,${190 + Math.floor(rnd() * 50)},${120 + Math.floor(rnd() * 80)},${0.25 + rnd() * 0.5})`;
        g.beginPath();
        g.arc(rnd() * W, H * (0.45 + rnd() * 0.55), 1.5 + rnd() * 3.5, 0, Math.PI * 2);
        g.fill();
      }
      if (kind === 'night') {
        for (let i = 0; i < 40; i += 1) {
          g.fillStyle = `rgba(255,255,255,${0.3 + rnd() * 0.6})`;
          g.fillRect(rnd() * W, rnd() * H * 0.45, 1.5, 1.5);
        }
      }
    } else if (kind === 'day') {
      for (let i = 0; i < 6; i += 1) {
        g.fillStyle = 'rgba(255,255,255,0.55)';
        g.beginPath();
        g.ellipse(rnd() * W, 30 + rnd() * H * 0.4, 40 + rnd() * 40, 10 + rnd() * 10, 0, 0, Math.PI * 2);
        g.fill();
      }
    } else {
      for (let i = 0; i < 70; i += 1) {
        g.fillStyle = `rgba(${40 + rnd() * 60},${100 + rnd() * 80},${50 + rnd() * 50},0.4)`;
        g.beginPath();
        g.arc(rnd() * W, rnd() * H, 8 + rnd() * 22, 0, Math.PI * 2);
        g.fill();
      }
    }
  };
}

function drawMenu(g, W, H) {
  g.fillStyle = '#121212';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#6b5a45';
  g.lineWidth = 4;
  g.strokeRect(10, 10, W - 20, H - 20);
  g.fillStyle = '#d9b07a';
  g.font = 'bold 54px Georgia, serif';
  g.textAlign = 'center';
  g.fillText('KAFEFOCUS', W / 2, 78);
  g.font = '28px Georgia, serif';
  g.fillStyle = '#b9a58b';
  ['Espresso', 'Latte', 'Pour-over', 'Cold brew'].forEach((t, i) => g.fillText(t, W / 2, 130 + i * 34));
}

function drawArt(variant) {
  const sets = [
    ['#7b4a34', '#2f3a35', '#b08d57'],
    ['#2f3b4f', '#8a6a4b', '#1d1d1f'],
    ['#4a5a47', '#7d4b3a', '#d0b894'],
  ];
  return (g, W, H) => {
    const rnd = rngFactory(40 + variant);
    g.fillStyle = '#1a1512';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i += 1) {
      g.fillStyle = sets[variant][i % 3];
      g.globalAlpha = 0.85;
      g.fillRect(rnd() * W * 0.6, rnd() * H * 0.6, W * (0.25 + rnd() * 0.35), H * (0.2 + rnd() * 0.35));
    }
    g.globalAlpha = 1;
  };
}

export function useCafeTextures(theme) {
  const tex = useMemo(() => ({
    floor: theme.floorType === 'tatami'
      ? make(512, 512, drawTatami, [4, 3])
      : make(512, 512, (g, W, H) => drawFloor(g, W, H, theme.floor, theme.floorType === 'birch'), [4, 3]),
    back: theme.backWall.type === 'brick'
      ? make(512, 256, (g, W, H) => drawBrick(g, W, H, theme.backWall), [10.2, 4.3])
      : make(256, 256, (g, W, H) => drawPlaster(g, W, H, theme.backWall), [4, 2]),
    slats: make(256, 256, (g, W, H) => drawSlats(g, W, H, theme.sideWall), [17.5, 6.5]),
    marble: make(256, 256, (g, W, H) => drawMarble(g, W, H, !!theme.light)),
    dusk: make(256, 256, drawSky(theme.sky)),
    sea: theme.glassWall ? make(1024, 296, drawSky(theme.sky)) : null, // 落地窗用的寬幅全景
    menu: make(512, 256, drawMenu),
    art: [0, 1, 2].map((v) => make(256, 320, drawArt(v))),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [theme.id]);

  useEffect(() => () => {
    Object.values(tex).flat().forEach((t) => t.dispose());
  }, [tex]);

  return tex;
}
