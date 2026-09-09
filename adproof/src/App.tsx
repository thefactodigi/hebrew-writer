import { useEffect, useMemo, useState } from 'react';
import { useSession } from './store/session.ts';
import { deriveBoard } from './store/derive.ts';
import ReviewBoard from './components/ReviewBoard.tsx';
import UploadZone from './components/UploadZone.tsx';
import { exportPdf } from './pdf/exporter.ts';

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
                if (files.length === 0 || confirm('להתחיל קמפיין חדש? הסשן הנוכחי יימחק.')) resetSession();
              }}
            >
              קמפיין חדש
            </button>
            <button
              className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-40"
              disabled={files.length === 0 || exporting}
              onClick={() => void onExport()}
            >
              {exporting ? 'מייצא…' : 'ייצוא PDF'}
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
