/**
 * 環境音混音器的聲音引擎：全部用 Web Audio 即時合成（雜訊 + 濾波器 + 隨機的小聲響），
 * 不需要任何音檔，所以沒有版權問題、也不佔流量。每種聲音一個獨立的音量；音量 > 0 才建立節點，歸零就淡出並釋放。
 */
export const SOUNDS = [
  { id: 'rain', label: '雨聲', emoji: '🌧️' },
  { id: 'brown', label: '棕噪音（深度專注）', emoji: '🌫️' },
  { id: 'fire', label: '壁爐', emoji: '🔥' },
  { id: 'wind', label: '微風', emoji: '🍃' },
  { id: 'cafe', label: '咖啡廳人聲', emoji: '☕' },
];
const IDS = SOUNDS.map((s) => s.id);
const LOUDNESS = { rain: 0.55, brown: 0.95, fire: 0.8, wind: 0.5, cafe: 0.6 }; // 讓各種聲音在同樣的滑桿位置聽起來差不多大聲
const FADE = 0.15;       // 音量變化的平滑時間常數（秒）
const RELEASE_MS = 700;  // 音量歸零後，等淡出完才真的停掉

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
const rnd = (a, b) => a + Math.random() * (b - a);

function makeNoise(ctx, kind) {
  const len = Math.floor(ctx.sampleRate * 4);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let b0 = 0; let b1 = 0; let b2 = 0; let b3 = 0; let b4 = 0; let b5 = 0; let b6 = 0; let last = 0;
  for (let i = 0; i < len; i += 1) {
    const w = Math.random() * 2 - 1;
    if (kind === 'white') d[i] = w;
    else if (kind === 'pink') { // Paul Kellet 粉紅雜訊近似
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
    } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown
  }
  return buf;
}

export class AmbientEngine {
  constructor(Ctx) {
    this.Ctx = Ctx ?? (typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null);
    this.ctx = null; this.master = null; this.noise = {}; this.voices = {}; this.levels = {};
  }

  get supported() { return !!this.Ctx; }

  _ensure() {
    if (!this.ctx) {
      this.ctx = new this.Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 1;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume?.();
    return this.ctx;
  }

  _noise(kind) { return (this.noise[kind] ||= makeNoise(this.ctx, kind)); }

  _loop(kind) {
    const s = this.ctx.createBufferSource();
    s.buffer = this._noise(kind); s.loop = true;
    s.start(0, Math.random() * 3); // 每次從不同位置開始，疊多個聲音時不會相位重疊
    return s;
  }

  _filter(type, freq, q = 0.7) {
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    return f;
  }

  /** 用遞迴 setTimeout 在隨機時間點觸發 fn；stop() 之後不會再觸發 */
  _schedule(voice, minMs, maxMs, fn) {
    const tick = () => {
      if (voice.dead) return;
      fn();
      voice.timer = setTimeout(tick, rnd(minMs, maxMs));
    };
    voice.timer = setTimeout(tick, rnd(minMs, maxMs));
  }

  /** 一個很短的雜訊爆音（雨滴、柴火爆裂） */
  _burst(out, { kind = 'white', hp = 1500, bp, q = 2, peak = 0.3, dur = 0.03 }) {
    const ctx = this.ctx; const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = this._noise(kind);
    const f = bp ? this._filter('bandpass', bp, q) : this._filter('highpass', hp);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 3, dur + 0.02);
  }

