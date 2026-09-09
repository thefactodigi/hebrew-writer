// ─────────────────────────────────────────────────────────────────────────────
// גזירת מבנה התצוגה מה-state: פלטפורמות → קבוצות → התאמות,
// אזור "לא משויך" ורשימת "מה חסר".
// ─────────────────────────────────────────────────────────────────────────────

import { SPECS, PLATFORM_ORDER, type PlacementSpec, type Platform } from '../specs/specs.ts';
import { validateAgainstSpec, type CreativeWarning } from '../engine/validators.ts';
import {
  assignmentKey,
  computeMatches,
  computeVersionTags,
  type CreativeFile,
  type MockupMode,
} from './session.ts';

export interface AssignmentView {
  key: string;
  file: CreativeFile;
  spec: PlacementSpec;
  retina: 1 | 2 | 3;
  hidden: boolean;
  warnings: CreativeWarning[];
  versionTag?: string;
  mockupMode: MockupMode;
}

export interface GroupView {
  key: string; // `${platform}|${group}`
  platform: Platform;
  group: string;
  items: AssignmentView[];
}

export interface PlatformView {
  platform: Platform;
  groups: GroupView[];
  visibleCount: number;
}

export interface BoardView {
  platforms: PlatformView[];
  unassigned: CreativeFile[];
  missing: PlacementSpec[];
}

interface DeriveInput {
  files: CreativeFile[];
  manualAdds: { fileId: string; specId: string; retina: 1 | 2 | 3; source: 'auto' | 'manual' }[];
  manualRemoves: string[];
  hiddenAssignments: string[];
  mockupModes: Record<string, MockupMode>;
  groupOrder: string[];
}

const specIndex = new Map(SPECS.map((s, i) => [s.id, i]));

export function deriveBoard(state: DeriveInput): BoardView {
  const matches = computeMatches(state);
  const tags = computeVersionTags(state.files);
  const fileById = new Map(state.files.map((f) => [f.id, f]));

  const byGroup = new Map<string, GroupView>();
  const assignedFileIds = new Set<string>();
  const assignedSpecIds = new Set<string>();

  for (const m of matches) {
    const file = fileById.get(m.fileId);
    const spec = SPECS.find((s) => s.id === m.specId);
    if (!file || !spec) continue;
    assignedFileIds.add(file.id);
    assignedSpecIds.add(spec.id);

    const key = assignmentKey(file.id, spec.id);
    const groupKey = `${spec.platform}|${spec.group}`;
    const view: AssignmentView = {
      key,
      file,
      spec,
      retina: m.retina,
      hidden: state.hiddenAssignments.includes(key),
      warnings: validateAgainstSpec(file, spec),
      versionTag: tags[file.id],
      mockupMode: state.mockupModes[key] ?? 'clean',
    };
    const group = byGroup.get(groupKey) ?? { key: groupKey, platform: spec.platform, group: spec.group, items: [] };
    group.items.push(view);
    byGroup.set(groupKey, group);
  }

  // מיון בתוך קבוצה לפי סדר המפרטים ואז לפי תג גרסה
  for (const g of byGroup.values()) {
    g.items.sort((a, b) => {
      const d = (specIndex.get(a.spec.id) ?? 0) - (specIndex.get(b.spec.id) ?? 0);
      return d !== 0 ? d : (a.versionTag ?? '').localeCompare(b.versionTag ?? '');
    });
  }

  // סדר קבוצות: קודם הסדר הידני, אחר כך סדר ברירת המחדל מהמפרטים
  const defaultOrder: string[] = [];
  for (const s of SPECS) {
    const k = `${s.platform}|${s.group}`;
    if (!defaultOrder.includes(k)) defaultOrder.push(k);
  }
  const orderedKeys = [
    ...state.groupOrder.filter((k) => byGroup.has(k)),
    ...defaultOrder.filter((k) => byGroup.has(k) && !state.groupOrder.includes(k)),
  ];

  const platforms: PlatformView[] = PLATFORM_ORDER.map((platform) => {
    const groups = orderedKeys
      .filter((k) => byGroup.get(k)!.platform === platform)
      .map((k) => byGroup.get(k)!);
    const visibleCount = groups.reduce((n, g) => n + g.items.filter((i) => !i.hidden).length, 0);
    return { platform, groups, visibleCount };
  }).filter((p) => p.groups.length > 0);

  const unassigned = state.files.filter((f) => !assignedFileIds.has(f.id));
  const missing = SPECS.filter((s) => !assignedSpecIds.has(s.id));

  return { platforms, unassigned, missing };
}
