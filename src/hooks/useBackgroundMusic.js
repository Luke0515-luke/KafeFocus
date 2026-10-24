import { useCallback, useEffect, useRef, useState } from 'react';

const VOL_KEY = 'kf_music_volume';
const ON_KEY = 'kf_music_on';

const lsGet = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* 無痕模式：忽略 */ } };

/**
 * 背景音樂：依序循環播放清單，一首播完自動接下一首。
 *
 * 為什麼換歌要「同步」做：手機瀏覽器（尤其 iOS Safari）只允許在使用者操作過的 <audio> 上連續播放，
 * 而且要在 ended 事件裡直接 play()。如果像以前一樣先 setState、等 React 下一輪 effect 才換歌，
 * 手機常常就被擋掉，歌曲停在第一首。所以這裡一律用同一個 audio 元素，在 ended 事件裡立刻換 src 並播放；
 * 萬一還是被擋（NotAllowedError），就在使用者下一次觸碰畫面時自動接著播。
 *
 * 瀏覽器不允許未經操作就自動播放，所以「使用者第一次點擊或按鍵」時才會開始（除非他上次手動關掉了音樂）。
 */
export function useBackgroundMusic(playlist) {
  const audioRef = useRef(null);
  const indexRef = useRef(0);
  const loadedRef = useRef(false);
  const intentRef = useRef(lsGet(ON_KEY) !== '0'); // 使用者想不想聽
  const blockedRef = useRef(false);                // 自動接歌被瀏覽器擋住，等下一次觸碰再播
  const failedRef = useRef(new Set());

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(playlist.length === 0);
  const [volume, setVolumeState] = useState(() => {
    const v = Number(lsGet(VOL_KEY));
    return Number.isFinite(v) && v > 0 ? Math.min(1, v) : 0.35;
  });

  /** 同步切到第 i 首；autoplay 為 true 就立刻播放。 */
  const goTo = useCallback((i, autoplay) => {
    const a = audioRef.current;
    const len = playlist.length;
    if (!a || len === 0) return;
    const idx = ((i % len) + len) % len;
    indexRef.current = idx;
    setIndex(idx);
    a.src = playlist[idx].src;
    loadedRef.current = true;
    if (!autoplay) return;
    const p = a.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        // 被瀏覽器擋住（不是檔案壞掉）：記下來，使用者下一次碰畫面時再接著播
        if (err?.name === 'NotAllowedError') blockedRef.current = true;
        setPlaying(false);
      });
    }
  }, [playlist]);

  const advance = useCallback(() => {
    goTo(indexRef.current + 1, intentRef.current);
  }, [goTo]);

  // 建立 audio 元素（只建一次，之後所有歌都用它，才能延續「已被使用者允許播放」的狀態）
  useEffect(() => {
    if (playlist.length === 0) return undefined;
    const a = new Audio();
    a.preload = 'auto';
    a.volume = volume;
    audioRef.current = a;

    const onEnded = () => advance();
    const onError = () => {
      failedRef.current.add(indexRef.current);
      if (failedRef.current.size >= playlist.length) {
        setUnavailable(true);
        setPlaying(false);
      } else {
        advance(); // 這首壞了，跳下一首
      }
    };
    const onPlay = () => { blockedRef.current = false; setPlaying(true); };
    const onPause = () => setPlaying(false);
    a.addEventListener('ended', onEnded);
    a.addEventListener('error', onError);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);

    return () => {
      a.pause();
      a.removeEventListener('ended', onEnded);
      a.removeEventListener('error', onError);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeAttribute('src');
      a.load();
      audioRef.current = null;
      loadedRef.current = false;
    };
    // volume 只在建立時讀初值，之後由 setVolume 更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, advance]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a || unavailable) return;
    intentRef.current = true;
    lsSet(ON_KEY, '1');
    if (!loadedRef.current) { goTo(indexRef.current, true); return; }
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => setPlaying(false));
  }, [goTo, unavailable]);

  const pause = useCallback(() => {
    intentRef.current = false;
    lsSet(ON_KEY, '0');
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);

  // 手動下一首：就算目前是暫停，使用者按了「下一首」也代表想聽，所以直接播
  const next = useCallback(() => {
    intentRef.current = true;
    lsSet(ON_KEY, '1');
    goTo(indexRef.current + 1, true);
  }, [goTo]);

  const setVolume = useCallback((v) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    lsSet(VOL_KEY, String(clamped));
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  // 第一次使用者操作時自動開始；之後若自動接歌被擋，下一次觸碰會補播
  useEffect(() => {
    if (playlist.length === 0) return undefined;
    const kick = () => {
      if (!intentRef.current) return;
      if (!loadedRef.current) { play(); return; }
      const a = audioRef.current;
      if (a && (blockedRef.current || (a.paused && !a.ended && a.currentTime === 0))) play();
    };
    window.addEventListener('pointerdown', kick);
    window.addEventListener('keydown', kick);
    window.addEventListener('touchend', kick);
    return () => {
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
      window.removeEventListener('touchend', kick);
    };
  }, [playlist.length, play]);

  // 鎖屏 / 通知列的「上一首、下一首」按鈕
  useEffect(() => {
    if (!('mediaSession' in navigator) || playlist.length === 0) return undefined;
    const t = playlist[index];
    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({ title: t.title, artist: t.artist, album: 'KafeFocus' });
      navigator.mediaSession.setActionHandler('nexttrack', () => next());
      navigator.mediaSession.setActionHandler('previoustrack', () => goTo(indexRef.current - 1, true));
    } catch { /* 部分瀏覽器不支援：忽略 */ }
    return () => {
      try {
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      } catch { /* 忽略 */ }
    };
  }, [index, playlist, next, goTo]);

  return { current: playlist[index] ?? null, playing, volume, unavailable, toggle, next, setVolume };
}
