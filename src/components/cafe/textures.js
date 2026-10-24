import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

// 全部用 canvas 在本地產生，不需要任何外部圖檔，載入零延遲。
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

function drawFloor(g, W, H) {
  const rnd = rngFactory(11);
  const pal = ['#4a2f1e', '#3f281a', '#52341f', '#37231a', '#45301f'];
  const rows = 32;
  const ph = H / rows;
  for (let r = 0; r < rows; r += 1) {
    let x = -rnd() * 200;
    while (x < W) {
      const w = 150 + rnd() * 160;
      g.fillStyle = shade(pal[Math.floor(rnd() * pal.length)], (rnd() - 0.5) * 14);
      g.fillRect(x, r * ph, w, ph);
      g.strokeStyle = 'rgba(20,10,5,0.25)';
      g.lineWidth = 1;
      for (let k = 0; k < 2; k += 1) {
        const y = r * ph + rnd() * ph;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + w, y + (rnd() - 0.5) * 2);
        g.stroke();
      }
      g.strokeStyle = 'rgba(10,5,2,0.8)';
      g.lineWidth = 2;
      g.strokeRect(x, r * ph, w, ph);
      x += w;
    }
  }
}

function drawBrick(g, W, H) {
  const rnd = rngFactory(5);
  const pal = ['#6e3b2b', '#7a4331', '#5f3226', '#6a3a2e', '#523024'];
  g.fillStyle = '#2b211d';
  g.fillRect(0, 0, W, H);
  const rows = 16;
  const bh = H / rows;
  const bw = 64;
  for (let r = 0; r < rows; r += 1) {
    const off = r % 2 ? bw / 2 : 0;
    for (let x = -off; x < W; x += bw) {
      g.fillStyle = shade(pal[Math.floor(rnd() * pal.length)], (rnd() - 0.5) * 22);
      g.fillRect(x + 1.5, r * bh + 1.5, bw - 3, bh - 3);
    }
  }
}

function drawSlats(g, W, H) {
  const rnd = rngFactory(3);
  g.fillStyle = '#150d09';
  g.fillRect(0, 0, W, H);
  const n = 8;
  const sw = W / n;
  for (let i = 0; i < n; i += 1) {
    g.fillStyle = shade('#4a2d1c', (rnd() - 0.5) * 16);
    g.fillRect(i * sw + 3, 0, sw - 6, H);
    g.strokeStyle = 'rgba(20,10,5,0.35)';
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

function drawMarble(g, W, H) {
  const rnd = rngFactory(9);
  g.fillStyle = '#17171a';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 14; i += 1) {
    g.strokeStyle = `rgba(235,235,235,${0.12 + rnd() * 0.35})`;
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

function drawDusk(g, W, H) {
  const rnd = rngFactory(21);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#0c1220');
  grad.addColorStop(0.6, '#1f2840');
  grad.addColorStop(1, '#3a2f3b');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 46; i += 1) {
    const y = H * (0.45 + rnd() * 0.55);
    g.fillStyle = `rgba(255,${190 + Math.floor(rnd() * 50)},${120 + Math.floor(rnd() * 80)},${0.25 + rnd() * 0.5})`;
    g.beginPath();
    g.arc(rnd() * W, y, 1.5 + rnd() * 3.5, 0, Math.PI * 2);
    g.fill();
  }
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

export function useCafeTextures() {
  const tex = useMemo(() => ({
    floor: make(512, 512, drawFloor, [4, 3]),
    brick: make(512, 256, drawBrick, [10.2, 4.3]),
    slats: make(256, 256, drawSlats, [17.5, 6.5]),
    marble: make(256, 256, drawMarble, [1, 1]),
    dusk: make(256, 256, drawDusk, [1, 1]),
    menu: make(512, 256, drawMenu, [1, 1]),
    art: [0, 1, 2].map((v) => make(256, 320, drawArt(v), [1, 1])),
  }), []);

  useEffect(() => () => {
    Object.values(tex).flat().forEach((t) => t.dispose());
  }, [tex]);

  return tex;
}
