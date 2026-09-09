import { useEffect, useMemo, useState } from 'react';
import { useSession } from './store/session.ts';
import { deriveBoard } from './store/derive.ts';
import ReviewBoard from './components/ReviewBoard.tsx';
import UploadZone from './components/UploadZone.tsx';
import { exportPdf, type ExportAnnotation } from './pdf/exporter.ts';
import { analyzeFile, ocrFile } from './engine/analyzer.ts';
import { validateAgainstSpec } from './engine/validators.ts';

export default function App() {
  const loaded = useSession((s) => s.loaded);
  const loadFromDb = useSession((s) => s.loadFromDb);
  const files = useSession((s) => s.files);
  const campaignName = useSession((s) => s.campaignName);
  const clientName = useSession((s) => s.clientName);
  const setCampaignName = useSession((s) => s.setCampaignName);
  const setClientName = useSession((s) => s.setClientName);
  const resetSession = useSession((s) => s.resetSession);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState('');

  useEffect(() => {
    void loadFromDb();
  }, [loadFromDb]);

  const state = useSession();
  const board = useMemo(
    () =>
      deriveBoard({
        files: state.files,
        manualAdds: state.manualAdds,
        manualRemoves: state.manualRemoves,
        hiddenAssignments: state.hiddenAssignments,
        mockupModes: state.mockupModes,
        groupOrder: state.groupOrder,
      }),
    [state.files, state.manualAdds, state.manualRemoves, state.hiddenAssignments, state.mockupModes, state.groupOrder],
  );

  const onExport = async () => {
    setExporting(true);
    try {
      await exportPdf(board, { campaignName, clientName });
    } catch (err) {
      alert(`ייצוא ה-PDF נכשל: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
    }
  };

  /** גרסה פנימית: סריקת OCR + איסוף כל ההערות והטבעתן ליד כל עיצוב */
  const onExportInternal = async () => {
    setExporting(true);
    try {
      const annotationsByFile = new Map<string, ExportAnnotation[]>();
      const perFile = new Map<string, { file: (typeof files)[number]; specs: { spec: (typeof board.platforms)[number]['groups'][number]['items'][number]['spec']; retina: number }[] }>();
      for (const p of board.platforms) {
        for (const g of p.groups) {
          for (const item of g.items) {
            if (item.hidden) continue;
            const entry = perFile.get(item.file.id) ?? { file: item.file, specs: [] };
            entry.specs.push({ spec: item.spec, retina: item.retina });
            perFile.set(item.file.id, entry);
            // אזהרות ולידציה (משקל/פורמט/רזולוציה) — פר פלייסמנט
            for (const w of validateAgainstSpec(item.file, item.spec)) {
              const list = annotationsByFile.get(item.file.id) ?? [];
              list.push({ level: w.level, text: w.message, placement: item.spec.name });
              annotationsByFile.set(item.file.id, list);
            }
          }
        }
      }
      // סריקת OCR — אם נכשלת (למשל בקובץ העצמאי), ממשיכים עם אזהרות הוולידציה בלבד
      try {
        const entries = [...perFile.values()];
        for (let i = 0; i < entries.length; i++) {
          setExportProgress(`סורק ${i + 1}/${entries.length}…`);
          const { file, specs } = entries[i];
          const issues = await analyzeFile(file, specs, await ocrFile(file));
          for (const issue of issues) {
            const list = annotationsByFile.get(file.id) ?? [];
            list.push({ level: issue.level, text: issue.message, placement: issue.placement });
            annotationsByFile.set(file.id, list);
          }
        }
      } catch {
        alert('סריקת התוכן (OCR) לא זמינה — הגרסה הפנימית תכלול רק אזהרות משקל/פורמט');
      }
      setExportProgress('בונה PDF…');
      await exportPdf(board, { campaignName, clientName }, { internal: true, annotationsByFile });
    } catch (err) {
      alert(`ייצוא ה-PDF נכשל: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setExporting(false);
      setExportProgress('');
    }
  };

  if (!loaded) return <p className="p-8 text-center text-gray-400">טוען סשן…</p>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 mb-6 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          {/* לוגו הסוכנות — placeholder גנרי */}
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-gray-900 px-2 py-1 text-sm font-bold text-white">AdProof</span>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              className="min-w-40 rounded-md border border-transparent bg-transparent px-2 py-1 text-lg font-bold text-gray-900 hover:border-gray-200 focus:border-gray-300 focus:outline-none"
              placeholder="שם קמפיין"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
            />
            <span className="text-gray-300">·</span>
            <input
              className="min-w-32 rounded-md border border-transparent bg-transparent px-2 py-1 text-gray-600 hover:border-gray-200 focus:border-gray-300 focus:outline-none"
              placeholder="שם לקוח"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              onClick={() => {
                if (files.length === 0 || confirm('לאפס את הכלי? כל הקבצים והסשן יימחקו.')) {
                  resetSession();
                  // רענון מלא: מנקה גם מטמוני OCR וזיכרון, וחוזר למצב התחלתי נקי
                  setTimeout(() => window.location.reload(), 100);
                }
              }}
              title="איפוס מלא של הכלי — מחיקת הסשן וטעינה מחדש"
            >
              ⟳ רענן
            </button>
            <button
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              onClick={() => {
                if (files.length === 0 || confirm('להתחיל קמפיין חדש? הסשן הנוכחי יימחק.')) resetSession();
              }}
            >
              קמפיין חדש
            </button>
            <button
              className="rounded-lg border border-amber-400 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-40"
              disabled={files.length === 0 || exporting}
              onClick={() => void onExportInternal()}
              title="PDF פנימי לצוות: כל הערות הבדיקה (רגולציה, ט.ל.ח, אזור בטוח, משקל, כתיב) מוטבעות ליד כל עיצוב. לא לשליחה ללקוח."
            >
              {exporting && exportProgress ? exportProgress : 'PDF עם הערות'}
            </button>
            <button
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
              disabled={files.length === 0 || exporting}
              onClick={() => void onExport()}
              title="ה-PDF הנקי שנשלח ללקוח — בלי שום הערת בדיקה"
            >
              {exporting && !exportProgress ? 'מייצא…' : 'ייצוא PDF ללקוח'}
            </button>
          </div>
        </div>
      </header>

      {files.length === 0 ? (
        <div className="mx-auto max-w-3xl px-4 pt-12">
          <UploadZone />
        </div>
      ) : (
        <ReviewBoard />
      )}
    </div>
  );
}
