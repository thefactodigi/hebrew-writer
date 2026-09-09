import type { CreativeFile } from '../store/session.ts';
import { useSession } from '../store/session.ts';
import { nearestSpec } from '../engine/matcher.ts';
import { PLATFORM_LABELS } from '../specs/specs.ts';

/**
 * אזור "לא משויך" — קבצים שלא תאמו שום מפרט, עם המידות שלהם
 * והצעה לסלוט הקרוב ביותר. מוצג במצב עבודה בלבד, לא ב-PDF.
 * מכאן גוררים ידנית לכל קבוצה.
 */
export default function UnassignedZone({ files }: { files: CreativeFile[] }) {
  const removeFile = useSession((s) => s.removeFile);
  const addManualAssignment = useSession((s) => s.addManualAssignment);

  if (!files.length) return null;

  return (
    <section className="mt-10 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/60 p-4">
      <h2 className="mb-3 text-base font-bold text-amber-800">
        לא משויך ({files.length}) — גררו לקבוצה מתאימה או שייכו בלחיצה
      </h2>
      <div className="flex flex-wrap gap-4">
        {files.map((f) => {
          const suggestion = nearestSpec(f);
          const previewScale = Math.min(1, 160 / Math.max(f.width, f.height));
          return (
            <div
              key={f.id}
              className="flex w-52 flex-col items-center gap-1.5 rounded-lg border border-amber-200 bg-white p-2 text-center"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  'application/x-adproof',
                  JSON.stringify({ fileId: f.id, fromSpecId: null }),
                );
              }}
            >
              <img
                src={f.url}
                alt={f.name}
                className="creative-img"
                style={{ width: f.width * previewScale, height: f.height * previewScale }}
                draggable={false}
              />
              <span dir="ltr" className="text-xs text-gray-500">{f.width}×{f.height}</span>
              <span className="max-w-full truncate text-[11px] text-gray-400" title={f.name}>{f.name}</span>
              {suggestion && (
                <button
                  className="rounded bg-amber-100 px-2 py-0.5 text-[11px] text-amber-800 hover:bg-amber-200"
                  onClick={() => addManualAssignment(f.id, suggestion.spec.id)}
                  title="שיוך ידני לסלוט הקרוב ביותר"
                >
                  הקרוב ביותר: {PLATFORM_LABELS[suggestion.spec.platform]} · {suggestion.spec.name}
                </button>
              )}
              <button
                className="text-[11px] text-red-400 hover:text-red-600"
                onClick={() => {
                  if (confirm(`למחוק את ${f.name}?`)) removeFile(f.id);
                }}
              >
                מחיקה
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
