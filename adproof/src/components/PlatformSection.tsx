import { useState } from 'react';
import type { GroupView, PlatformView } from '../store/derive.ts';
import { PLATFORM_LABELS, SPECS } from '../specs/specs.ts';
import { nearestSpec } from '../engine/matcher.ts';
import { useSession } from '../store/session.ts';
import CreativeCard from './CreativeCard.tsx';

interface DragPayload {
  fileId: string;
  fromSpecId: string | null;
}

function readPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData('application/x-adproof');
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

function GroupBlock({
  group,
  allGroupKeys,
}: {
  group: GroupView;
  allGroupKeys: string[];
}) {
  const moveAssignment = useSession((s) => s.moveAssignment);
  const setGroupOrder = useSession((s) => s.setGroupOrder);
  const files = useSession((s) => s.files);
  const [dragOver, setDragOver] = useState(false);

  const groupSpecs = SPECS.filter((s) => `${s.platform}|${s.group}` === group.key);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    // גרירת קבוצה (סידור סדר קבוצות)
    const groupKey = e.dataTransfer.getData('application/x-adproof-group');
    if (groupKey && groupKey !== group.key) {
      const order = allGroupKeys.filter((k) => k !== groupKey);
      order.splice(order.indexOf(group.key), 0, groupKey);
      setGroupOrder(order);
      return;
    }

    // גרירת התאמה בין קבוצות: שיוך לסלוט הקרוב ביותר בקבוצת היעד
    const payload = readPayload(e);
    if (!payload) return;
    const file = files.find((f) => f.id === payload.fileId);
    if (!file) return;
    const target = nearestSpec({ width: file.width, height: file.height }, groupSpecs);
    if (!target) return;
    if (payload.fromSpecId === target.spec.id) return;
    moveAssignment(payload.fileId, payload.fromSpecId, target.spec.id);
  };

  return (
    <section
      className={`rounded-xl border p-3 transition-colors ${dragOver ? 'border-sky-400 bg-sky-50' : 'border-transparent'}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      <h3
        className="mb-2 flex cursor-grab items-center gap-2 text-sm font-medium text-gray-500"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-adproof-group', group.key);
          e.dataTransfer.effectAllowed = 'move';
        }}
        title="גרירה לשינוי סדר הקבוצות (הסדר נשמר ל-PDF)"
      >
        <span className="text-gray-300">⋮⋮</span>
        {group.group}
        <span className="text-xs text-gray-400">({group.items.filter((i) => !i.hidden).length})</span>
      </h3>
      <div className="flex flex-wrap items-end gap-4">
        {group.items.map((item) => (
          <CreativeCardWithLightbox key={item.key} itemKey={item.key} group={group} />
        ))}
      </div>
    </section>
  );
}

// עטיפה קטנה כדי לפתוח lightbox דרך context גלובלי פשוט (event)
function CreativeCardWithLightbox({ itemKey, group }: { itemKey: string; group: GroupView }) {
  const item = group.items.find((i) => i.key === itemKey)!;
  return (
    <CreativeCard
      item={item}
      onOpen={() => window.dispatchEvent(new CustomEvent('adproof:lightbox', { detail: itemKey }))}
    />
  );
}

export default function PlatformSection({
  platform,
  allGroupKeys,
}: {
  platform: PlatformView;
  allGroupKeys: string[];
}) {
  return (
    <div className="mb-8">
      <h2 className="mb-2 border-b border-gray-300 pb-1 text-lg font-bold text-gray-800">
        {PLATFORM_LABELS[platform.platform]}
        <span className="ms-2 text-sm font-normal text-gray-400">{platform.visibleCount} התאמות</span>
      </h2>
      {platform.groups.map((g) => (
        <GroupBlock key={g.key} group={g} allGroupKeys={allGroupKeys} />
      ))}
    </div>
  );
}
