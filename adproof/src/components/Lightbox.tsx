import { useEffect, useState, useCallback } from 'react';
import type { AssignmentView } from '../store/derive.ts';

/** תצוגת 100% פיקסלים אמיתיים עם דפדוף בין ההתאמות */
export default function Lightbox({ items }: { items: AssignmentView[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => setOpenKey((e as CustomEvent<string>).detail);
    window.addEventListener('adproof:lightbox', onOpen);
    return () => window.removeEventListener('adproof:lightbox', onOpen);
  }, []);

  const index = items.findIndex((i) => i.key === openKey);
  const item = index >= 0 ? items[index] : null;

  const step = useCallback(
    (d: number) => {
      if (index < 0 || items.length === 0) return;
      setOpenKey(items[(index + d + items.length) % items.length].key);
    },
    [index, items],
  );

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenKey(null);
      // בממשק RTL החצים הפוכים
      if (e.key === 'ArrowLeft') step(1);
      if (e.key === 'ArrowRight') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, step]);

  if (!item) return null;

  return (
    <div
      className="fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/85"
      onClick={() => setOpenKey(null)}
    >
      <div className="max-h-full max-w-full overflow-auto p-10" onClick={(e) => e.stopPropagation()}>
        <img
          src={item.file.url}
          alt={item.file.name}
          className="creative-img pixel-100 mx-auto"
          style={{ width: item.file.width, height: item.file.height, maxWidth: 'none' }}
        />
      </div>

      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/25"
        onClick={(e) => {
          e.stopPropagation();
          step(-1);
        }}
        aria-label="הקודם"
      >
        ‹
      </button>
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white hover:bg-white/25"
        onClick={(e) => {
          e.stopPropagation();
          step(1);
        }}
        aria-label="הבא"
      >
        ›
      </button>
      <button
        className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-white hover:bg-white/25"
        onClick={() => setOpenKey(null)}
        aria-label="סגירה"
      >
        ✕
      </button>

      <div dir="ltr" className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1 text-sm text-white">
        {item.file.width}×{item.file.height} · 100% · {index + 1}/{items.length}
      </div>
    </div>
  );
}
