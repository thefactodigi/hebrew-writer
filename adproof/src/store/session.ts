// ─────────────────────────────────────────────────────────────────────────────
// Session store — Zustand + התמדה ל-IndexedDB (כולל ה-Blobs עצמם).
// רענון דף משחזר את הסשן במלואו.
// ─────────────────────────────────────────────────────────────────────────────

import { create } from 'zustand';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import { matchAll, versionTags, type Match, type FileMeta } from '../engine/matcher.ts';
import type { ViewMode } from '../engine/scale.ts';
import type { ImageFormat } from '../specs/specs.ts';

export interface CreativeFile {
  id: string;
  name: string;
  mime: string;
  format: ImageFormat;
  width: number;
  height: number;
  sizeKb: number;
  /** תוכן הקובץ — נשמר ב-IndexedDB */
  blob: Blob;
  /** object URL לזמן ריצה בלבד */
  url: string;
  animated: boolean;
}

export type MockupMode = 'clean' | 'context';

/** מפתח שיוך יחיד: קובץ + סלוט */
export const assignmentKey = (fileId: string, specId: string) => `${fileId}::${specId}`;

interface SessionState {
  loaded: boolean;
  campaignName: string;
  clientName: string;
  files: CreativeFile[];
  /** שיוכים ידניים שנוספו בגרירה */
  manualAdds: Match[];
  /** שיוכים אוטומטיים שהוסרו בגרירה החוצה */
  manualRemoves: string[]; // assignmentKey
  /** התאמות מוסתרות (כפתור עין) — לא בתצוגה ולא ב-PDF */
  hiddenAssignments: string[]; // assignmentKey
  /** מצב מוקאפ פר-התאמה */
  mockupModes: Record<string, MockupMode>; // assignmentKey → mode
  /** סדר קבוצות ידני: מפתח "platform|group" לפי סדר תצוגה */
  groupOrder: string[];
  /** smart = קנה מידה חכם; actual = הגודל שבו הפלייסמנט באמת נראה בפלטפורמה */
  viewMode: ViewMode;
  /** הצגת אזורים בטוחים על ההתאמות (מצב עבודה בלבד, לא ב-PDF) */
  showSafeZones: boolean;

  setCampaignName: (v: string) => void;
  setClientName: (v: string) => void;
  addFiles: (files: CreativeFile[]) => void;
  removeFile: (fileId: string) => void;
  toggleHidden: (fileId: string, specId: string) => void;
  setMockupMode: (fileId: string, specId: string, mode: MockupMode) => void;
  /** החלת מצב מוקאפ על כל ההתאמות בבת אחת */
  setAllMockupModes: (keys: string[], mode: MockupMode) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowSafeZones: (v: boolean) => void;
  addManualAssignment: (fileId: string, specId: string) => void;
  removeAssignment: (fileId: string, specId: string) => void;
  moveAssignment: (fileId: string, fromSpecId: string | null, toSpecId: string) => void;
  setGroupOrder: (order: string[]) => void;
  resetSession: () => void;
  loadFromDb: () => Promise<void>;
}

const DB_KEY = 'adproof-session-v1';

interface PersistedFile {
  id: string;
  name: string;
  mime: string;
  format: ImageFormat;
  width: number;
  height: number;
  sizeKb: number;
  blob: Blob;
  animated: boolean;
}

interface PersistedSession {
  campaignName: string;
  clientName: string;
  files: PersistedFile[];
  manualAdds: Match[];
  manualRemoves: string[];
  hiddenAssignments: string[];
  mockupModes: Record<string, MockupMode>;
  groupOrder: string[];
  viewMode?: ViewMode;
  showSafeZones?: boolean;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist(state: SessionState) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data: PersistedSession = {
      campaignName: state.campaignName,
      clientName: state.clientName,
      files: state.files.map(({ url: _url, ...rest }) => rest),
      manualAdds: state.manualAdds,
      manualRemoves: state.manualRemoves,
      hiddenAssignments: state.hiddenAssignments,
      mockupModes: state.mockupModes,
      groupOrder: state.groupOrder,
      viewMode: state.viewMode,
      showSafeZones: state.showSafeZones,
    };
    void idbSet(DB_KEY, data).catch(() => {
      /* אין חסימה על כשל שמירה — הסשן ממשיך לרוץ בזיכרון */
    });
  }, 400);
}

