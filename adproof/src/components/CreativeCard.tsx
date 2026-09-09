import { memo } from 'react';
import type { AssignmentView } from '../store/derive.ts';
import { actualSize, displaySize, scaleLabel } from '../engine/scale.ts';
import { useSession } from '../store/session.ts';
import MockupFrame from './MockupFrame.tsx';

interface Props {
  item: AssignmentView;
  onOpen: () => void;
}

function Tag({ children, tone = 'gray' }: { children: React.ReactNode; tone?: 'gray' | 'yellow' | 'red' | 'blue' }) {
  const tones = {
    gray: 'bg-gray-200 text-gray-700',
    yellow: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    blue: 'bg-sky-100 text-sky-800',
  };
  return <span className={`rounded px-1.5 py-0.5 text-[11px] leading-4 ${tones[tone]}`}>{children}</span>;
}

function CreativeCard({ item, onOpen }: Props) {
  const { file, spec, retina, hidden, warnings, versionTag, mockupMode } = item;
  const toggleHidden = useSession((s) => s.toggleHidden);
  const setMockupMode = useSession((s) => s.setMockupMode);
  const removeFile = useSession((s) => s.removeFile);
  const viewMode = useSession((s) => s.viewMode);

  // מידות הסלוט (קובץ רטינה מוצג בגודל הסלוט, בחדות מלאה)
  const slotW = spec.matchType === 'exact' ? spec.width : Math.round(file.width / retina);
  const slotH = spec.matchType === 'exact' ? spec.height : Math.round(file.height / retina);
  const d =
    viewMode === 'actual'
      ? actualSize(slotW, slotH, spec.typicalRenderWidth)
      : displaySize(slotW, slotH);

  const img = (
    <div className="relative" style={{ width: d.width, height: d.height }}>
      <img
        src={file.url}
        alt={file.name}
        className={`creative-img cursor-zoom-in ${d.scale === 1 ? 'pixel-100' : ''}`}
        style={{ width: d.width, height: d.height }}
        onClick={onOpen}
        draggable={false}
      />
      {spec.safeArea && (
        <>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 border-b border-dashed border-emerald-400 bg-emerald-400/15"
            style={{ height: `${spec.safeArea.top * 100}%` }}
            title="אזור UI עליון — לא בטוח לטקסט"
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 border-t border-dashed border-emerald-400 bg-emerald-400/15"
            style={{ height: `${spec.safeArea.bottom * 100}%` }}
            title="אזור UI תחתון — לא בטוח לטקסט"
          />
        </>
      )}
    </div>
  );

  return (
    <div
      className={`group flex flex-col items-center gap-1.5 rounded-lg p-2 transition-opacity ${hidden ? 'opacity-40' : ''} ${d.fullRow ? 'w-full' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'application/x-adproof',
          JSON.stringify({ fileId: file.id, fromSpecId: spec.id }),
        );
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      {mockupMode === 'context' && spec.mockup ? (
        <MockupFrame spec={spec} displayWidth={d.width} displayHeight={d.height}>{img}</MockupFrame>
      ) : (
        <div className="rounded border border-gray-200 bg-white p-1 shadow-sm">{img}</div>
      )}

      <div className="flex max-w-full flex-wrap items-center justify-center gap-1" dir="ltr">
        <Tag>{`${slotW}×${slotH}`}</Tag>
        {d.platformSize ? (
          <Tag tone="blue">
            {spec.matchType !== 'exact' ? 'כמו במכשיר' : d.scale >= 0.99 ? '100% פיקסלים' : scaleLabel(d.scale)}
          </Tag>
        ) : (
          d.scale !== 1 && <Tag>{scaleLabel(d.scale)}</Tag>
        )}
        {retina > 1 && <Tag tone="blue">@{retina}x</Tag>}
        {file.animated && <Tag tone="blue">Animated GIF</Tag>}
        {versionTag && <Tag tone="blue">{versionTag}</Tag>}
        {warnings.map((w, i) => (
          <Tag key={i} tone={w.level === 'error' ? 'red' : 'yellow'}>{w.message}</Tag>
        ))}
      </div>

      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {spec.mockup && (
          <button
            className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
            onClick={() => setMockupMode(file.id, spec.id, mockupMode === 'clean' ? 'context' : 'clean')}
            title="מעבר בין תצוגה נקייה לתצוגה בהקשר"
          >
            {mockupMode === 'clean' ? 'בהקשר' : 'נקי'}
          </button>
        )}
        <button
          className="rounded border border-gray-300 bg-white px-1.5 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50"
          onClick={() => toggleHidden(file.id, spec.id)}
          title={hidden ? 'החזרה לתצוגה ול-PDF' : 'הסתרה מהתצוגה ומה-PDF (בלי למחוק)'}
        >
          {hidden ? '👁 הצג' : '🙈 הסתר'}
        </button>
        <button
          className="rounded border border-red-200 bg-white px-1.5 py-0.5 text-[11px] text-red-500 hover:bg-red-50"
          onClick={() => {
            if (confirm(`למחוק את ${file.name} מכל הפלייסמנטים?`)) removeFile(file.id);
          }}
          title="מחיקת הקובץ מכל הפלייסמנטים"
        >
          🗑
        </button>
      </div>
    </div>
  );
}

export default memo(CreativeCard);
