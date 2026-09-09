// ─────────────────────────────────────────────────────────────────────────────
// דוח בעיות — למעצב בלבד, לא נכנס ל-PDF ללקוח:
// מידות חסרות, יציאה מאזור בטוח, טקסט חתוך, טקסט קטן, חשדות כתיב.
// ה-OCR רץ מקומית בדפדפן; בפעם הראשונה נטענים מודלי זיהוי (~7MB).
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import type { BoardView } from '../store/derive.ts';
import { PLATFORM_LABELS, type PlacementSpec } from '../specs/specs.ts';
import { analyzeFile, ocrFile, type FileIssue } from '../engine/analyzer.ts';
import type { CreativeFile } from '../store/session.ts';

interface Props {
  board: BoardView;
  open: boolean;
  onClose: () => void;
}

type Phase = 'idle' | 'running' | 'done' | 'error';

const CATEGORY_LABELS: Record<FileIssue['category'], string> = {
  'safe-zone': 'יציאה מהאזור הבטוח',
  cutoff: 'טקסט חתוך בקצה',
  'small-text': 'טקסט קטן מדי',
  compliance: 'רגולציה — סייגים ואותיות קטנות (הגנת הצרכן)',
  spelling: 'מילים לבדיקת כתיב',
};

const CATEGORY_ORDER: FileIssue['category'][] = ['compliance', 'safe-zone', 'cutoff', 'small-text', 'spelling'];

export default function IssuesReport({ board, open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState({ done: 0, total: 0, current: '' });
  const [issues, setIssues] = useState<FileIssue[]>([]);
  const [error, setError] = useState('');

  if (!open) return null;

  // קובץ → כל השיוכים הגלויים שלו
  const fileAssignments = new Map<string, { file: CreativeFile; specs: { spec: PlacementSpec; retina: number }[] }>();
  for (const p of board.platforms) {
    for (const g of p.groups) {
      for (const item of g.items) {
        if (item.hidden) continue;
        const entry = fileAssignments.get(item.file.id) ?? { file: item.file, specs: [] };
        entry.specs.push({ spec: item.spec, retina: item.retina });
        fileAssignments.set(item.file.id, entry);
      }
    }
  }

  const run = async () => {
    setPhase('running');
    setIssues([]);
    const entries = [...fileAssignments.values()];
    setProgress({ done: 0, total: entries.length, current: '' });
    const collected: FileIssue[] = [];
    try {
      for (let i = 0; i < entries.length; i++) {
        const { file, specs } = entries[i];
        setProgress({ done: i, total: entries.length, current: file.name });
        const words = await ocrFile(file);
        collected.push(...(await analyzeFile(file, specs, words)));
        setIssues([...collected]);
      }
      setProgress({ done: entries.length, total: entries.length, current: '' });
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  const requiredMissing = board.missing.filter((s) => s.required);
  const optionalMissing = board.missing.filter((s) => !s.required);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 className="text-lg font-bold text-gray-900">דוח בעיות</h2>
          <button className="rounded px-2 py-1 text-gray-400 hover:bg-gray-100" onClick={onClose}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* מידות חסרות — זמין מיד, בלי סריקה */}
          <section className="mb-5">
            <h3 className="mb-2 font-bold text-gray-800">מידות חסרות ({board.missing.length})</h3>
            {requiredMissing.length > 0 && (
              <div className="mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="mb-1 font-medium">נכסי חובה של Performance Max — הקמפיין לא יעלה בלעדיהם:</p>
                <ul className="list-inside list-disc">
                  {requiredMissing.map((s) => (
                    <li key={s.id}>{s.name} <span dir="ltr" className="text-xs">({s.width}×{s.height})</span></li>
                  ))}
                </ul>
              </div>
            )}
            {optionalMissing.length > 0 && (
              <details className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <summary className="cursor-pointer font-medium">מידות סטנדרטיות שלא הועלו ({optionalMissing.length})</summary>
                <ul className="mt-2 grid grid-cols-2 gap-x-4">
                  {optionalMissing.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span>{PLATFORM_LABELS[s.platform]}</span>
                      <span dir="ltr" className="text-gray-400">{s.width}×{s.height}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {board.missing.length === 0 && <p className="text-sm text-emerald-600">כל המידות הסטנדרטיות קיימות 🎉</p>}
          </section>

          {/* סריקת תוכן */}
          <section>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="font-bold text-gray-800">בדיקות תוכן (OCR)</h3>
              {phase !== 'running' && (
                <button
                  className="rounded-lg bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700"
                  onClick={() => void run()}
                >
                  {phase === 'done' ? 'סריקה מחדש' : 'הפעלת סריקה'}
                </button>
              )}
            </div>
            <p className="mb-3 text-xs text-gray-400">
              זיהוי הטקסט רץ מקומית בדפדפן (בפעם הראשונה נטענים מודלים, ~7MB). התוצאות הן עזר
              למעצב — OCR עלול לפספס או לטעות, במיוחד בטיפוגרפיה מעוצבת. בדיקות הרגולציה
              מבוססות על מדריך הסייגים והאותיות הקטנות (כלל ה-30%, ט.ל.ח) ואינן ייעוץ משפטי.
            </p>

            {phase === 'running' && (
              <div className="mb-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
                סורק {progress.done + 1}/{progress.total}: {progress.current}
                <div className="mt-2 h-1.5 overflow-hidden rounded bg-sky-100">
                  <div className="h-full bg-sky-500 transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
                </div>
              </div>
            )}
            {phase === 'error' && (
              <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                הסריקה נכשלה: {error}. אם אתם בקובץ ה-HTML העצמאי — בדיקות התוכן זמינות רק בגרסת הווב.
              </p>
            )}

            {(phase === 'done' || (phase === 'running' && issues.length > 0)) &&
              CATEGORY_ORDER.map((cat) => {
                const items = issues.filter((i) => i.category === cat);
                if (!items.length) return null;
                return (
                  <div key={cat} className="mb-4">
                    <h4 className="mb-1.5 text-sm font-bold text-gray-700">
                      {CATEGORY_LABELS[cat]} ({items.length})
                    </h4>
                    <ul className="space-y-1.5">
                      {items.map((issue, i) => (
                        <li
                          key={i}
                          className={`rounded-lg p-2.5 text-sm ${issue.level === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800'}`}
                        >
                          <span className="font-medium">{issue.fileName}</span>
                          {issue.placement && <span className="text-xs opacity-70"> · {issue.placement}</span>}
                          <div>{issue.message}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}

            {phase === 'done' && issues.length === 0 && (
              <p className="text-sm text-emerald-600">לא נמצאו בעיות תוכן בקבצים שנסרקו 🎉</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
