import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { openProfile } from '../lib/openProfile';

const isWide = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches;

/** 咖啡廳聊天室：訊息只在同一間咖啡廳的人之間即時傳送，不會存起來；說話時頭上也會冒出泡泡。 */
export default function ChatPanel({ messages, myId, onSend }) {
  const [open, setOpen] = useState(isWide);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const listRef = useRef(null);
  const seen = useRef(messages.length);

  useEffect(() => {
    if (open) { seen.current = messages.length; setUnread(0); } else setUnread(Math.max(0, messages.length - seen.current));
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const submit = (e) => {
    e.preventDefault();
    if (onSend(text)) setText('');
  };

  if (!open) {
    return (
      <button
        type="button" onClick={() => setOpen(true)} aria-label="打開聊天室"
        className="absolute bottom-[5.5rem] left-3 z-30 grid h-11 w-11 place-items-center rounded-full bg-stone-900/90 text-amber-200 shadow-xl ring-1 ring-stone-600 backdrop-blur md:bottom-4 md:left-4"
      >
        <MessageCircle size={20} />
        {unread > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
    );
  }

  return (
    <div className="absolute bottom-[5.5rem] left-3 right-3 z-30 flex max-h-[45dvh] flex-col rounded-2xl bg-stone-900/90 text-stone-200 shadow-xl ring-1 ring-stone-700 backdrop-blur md:bottom-4 md:left-4 md:right-auto md:w-80">
      <div className="flex items-center justify-between px-3 pt-2 text-xs text-stone-400">
        <span className="flex items-center gap-1.5"><MessageCircle size={13} /> 咖啡廳聊天室</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="收起聊天室" className="rounded p-1 hover:bg-stone-800"><X size={14} /></button>
      </div>
      <ul ref={listRef} className="min-h-[2.5rem] max-h-36 flex-1 space-y-1 overflow-y-auto px-3 py-2 text-sm md:max-h-48">
        {messages.length === 0 && <li className="text-xs text-stone-500">跟同一間咖啡廳的人打聲招呼吧（訊息不會被保存）。</li>}
        {messages.map((m) => (
          <li key={m.id} className="break-words">
            <button type="button" onClick={() => openProfile(m.uid)} className={`font-medium underline-offset-2 hover:underline ${m.uid === myId ? 'text-amber-400' : 'text-stone-300'}`}>{m.name}</button>
            <span className="text-stone-500">：</span>{m.text}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="flex gap-2 border-t border-stone-700 p-2">
        <input
          value={text} onChange={(e) => setText(e.target.value)} maxLength={120} placeholder="說點什麼…" enterKeyHint="send"
          className="min-w-0 flex-1 rounded-lg border border-stone-600 bg-stone-800 px-3 py-2 text-sm text-stone-100 outline-none focus:border-amber-500"
        />
        <button disabled={!text.trim()} aria-label="送出" className="grid w-10 place-items-center rounded-lg bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-40"><Send size={16} /></button>
      </form>
    </div>
  );
}
