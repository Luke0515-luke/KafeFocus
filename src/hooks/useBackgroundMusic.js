import { useCallback, useEffect, useRef, useState } from 'react';

const VOL_KEY = 'kf_music_volume';
const ON_KEY = 'kf_music_on';

const lsGet = (k) => { try { return window.localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { window.localStorage.setItem(k, v); } catch { /* 無痕模式：忽略 */ } };

/**
 * 背景音樂：循環播放清單。瀏覽器不允許未經操作就自動播放，
 * 所以「使用者第一次點擊或按鍵」時才會開始（除非他上次手動關掉了音樂）。
 */
export function useBackgroundMusic(playlist) {
  const audioRef = useRef(null);
  const loadedRef = useRef(false);
  const intentRef = useRef(lsGet(ON_KEY) !== '0');
  const failedRef = useRef(new Set());

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(playlist.length === 0);
  const [volume, setVolumeState] = useState(() => {
    const v = Number(lsGet(VOL_KEY));
    return Number.isFinite(v) && v > 0 ? Math.min(1, v) : 0.35;
  });

  const loadTrack = useCallback((i, autoplay) => {
    const a = audioRef.current;
    if (!a || !playlist[i]) return;
    a.dataset.i = String(i);
    a.src = playlist[i].src;
    loadedRef.current = true;
    if (autoplay) a.play().catch(() => setPlaying(false));
  }, [playlist]);

  // 建立 audio 元素
  useEffect(() => {
    if (playlist.length === 0) return undefined;
    const a = new Audio();
    a.preload = 'none';
    a.volume = volume;
    audioRef.current = a;
    const onEnded = () => setIndex((i) => (i + 1) % playlist.length);
    const onError = () => {
      failedRef.current.add(a.dataset.i);
      if (failedRef.current.size >= playlist.length) {
        setUnavailable(true);
        setPlaying(false);
      } else {
        setIndex((i) => (i + 1) % playlist.length);
      }
    };
    const onPlay = () => setPlaying(true);
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
      audioRef.current = null;
      loadedRef.current = false;
    };
    // volume 只在建立時讀初值，之後由 setVolume 更新
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist]);

  // 換歌
  useEffect(() => {
    if (loadedRef.current) loadTrack(index, intentRef.current);
  }, [index, loadTrack]);

  const play = useCallback(() => {
    const a = audioRef.current;
    if (!a || unavailable) return;
    intentRef.current = true;
    lsSet(ON_KEY, '1');
    if (!loadedRef.current) loadTrack(index, false);
    a.play().catch(() => setPlaying(false));
  }, [index, loadTrack, unavailable]);

  const pause = useCallback(() => {
    intentRef.current = false;
    lsSet(ON_KEY, '0');
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);
  const next = useCallback(() => setIndex((i) => (i + 1) % Math.max(1, playlist.length)), [playlist.length]);

  const setVolume = useCallback((v) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    lsSet(VOL_KEY, String(clamped));
    if (audioRef.current) audioRef.current.volume = clamped;
  }, []);

  // 第一次使用者操作時自動開始
  useEffect(() => {
    if (playlist.length === 0) return undefined;
    const start = () => { if (intentRef.current && !loadedRef.current) play(); };
    window.addEventListener('pointerdown', start, { once: true });
    window.addEventListener('keydown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      window.removeEventListener('keydown', start);
    };
  }, [playlist.length, play]);

  return { current: playlist[index] ?? null, playing, volume, unavailable, toggle, next, setVolume };
}
