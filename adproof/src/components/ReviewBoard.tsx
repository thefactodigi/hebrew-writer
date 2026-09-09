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

  const [tab, setTab] = useState<Tab>('all');

  const shownPlatforms =
    tab === 'all' ? board.platforms : board.platforms.filter((p) => p.platform === tab);
  const allGroupKeys = board.platforms.flatMap((p) => p.groups.map((g) => g.key));
  const lightboxItems = shownPlatforms
    .flatMap((p) => p.groups)
    .flatMap((g) => g.items)
    .filter((i) => !i.hidden);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      {/* טאבים — רק פלטפורמות שיש בהן תוכן */}
      <nav className="mb-6 flex gap-1 border-b border-gray-300">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')}>הכל</TabButton>
        {board.platforms.map((p) => (
          <TabButton key={p.platform} active={tab === p.platform} onClick={() => setTab(p.platform)}>
            {PLATFORM_LABELS[p.platform]}
            <span className="ms-1 text-xs text-gray-400">{p.visibleCount}</span>
          </TabButton>
        ))}
      </nav>

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
