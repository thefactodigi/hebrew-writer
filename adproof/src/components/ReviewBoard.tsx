import { useMemo, useState } from 'react';
import { deriveBoard } from '../store/derive.ts';
import { useSession } from '../store/session.ts';
import { PLATFORM_LABELS, type Platform } from '../specs/specs.ts';
import PlatformSection from './PlatformSection.tsx';
import UnassignedZone from './UnassignedZone.tsx';
import MissingPanel from './MissingPanel.tsx';
import Lightbox from './Lightbox.tsx';
import UploadZone from './UploadZone.tsx';

type Tab = 'all' | Platform;

export default function ReviewBoard() {
  const files = useSession((s) => s.files);
  const manualAdds = useSession((s) => s.manualAdds);
  const manualRemoves = useSession((s) => s.manualRemoves);
  const hiddenAssignments = useSession((s) => s.hiddenAssignments);
  const mockupModes = useSession((s) => s.mockupModes);
  const groupOrder = useSession((s) => s.groupOrder);

  const board = useMemo(
    () => deriveBoard({ files, manualAdds, manualRemoves, hiddenAssignments, mockupModes, groupOrder }),
    [files, manualAdds, manualRemoves, hiddenAssignments, mockupModes, groupOrder],
  );

  const viewMode = useSession((s) => s.viewMode);
  const setViewMode = useSession((s) => s.setViewMode);
  const setAllMockupModes = useSession((s) => s.setAllMockupModes);
  const [tab, setTab] = useState<Tab>('all');

  const shownPlatforms =
    tab === 'all' ? board.platforms : board.platforms.filter((p) => p.platform === tab);
  const allGroupKeys = board.platforms.flatMap((p) => p.groups.map((g) => g.key));
  const shownItems = shownPlatforms.flatMap((p) => p.groups).flatMap((g) => g.items);
  const lightboxItems = shownItems.filter((i) => !i.hidden);
  const mockupableKeys = shownItems.filter((i) => i.spec.mockup).map((i) => i.key);
  const allInContext =
    mockupableKeys.length > 0 && shownItems.filter((i) => i.spec.mockup).every((i) => i.mockupMode === 'context');

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {/* טאבים — רק פלטפורמות שיש בהן תוכן */}
      <nav className="mb-4 flex gap-1 border-b border-gray-300">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>הכל</TabButton>
        {board.platforms.map((p) => (
          <TabButton key={p.platform} active={tab === p.platform} onClick={() => setTab(p.platform)}>
            {PLATFORM_LABELS[p.platform]}
            <span className="ms-1 text-xs text-gray-400">{p.visibleCount}</span>
          </TabButton>
        ))}
      </nav>

      {/* סרגל תצוגה: קנה מידה + מוקאפים */}
      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex overflow-hidden rounded-lg border border-gray-300 bg-white">
          <button
            className={`px-3 py-1 ${viewMode === 'smart' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setViewMode('smart')}
            title="קנה מידה נוח לסקירה — הצד הקצר לא יורד מ-140px"
          >
            תצוגה חכמה
          </button>
          <button
            className={`px-3 py-1 ${viewMode === 'actual' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            onClick={() => setViewMode('actual')}
            title="כל התאמה בגודל שבו היא באמת נראית בפלטפורמה: באנרים ב-100% פיקסלים, נכסי Meta/PMax ברוחב התצוגה במכשיר"
          >
            גודל אמיתי
          </button>
        </div>

        <button
          className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-gray-600 hover:bg-gray-50"
          onClick={() => setAllMockupModes(mockupableKeys, allInContext ? 'clean' : 'context')}
          disabled={mockupableKeys.length === 0}
          title="הצגת כל ההתאמות בתוך מוקאפ של הפלייסמנט (או חזרה לתצוגה נקייה)"
        >
          {allInContext ? 'הכל נקי' : 'הכל בהקשר'}
        </button>

        {viewMode === 'actual' && (
          <span className="text-xs text-gray-400">
            באנרים ב-100% פיקסלים · נכסי Meta/PMax בגודל שבו הם מוצגים במכשיר
          </span>
        )}
      </div>

      {shownPlatforms.map((p) => (
        <PlatformSection key={p.platform} platform={p} allGroupKeys={allGroupKeys} />
      ))}

      {shownPlatforms.length === 0 && (
        <p className="py-16 text-center text-gray-400">אין עדיין התאמות משויכות בטאב הזה.</p>
      )}

      <UnassignedZone files={board.unassigned} />

      <div className="mt-8">
        <UploadZone compact />
      </div>

      <MissingPanel missing={board.missing} />
      <Lightbox items={lightboxItems} />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 text-sm transition-colors ${
        active
          ? 'border-gray-900 font-medium text-gray-900'
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