  _build(id) {
    const ctx = this.ctx;
    const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(this.master);
    const voice = { id, gain, nodes: [], timer: null, dead: false };
    const track = (...n) => { voice.nodes.push(...n); return n[0]; };

    if (id === 'brown') {
      const s = track(this._loop('brown')); const lp = this._filter('lowpass', 700);
      s.connect(lp); lp.connect(gain);
    } else if (id === 'rain') {
      const s = track(this._loop('white')); const hp = this._filter('highpass', 700); const lp = this._filter('lowpass', 7500);
      const bed = ctx.createGain(); bed.gain.value = 0.35;
      s.connect(hp); hp.connect(lp); lp.connect(bed); bed.connect(gain);
      this._schedule(voice, 40, 140, () => this._burst(gain, { bp: rnd(2200, 6500), q: 4, peak: rnd(0.08, 0.22), dur: rnd(0.02, 0.05) }));
    } else if (id === 'fire') {
      const s = track(this._loop('brown')); const lp = this._filter('lowpass', 420);
      const rumble = ctx.createGain(); rumble.gain.value = 0.9;
      s.connect(lp); lp.connect(rumble); rumble.connect(gain);
      this._schedule(voice, 70, 420, () => this._burst(gain, { hp: rnd(1200, 3200), peak: rnd(0.12, Math.random() < 0.12 ? 0.7 : 0.3), dur: rnd(0.012, 0.045) }));
    } else if (id === 'wind') {
      const s = track(this._loop('pink')); const bp = this._filter('bandpass', 520, 1.1);
      const swell = ctx.createGain(); swell.gain.value = 0.7;
      const l1 = track(ctx.createOscillator()); l1.frequency.value = 0.08;
      const d1 = ctx.createGain(); d1.gain.value = 280; l1.connect(d1); d1.connect(bp.frequency);
      const l2 = track(ctx.createOscillator()); l2.frequency.value = 0.05;
      const d2 = ctx.createGain(); d2.gain.value = 0.3; l2.connect(d2); d2.connect(swell.gain);
      l1.start(); l2.start();
      s.connect(bp); bp.connect(swell); swell.connect(gain);
    } else { // cafe：低沉的人聲嗡嗡 + 偶爾的杯碟輕碰
      const s = track(this._loop('pink')); const bp = this._filter('bandpass', 800, 0.6); const lp = this._filter('lowpass', 2600);
      const mod = ctx.createGain(); mod.gain.value = 0.7;
      const l = track(ctx.createOscillator()); l.frequency.value = 0.35;
      const d = ctx.createGain(); d.gain.value = 0.22; l.connect(d); d.connect(mod.gain); l.start();
      s.connect(bp); bp.connect(lp); lp.connect(mod); mod.connect(gain);
      this._schedule(voice, 5000, 13000, () => {
        const t = ctx.currentTime; const f0 = rnd(2200, 3000);
        [1, 1.5].forEach((m, i) => {
          const o = ctx.createOscillator(); const g = ctx.createGain();
          o.type = 'sine'; o.frequency.value = f0 * m;
          g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(i ? 0.015 : 0.03, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
          o.connect(g); g.connect(gain); o.start(t); o.stop(t + 0.35);
        });
      });
    }
    return voice;
  }

  _release(id) {
    const v = this.voices[id];
    if (!v || v.releasing) return;
    v.releasing = true;
    v.gain.gain.setTargetAtTime(0, this.ctx.currentTime, FADE);
    v.dead = true; clearTimeout(v.timer);
    v.stopTimer = setTimeout(() => {
      v.nodes.forEach((n) => { try { n.stop?.(); } catch { /* 已停止 */ } try { n.disconnect?.(); } catch { /* 忽略 */ } });
      try { v.gain.disconnect(); } catch { /* 忽略 */ }
      if (this.voices[id] === v) delete this.voices[id];
    }, RELEASE_MS);
  }

  /** 設定某個聲音的音量（0–1）。第一次 > 0 時才建立 AudioContext（需要在使用者操作之後呼叫）。 */
  set(id, level) {
    if (!IDS.includes(id) || !this.supported) return;
    const lv = clamp01(level);
    this.levels[id] = lv;
    if (lv > 0) {
      this._ensure();
      let v = this.voices[id];
      if (!v || v.releasing) { // 淡出到一半又拉回來：把舊的收乾淨再重建
        if (v) { clearTimeout(v.stopTimer); v.nodes.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch { /* 忽略 */ } }); try { v.gain.disconnect(); } catch { /* 忽略 */ } }
        v = this._build(id); this.voices[id] = v;
      }
      v.gain.gain.setTargetAtTime(lv * LOUDNESS[id], this.ctx.currentTime, FADE);
    } else if (this.ctx) {
      this._release(id);
    }
  }

  setAll(levels) { IDS.forEach((id) => this.set(id, levels?.[id] ?? 0)); }

  /** 全部停掉並關閉 AudioContext */
  dispose() {
    Object.values(this.voices).forEach((v) => {
      v.dead = true; clearTimeout(v.timer); clearTimeout(v.stopTimer);
      v.nodes.forEach((n) => { try { n.stop?.(); n.disconnect?.(); } catch { /* 忽略 */ } });
    });
    this.voices = {}; this.levels = {};
    try { this.ctx?.close?.(); } catch { /* 忽略 */ }
    this.ctx = null; this.master = null; this.noise = {};
  }
}
