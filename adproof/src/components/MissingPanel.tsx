import { useState } from 'react';
import type { PlacementSpec } from '../specs/specs.ts';
import { PLATFORM_LABELS, PLATFORM_ORDER } from '../specs/specs.ts';

/**
 * פאנל "מה חסר" — למעצב בלבד (מצב עבודה): אילו מידות סטנדרטיות לא הועלו,
 * כולל אזהרה על נכסי חובה חסרים של PMax. לא מופיע במסך לקוח ולא ב-PDF.
 */
export default function MissingPanel({ missing }: { missing: PlacementSpec[] }) {
  const [open, setOpen] = useState(false);
  const requiredMissing = missing.filter((s) => s.required);

  return (
    <aside className="fixed bottom-4 left-4 z-40 w-72">
      <button
        className={`w-full rounded-t-lg px-3 py-2 text-start text-sm font-medium shadow ${
          requiredMissing.length ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
        } ${open ? '' : 'rounded-b-lg'}`}
        onClick={() => setOpen(!open)}
      >
        מה חסר ({missing.length})
        {requiredMissing.length > 0 && ` · ${requiredMissing.length} נכסי חובה!`}
        <span className="float-left">{open ? '▾' : '▴'}</span>
      </button>
      {open && (
        <div className="max-h-80 overflow-y-auto rounded-b-lg bg-white p-3 text-sm shadow-lg">
          {requiredMissing.length > 0 && (
            <p className="mb-2 rounded bg-red-50 p-2 text-xs text-red-700">
              חסרים נכסי חובה של Performance Max — הקמפיין לא יעלה בלעדיהם.
            </p>
          )}
          {PLATFORM_ORDER.map((p) => {
            const items = missing.filter((s) => s.platform === p);
            if (!items.length) return null;
            return (
              <div key={p} className="mb-3">
                <h4 className="mb-1 font-medium text-gray-700">{PLATFORM_LABELS[p]}</h4>
                <ul className="space-y-0.5">
                  {items.map((s) => (
                    <li key={s.id} className={`flex justify-between gap-2 ${s.required ? 'text-red-600' : 'text-gray-500'}`}>
                      <span>{s.name}{s.required ? ' (חובה)' : ''}</span>
                      <span dir="ltr" className="text-xs text-gray-400">{s.width}×{s.height}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
