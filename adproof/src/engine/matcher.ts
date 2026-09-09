// ─────────────────────────────────────────────────────────────────────────────
// Matching Engine — פונקציות טהורות בלבד, בלי תלות ב-DOM או ב-store.
// סדר השיוך: exact → retina x2/x3 → ratio (עם טולרנס ומינימום פיקסלים).
// קובץ אחד יכול להשתייך לכמה פלטפורמות במקביל — זה הכלל, לא החריג.
// ─────────────────────────────────────────────────────────────────────────────

import type { ImageFormat, PlacementSpec } from '../specs/specs.ts';
import { SPECS, RATIO_TOLERANCE, PMAX_LOGO_MAX_PX } from '../specs/specs.ts';

export interface FileMeta {
  id: string;
  width: number;
  height: number;
  format: ImageFormat;
}

export interface Match {
  fileId: string;
  specId: string;
  /** 1 = מידה מלאה, 2/3 = קובץ רטינה שמוצג בגודל הסלוט */
  retina: 1 | 2 | 3;
  source: 'auto' | 'manual';
}

export interface NearestSuggestion {
  spec: PlacementSpec;
  /** מרחק יחסי — קטן יותר = קרוב יותר */
  distance: number;
}

const RETINA_FACTORS: Array<2 | 3> = [2, 3];

/** התאמות exact: פיקסלים 1:1 או כפולת רטינה מדויקת x2/x3 */
export function matchExact(file: FileMeta, specs: PlacementSpec[] = SPECS): Match[] {
  const out: Match[] = [];
  for (const spec of specs) {
    if (spec.matchType !== 'exact') continue;
    if (file.width === spec.width && file.height === spec.height) {
      out.push({ fileId: file.id, specId: spec.id, retina: 1, source: 'auto' });
      continue;
    }
    for (const f of RETINA_FACTORS) {
      if (file.width === spec.width * f && file.height === spec.height * f) {
        out.push({ fileId: file.id, specId: spec.id, retina: f, source: 'auto' });
        break;
      }
    }
  }
  return out;
}

/** האם היחס של הקובץ תואם ליחס המפרט בטולרנס הנתון */
export function ratioMatches(
  fileW: number,
  fileH: number,
  specW: number,
  specH: number,
  tolerance: number = RATIO_TOLERANCE,
): boolean {
  const fileRatio = fileW / fileH;
  const specRatio = specW / specH;
  return Math.abs(fileRatio - specRatio) / specRatio <= tolerance;
}

/**
 * התאמות ratio: יחס בטולרנס + עמידה במינימום פיקסלים.
 * הבחנת PMax בין Square Image ל-Square Logo (שניהם 1:1):
 * קובץ עד PMAX_LOGO_MAX_PX מסווג כלוגו, מעליו כתמונה.
 */
export function matchRatio(file: FileMeta, specs: PlacementSpec[] = SPECS): Match[] {
  const out: Match[] = [];
  for (const spec of specs) {
    if (spec.matchType !== 'ratio') continue;
    if (!ratioMatches(file.width, file.height, spec.width, spec.height)) continue;
    if (spec.minWidth && file.width < spec.minWidth) continue;
    if (spec.minHeight && file.height < spec.minHeight) continue;
    // הבחנת לוגו/תמונה ב-PMax עבור יחס 1:1
    if (spec.platform === 'pmax' && ratioMatches(spec.width, spec.height, 1, 1)) {
      const isSmall = Math.max(file.width, file.height) <= PMAX_LOGO_MAX_PX;
      if (spec.isLogo && !isSmall) continue;
      if (!spec.isLogo && isSmall) continue;
    }
    out.push({ fileId: file.id, specId: spec.id, retina: 1, source: 'auto' });
  }
  return out;
}

/** שיוך מלא של קובץ אחד: exact + retina + ratio, בכל הפלטפורמות במקביל */
export function matchFile(file: FileMeta, specs: PlacementSpec[] = SPECS): Match[] {
  return [...matchExact(file, specs), ...matchRatio(file, specs)];
}

/** שיוך של אוסף קבצים */
export function matchAll(files: FileMeta[], specs: PlacementSpec[] = SPECS): Match[] {
  return files.flatMap((f) => matchFile(f, specs));
}

/**
 * הצעת הסלוט הקרוב ביותר לקובץ לא משויך (לאזור "לא משויך").
 * מרחק = שילוב של סטיית יחס וסטיית שטח.
 */
export function nearestSpec(
  file: Pick<FileMeta, 'width' | 'height'>,
  specs: PlacementSpec[] = SPECS,
): NearestSuggestion | null {
  let best: NearestSuggestion | null = null;
  const fileRatio = file.width / file.height;
  const fileArea = file.width * file.height;
  for (const spec of specs) {
    const ratioDiff = Math.abs(fileRatio - spec.width / spec.height) / (spec.width / spec.height);
    const areaDiff = Math.abs(fileArea - spec.width * spec.height) / (spec.width * spec.height);
    const distance = ratioDiff * 3 + Math.min(areaDiff, 2);
    if (!best || distance < best.distance) best = { spec, distance };
  }
  return best;
}

/**
 * תיוג כפילויות: קבצים באותה מידה בדיוק מקבלים "גרסה A / גרסה B" לפי סדר העלאה.
 * מחזיר מיפוי fileId → תג גרסה (רק כשיש יותר מקובץ אחד באותה מידה).
 */
export function versionTags(files: Array<Pick<FileMeta, 'id' | 'width' | 'height'>>): Record<string, string> {
  const byDim = new Map<string, string[]>();
  for (const f of files) {
    const key = `${f.width}x${f.height}`;
    const list = byDim.get(key) ?? [];
    list.push(f.id);
    byDim.set(key, list);
  }
  const tags: Record<string, string> = {};
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (const ids of byDim.values()) {
    if (ids.length < 2) continue;
    ids.forEach((id, i) => {
      tags[id] = `גרסה ${letters[i % letters.length]}`;
    });
  }
  return tags;
}
