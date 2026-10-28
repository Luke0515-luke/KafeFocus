import { useEffect, useState } from 'react';

/** 頭頂的聊天泡泡（放在 drei <Html> 裡）；時間到會自己消失。bubble = { text, until }。 */
export default function SpeechBubble({ bubble }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!bubble) return undefined;
    const ms = bubble.until - Date.now();
    if (ms <= 0) return undefined;
    const id = setTimeout(() => force((n) => n + 1), ms + 30);
    return () => clearTimeout(id);
  }, [bubble]);

  if (!bubble || bubble.until <= Date.now()) return null;
  return (
    <div className={`pointer-events-none max-w-[200px] break-words rounded-xl rounded-bl-sm bg-white/95 text-center font-medium text-stone-800 shadow-lg ${bubble.big ? 'px-2.5 py-0.5 text-2xl' : 'px-3 py-1.5 text-xs'}`}>
      {bubble.text}
    </div>
  );
}
