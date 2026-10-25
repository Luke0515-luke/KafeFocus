import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { OUTFIT_LABELS, SWATCHES, hashShirt, resolveOutfit } from '../../lib/outfit';

/** 角色外觀：膚色、上衣、褲子、頭髮。點色塊立刻套用到場景裡的自己；最後一格可以用調色盤選任意顏色。 */
export default function OutfitEditor({ userId, outfit, onChange }) {
  const [open, setOpen] = useState(false);
  const cur = resolveOutfit(outfit, userId);
  const set = (key, value) => onChange({ skin: outfit?.skin ?? null, shirt: outfit?.shirt ?? null, pants: outfit?.pants ?? null, hair: outfit?.hair ?? null, [key]: value });

  return (
    <div className="space-y-2 border-t border-stone-700 pt-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs font-medium">
        <span>角色外觀（膚色、衣服、褲子）</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <>
          {Object.keys(SWATCHES).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="w-9 shrink-0 text-[11px] text-stone-400">{OUTFIT_LABELS[key]}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {SWATCHES[key].map((c) => (
                  <button
                    key={c} type="button" onClick={() => set(key, c)} aria-label={`${OUTFIT_LABELS[key]} ${c}`}
                    className={`h-6 w-6 rounded-full ring-offset-1 ring-offset-stone-900 ${cur[key] === c && outfit?.[key] ? 'ring-2 ring-amber-400' : 'ring-1 ring-stone-600'}`}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-full ring-1 ring-stone-600" title="自選顏色"
                  style={{ background: 'conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}>
                  <input type="color" value={cur[key] ?? hashShirt(userId)} onChange={(e) => set(key, e.target.value)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label={`自選${OUTFIT_LABELS[key]}顏色`} />
                </label>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200">
            <RotateCcw size={12} /> 還原預設
          </button>
          <p className="text-[11px] text-stone-500">簡約人形會完整換色；Ready Player Me 角色會替換上衣、褲子並為皮膚、頭髮上色。</p>
        </>
      )}
    </div>
  );
}
