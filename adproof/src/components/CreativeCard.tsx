import { memo } from 'react';
import type { AssignmentView } from '../store/derive.ts';
import { PLATFORM_LABELS, safeZoneSeverity } from '../specs/specs.ts';
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
  const showSafeZones = useSession((s) => s.showSafeZones);

  // מידות הסלוט (קובץ רטינה מוצג בגודל הסלוט, בחדות מלאה)
  const slotW = spec.matchType === 'exact' ? spec.width : Math.round(file.width / retina);
  const slotH = spec.matchType === 'exact' ? spec.height : Math.round(file.height / retina);
  const d =
    viewMode === 'actual'
      ? actualSize(slotW, slotH, spec.typicalRenderWidth)
      : displaySize(slotW, slotH);
  const severity = safeZoneSeverity(spec);

  const img = (
    <div className="relative overflow-hidden" style={{ width: d.width, height: d.height }}>
      <img
        src={file.url}
        alt={file.name}
        className={`creative-img cursor-zoom-in ${d.scale === 1 ? 'pixel-100' : ''}`}
        style={{ width: d.width, height: d.height }}
        onClick={onOpen}
        draggable={false}
      />
      {/* קריטי (נחתך/מכוסה בפועל) — אדום; מומלץ (שוליים בלבד) — ירוק */}
      {showSafeZones && spec.safeArea && (spec.safeArea.top || spec.safeArea.bottom || spec.safeArea.left || spec.safeArea.right) ? (
        <div
          className={`pointer-events-none absolute border border-dashed ${severity === 'critical' ? 'border-red-400' : 'border-emerald-400'}`}
          style={{
            top: `${(spec.safeArea.top ?? 0) * 100}%`,
            bottom: `${(spec.safeArea.bottom ?? 0) * 100}%`,
            left: `${(spec.safeArea.left ?? 0) * 100}%`,
            right: `${(spec.safeArea.right ?? 0) * 100}%`,
            boxShadow: severity === 'critical' ? '0 0 0 9999px rgba(239, 68, 68, 0.22)' : '0 0 0 9999px rgba(16, 185, 129, 0.16)',
          }}
          title={
            severity === 'critical'
              ? 'האזור האדום נחתך או מכוסה על ידי הפלטפורמה — תוכן חשוב נשאר בתוך המסגרת'
              : 'שוליים מומלצים — תוכן חשוב עדיף בתוך המסגרת המקווקוות'
          }
        />
      ) : null}
      {showSafeZones && spec.safeArea?.cornerTL && (
        <div
          className="pointer-events-none absolute left-0 top-0 border border-dashed border-red-500 bg-red-500/25"
          style={{
            width: spec.safeArea.cornerTL.w * (d.width / slotW),
            height: spec.safeArea.cornerTL.h * (d.height / slotH),
          }}
          title='תגית "מודעה" של יאנדקס תוצג כאן — בלי לוגו, מחיר או CTA באזור הזה'
        />
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
      {/* שם הפלייסמנט + פלטפורמה + חומרת האזור הבטוח */}
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5 text-xs">
        <span className="font-medium text-gray-700">{spec.name}</span>
        <span className="text-gray-400">·</span>
        <span className="text-gray-500">{PLATFORM_LABELS[spec.platform]}</span>
        {severity && (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] leading-4 ${
              severity === 'critical' ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'
            }`}
            title={
              severity === 'critical'
                ? 'הפלטפורמה מכסה או חותכת את האזורים המסומנים — חריגה תיעלם או תוסתר בפועל'
                : 'שוליים מומלצים בלבד — אין חיתוך רשמי בפלייסמנט הזה'
            }
          >
            {severity === 'critical' ? 'אזור בטוח — קריטי' : 'אזור בטוח — מומלץ'}
          </span>
        )}
      </div>

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
