import { useState, useRef, useEffect } from 'react';
import { PLAYLIST } from '../config/playlist';

export function MusicPlayer() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);

  const currentTrack = PLAYLIST[currentIndex];

  // 播放 / 暫停切換
  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => console.error("播放失敗:", err));
    }
  };

  // 播下一首（播到最後一首時，會自動歸零回到第一首）
  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % PLAYLIST.length);
  };

  // 播上一首
  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + PLAYLIST.length) % PLAYLIST.length);
  };

  // 當曲目改變時，若原本就在播放狀態，就自動播放新曲目
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(err => console.error(err));
    }
  }, [currentIndex]);

  // 音樂結束時自動觸發：播下一首（直到最後一首播放完再回到第一首）
  const handleEnded = () => {
    handleNext();
  };

  return (
    <div className="fixed bottom-5 right-5 bg-stone-900/80 backdrop-blur-md text-white p-4 rounded-2xl shadow-xl z-50 flex flex-col gap-2 max-w-xs border border-stone-700/50">
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onEnded={handleEnded}
      />

      {/* 曲目資訊 */}
      <div className="flex flex-col">
        <span className="text-sm font-bold truncate">{currentTrack.title}</span>
        <span className="text-xs text-stone-400 truncate">{currentTrack.artist}</span>
      </div>

      {/* 控制按鈕 */}
      <div className="flex items-center justify-center gap-3 mt-1">
        <button
          onClick={handlePrev}
          className="p-2 hover:bg-stone-700/50 rounded-full transition"
          title="上一首"
        >
          ⏮️
        </button>

        <button
          onClick={togglePlay}
          className="p-3 bg-amber-600 hover:bg-amber-500 text-white rounded-full transition shadow-md"
          title={isPlaying ? '暫停' : '播放'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>

        <button
          onClick={handleNext}
          className="p-2 hover:bg-stone-700/50 rounded-full transition"
          title="下一首"
        >
          ⏭️
        </button>
      </div>

      {/* 授權標示 (Attribution) */}
      <div className="text-[10px] text-stone-400 border-t border-stone-800 pt-1 mt-1 text-center">
        License: <a href={currentTrack.licenseUrl} target="_blank" rel="noreferrer" className="underline">{currentTrack.license}</a>
      </div>
    </div>
  );
}
