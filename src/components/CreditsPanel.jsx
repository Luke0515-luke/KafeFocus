import { X } from 'lucide-react';
import { PLAYLIST } from '../config/playlist';
import { backdropProps } from '../lib/backdrop';

const CONTACT = import.meta.env.VITE_CONTACT_EMAIL; // 選填：侵權通報 / 下架聯絡信箱

/** 版權與授權頁：音樂作者與授權、開源套件、使用者內容與下架方式。 */
export default function CreditsPanel({ onClose }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-2 sm:p-3" {...backdropProps(onClose)}>
      <div className="flex max-h-[90dvh] w-full max-w-lg flex-col rounded-2xl bg-stone-900 text-stone-200 shadow-2xl ring-1 ring-stone-700" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="版權與授權">
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg font-semibold text-stone-100">版權與授權</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-stone-800" aria-label="關閉"><X size={18} /></button>
        </div>
        <div className="space-y-4 overflow-y-auto px-4 pb-4 pt-3 text-sm">
          <section>
            <h3 className="mb-1.5 font-medium text-stone-100">背景音樂（Free Music Archive）</h3>
            <ul className="space-y-1.5">
              {PLAYLIST.map((t) => (
                <li key={t.src} className="rounded-lg bg-stone-800 p-2.5">
                  <a href={t.page} target="_blank" rel="noreferrer" className="font-medium text-stone-100 hover:underline">{t.title}</a>
                  <div className="text-xs text-stone-400">{t.artist}・<a href={t.licenseUrl} target="_blank" rel="noreferrer" className="hover:underline">{t.license}</a></div>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-xs text-stone-500">這些音樂僅限非商業使用，未經作者同意不得剪輯或重新散布。</p>
          </section>
          <section>
            <h3 className="mb-1 font-medium text-stone-100">開源套件</h3>
            <p className="text-xs text-stone-400">React、three.js、Tailwind CSS、Vite、@react-three/fiber、@react-three/drei（MIT）；lucide-react（ISC）；supabase-js（Apache-2.0）。3D 場景與貼圖由程式繪製，沒有使用外部圖片或字型。</p>
          </section>
          <section>
            <h3 className="mb-1 font-medium text-stone-100">使用者內容與下架</h3>
            <p className="text-xs text-stone-400">論壇內容由使用者自行發布，版權屬於原作者；請勿張貼未經授權的他人文章、圖片或檔案。發現侵權請使用論壇的「檢舉」按鈕{CONTACT ? <>，或寄信到 <a className="text-amber-400 hover:underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></> : ''}，我們會盡快處理。</p>
          </section>
        </div>
      </div>
    </div>
  );
}