export const useSession = create<SessionState>((set, get) => {
  const update = (partial: Partial<SessionState>) => {
    set(partial);
    persist(get());
  };

  return {
    loaded: false,
    campaignName: '',
    clientName: '',
    files: [],
    manualAdds: [],
    manualRemoves: [],
    hiddenAssignments: [],
    mockupModes: {},
    groupOrder: [],
    viewMode: 'smart',
    showSafeZones: true,

    setCampaignName: (v) => update({ campaignName: v }),
    setClientName: (v) => update({ clientName: v }),

    addFiles: (files) => update({ files: [...get().files, ...files] }),

    removeFile: (fileId) => {
      const f = get().files.find((x) => x.id === fileId);
      if (f) URL.revokeObjectURL(f.url);
      update({
        files: get().files.filter((x) => x.id !== fileId),
        manualAdds: get().manualAdds.filter((m) => m.fileId !== fileId),
        manualRemoves: get().manualRemoves.filter((k) => !k.startsWith(`${fileId}::`)),
        hiddenAssignments: get().hiddenAssignments.filter((k) => !k.startsWith(`${fileId}::`)),
      });
    },

    toggleHidden: (fileId, specId) => {
      const key = assignmentKey(fileId, specId);
      const cur = get().hiddenAssignments;
      update({
        hiddenAssignments: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
      });
    },

    setMockupMode: (fileId, specId, mode) =>
      update({ mockupModes: { ...get().mockupModes, [assignmentKey(fileId, specId)]: mode } }),

    setAllMockupModes: (keys, mode) =>
      update({
        mockupModes: { ...get().mockupModes, ...Object.fromEntries(keys.map((k) => [k, mode])) },
      }),

    setViewMode: (mode) => update({ viewMode: mode }),

    setShowSafeZones: (v) => update({ showSafeZones: v }),

    addManualAssignment: (fileId, specId) => {
      const key = assignmentKey(fileId, specId);
      update({
        manualRemoves: get().manualRemoves.filter((k) => k !== key),
        manualAdds: get().manualAdds.some((m) => m.fileId === fileId && m.specId === specId)
          ? get().manualAdds
          : [...get().manualAdds, { fileId, specId, retina: 1, source: 'manual' }],
      });
    },

    removeAssignment: (fileId, specId) => {
      const key = assignmentKey(fileId, specId);
      update({
        manualAdds: get().manualAdds.filter((m) => !(m.fileId === fileId && m.specId === specId)),
        manualRemoves: get().manualRemoves.includes(key)
          ? get().manualRemoves
          : [...get().manualRemoves, key],
      });
    },

    moveAssignment: (fileId, fromSpecId, toSpecId) => {
      if (fromSpecId === toSpecId) return;
      const s = get();
      if (fromSpecId) s.removeAssignment(fileId, fromSpecId);
      get().addManualAssignment(fileId, toSpecId);
    },

    setGroupOrder: (order) => update({ groupOrder: order }),

    resetSession: () => {
      for (const f of get().files) URL.revokeObjectURL(f.url);
      void idbDel(DB_KEY);
      set({
        campaignName: '',
        clientName: '',
        files: [],
        manualAdds: [],
        manualRemoves: [],
        hiddenAssignments: [],
        mockupModes: {},
        groupOrder: [],
        viewMode: 'smart',
        showSafeZones: true,
      });
    },

    loadFromDb: async () => {
      try {
        const data = (await idbGet(DB_KEY)) as PersistedSession | undefined;
        if (data) {
          set({
            campaignName: data.campaignName,
            clientName: data.clientName,
            files: data.files.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) })),
            manualAdds: data.manualAdds,
            manualRemoves: data.manualRemoves,
            hiddenAssignments: data.hiddenAssignments,
            mockupModes: data.mockupModes ?? {},
            groupOrder: data.groupOrder ?? [],
            viewMode: data.viewMode ?? 'smart',
            showSafeZones: data.showSafeZones ?? true,
            loaded: true,
          });
          return;
        }
      } catch {
        /* IndexedDB לא זמין — ממשיכים עם סשן ריק בזיכרון */
      }
      set({ loaded: true });
    },
  };
});

/** כל השיוכים בפועל: אוטומטיים (פחות הסרות ידניות) + ידניים */
export function computeMatches(state: Pick<SessionState, 'files' | 'manualAdds' | 'manualRemoves'>): Match[] {
  const metas: FileMeta[] = state.files.map((f) => ({
    id: f.id,
    width: f.width,
    height: f.height,
    format: f.format,
  }));
  const auto = matchAll(metas).filter(
    (m) => !state.manualRemoves.includes(assignmentKey(m.fileId, m.specId)),
  );
  const autoKeys = new Set(auto.map((m) => assignmentKey(m.fileId, m.specId)));
  const manual = state.manualAdds.filter((m) => !autoKeys.has(assignmentKey(m.fileId, m.specId)));
  return [...auto, ...manual];
}

/** תגי גרסה A/B לקבצים כפולים באותה מידה */
export function computeVersionTags(files: CreativeFile[]): Record<string, string> {
  return versionTags(files);
}
