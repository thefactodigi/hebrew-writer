// ─────────────────────────────────────────────────────────────────────────────
// מנוע דוח הבעיות: OCR בדפדפן (tesseract.js, נכסים באחסון עצמי) + בדיקות:
// טקסט שחורג מהאזור הבטוח, טקסט חתוך בקצה, טקסט קטן מכדי להיקרא בגודל
// התצוגה האמיתי, וחשדות לשגיאות כתיב מול מילון תדירויות עברי/אנגלי.
// הכל רץ מקומית בדפדפן — שום קובץ לא עוזב את המחשב.
// ─────────────────────────────────────────────────────────────────────────────

import { createWorker, OEM, type Worker } from 'tesseract.js';
import type { PlacementSpec } from '../specs/specs.ts';
import type { CreativeFile } from '../store/session.ts';

export interface OcrWord {
  text: string;
  conf: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type IssueCategory = 'safe-zone' | 'cutoff' | 'small-text' | 'spelling';

export interface FileIssue {
  category: IssueCategory;
  level: 'error' | 'warn';
  fileId: string;
  fileName: string;
  /** שם הפלייסמנט הרלוונטי (אם רלוונטי) */
  placement?: string;
  message: string;
}

/** רף ביטחון: מיקום (אזור בטוח/חיתוך) סלחני יותר מכתיב */
const CONF_POSITION = 55;
const CONF_SPELLING = 70;
/** גובה טקסט מינימלי בפיקסלים של תצוגה אמיתית */
const MIN_READABLE_PX = 10;

// ── OCR ─────────────────────────────────────────────────────────────────────
let workerPromise: Promise<Worker> | null = null;
const ocrCache = new Map<string, OcrWord[]>();

function assetUrl(path: string): string {
  return new URL(path, document.baseURI).href;
}

async function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker(['heb', 'eng'], OEM.LSTM_ONLY, {
    workerPath: assetUrl('ocr/worker.min.js'),
    corePath: assetUrl('ocr/'),
    langPath: assetUrl('ocr/'),
    gzip: true,
  });
  return workerPromise;
}

interface TessWordNode {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export async function ocrFile(file: CreativeFile): Promise<OcrWord[]> {
  const cached = ocrCache.get(file.id);
  if (cached) return cached;
  const worker = await getWorker();
  const { data } = await worker.recognize(file.blob, {}, { blocks: true });
  const words: OcrWord[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        for (const w of (line.words ?? []) as TessWordNode[]) {
          const text = w.text.trim();
          if (!text) continue;
          words.push({ text, conf: w.confidence, x0: w.bbox.x0, y0: w.bbox.y0, x1: w.bbox.x1, y1: w.bbox.y1 });
        }
      }
    }
  }
  ocrCache.set(file.id, words);
  return words;
}

export function clearOcrCache(fileId?: string) {
  if (fileId) ocrCache.delete(fileId);
  else ocrCache.clear();
}

// ── מילונים ─────────────────────────────────────────────────────────────────
let dictsPromise: Promise<{ he: Set<string>; en: Set<string> }> | null = null;

async function loadDicts() {
  dictsPromise ??= (async () => {
    const load = async (p: string) => {
      const res = await fetch(assetUrl(p));
      if (!res.ok) throw new Error(`dict fetch failed: ${p}`);
      return new Set((await res.text()).split('\n').map((w) => w.trim()).filter(Boolean));
    };
    const [he, en] = await Promise.all([load('dict/he.txt'), load('dict/en.txt')]);
    return { he, en };
  })();
  return dictsPromise;
}

const HEBREW_WORD = /^[א-ת]+$/;
const ENGLISH_WORD = /^[a-zA-Z]+$/;
/** אותיות שימוש שמצטרפות כתחילית: ו,ה,ש,ב,כ,ל,מ */
const HE_PREFIX = /^[והשבכלמ]/;

function stripPunct(word: string): string {
  return word.replace(/^[^א-תa-zA-Z0-9]+|[^א-תa-zA-Z0-9]+$/g, '').replace(/["'׳״]/g, '');
}

/** בדיקת מילה עברית עם קילוף עד 3 אותיות שימוש */
function knownHebrew(word: string, dict: Set<string>): boolean {
  let w = word;
  for (let i = 0; i < 4; i++) {
    if (dict.has(w)) return true;
    if (i < 3 && w.length > 2 && HE_PREFIX.test(w)) w = w.slice(1);
    else break;
  }
  return false;
}

// ── בדיקות ──────────────────────────────────────────────────────────────────
export interface AssignmentForAnalysis {
  spec: PlacementSpec;
  retina: number;
}

function overlapRatio(w: OcrWord, x0: number, y0: number, x1: number, y1: number): number {
  const ix = Math.max(0, Math.min(w.x1, x1) - Math.max(w.x0, x0));
  const iy = Math.max(0, Math.min(w.y1, y1) - Math.max(w.y0, y0));
  const area = (w.x1 - w.x0) * (w.y1 - w.y0);
  return area > 0 ? (ix * iy) / area : 0;
}

/** כמה פיקסלים על המסך האמיתי שווה פיקסל אחד של הקובץ בפלייסמנט הזה */
function renderFactor(file: CreativeFile, a: AssignmentForAnalysis): number {
  if (a.spec.matchType === 'exact') return 1 / a.retina;
  if (a.spec.typicalRenderWidth) return a.spec.typicalRenderWidth / file.width;
  return 1;
}

export async function analyzeFile(
  file: CreativeFile,
  assignments: AssignmentForAnalysis[],
  words: OcrWord[],
): Promise<FileIssue[]> {
  const issues: FileIssue[] = [];
  const W = file.width;
  const H = file.height;

  const meaningful = words.filter((w) => stripPunct(w.text).length >= 2);

  // 1. יציאה מהאזור הבטוח — לכל פלייסמנט משויך עם safeArea
  for (const a of assignments) {
    const sa = a.spec.safeArea;
    if (!sa) continue;
    const sx0 = (sa.left ?? 0) * W;
    const sy0 = (sa.top ?? 0) * H;
    const sx1 = W - (sa.right ?? 0) * W;
    const sy1 = H - (sa.bottom ?? 0) * H;
    const offenders = meaningful.filter(
      (w) => w.conf >= CONF_POSITION && overlapRatio(w, sx0, sy0, sx1, sy1) < 0.6,
    );
    if (offenders.length) {
      // סטוריז/PMax: הפלטפורמה באמת מכסה או חותכת שם — שגיאה.
      // באנרים/פיד: שוליים מומלצים בלבד — אזהרה.
      const hard = a.spec.platform === 'pmax' || a.spec.mockup === 'phone-story';
      const sample = offenders.slice(0, 4).map((w) => `"${stripPunct(w.text)}"`).join(', ');
      issues.push({
        category: 'safe-zone',
        level: hard ? 'error' : 'warn',
        fileId: file.id,
        fileName: file.name,
        placement: a.spec.name,
        message: `${offenders.length} מילים מחוץ לאזור הבטוח (${sample}${offenders.length > 4 ? '…' : ''})`,
      });
    }
  }

  // 2. טקסט חתוך בקצה הקובץ (עד 1.5% מהמידה הקטנה נחשב "צמוד לקצה")
  const edge = Math.max(3, Math.round(Math.min(W, H) * 0.015));
  const clipped = meaningful.filter(
    (w) => w.conf >= CONF_POSITION && (w.x0 <= edge || w.y0 <= edge || w.x1 >= W - edge || w.y1 >= H - edge),
  );
  if (clipped.length) {
    const sample = clipped.slice(0, 3).map((w) => `"${stripPunct(w.text)}"`).join(', ');
    issues.push({
      category: 'cutoff',
      level: 'error',
      fileId: file.id,
      fileName: file.name,
      message: `טקסט צמוד/חתוך בקצה הקובץ: ${sample}`,
    });
  }

  // 3. טקסט קטן מכדי להיקרא בגודל התצוגה האמיתי
  for (const a of assignments) {
    const f = renderFactor(file, a);
    const tiny = meaningful.filter((w) => {
      const h = (w.y1 - w.y0) * f;
      return w.conf >= CONF_POSITION && h > 2 && h < MIN_READABLE_PX && stripPunct(w.text).length >= 3;
    });
    if (tiny.length >= 2) {
      const minH = Math.round(Math.min(...tiny.map((w) => (w.y1 - w.y0) * f)));
      issues.push({
        category: 'small-text',
        level: 'warn',
        fileId: file.id,
        fileName: file.name,
        placement: a.spec.name,
        message: `${tiny.length} מילים בגובה ${minH}px~ בתצוגה בפועל — כנראה לא קריא`,
      });
    }
  }

  // 4. חשדות לשגיאות כתיב (מסומן כחשד — OCR עלול לטעות בעצמו)
  try {
    const dicts = await loadDicts();
    const suspects = new Set<string>();
    for (const w of words) {
      if (w.conf < CONF_SPELLING) continue;
      const t = stripPunct(w.text);
      if (t.length < 3) continue;
      if (HEBREW_WORD.test(t)) {
        if (!knownHebrew(t, dicts.he)) suspects.add(t);
      } else if (ENGLISH_WORD.test(t) && t.length >= 4) {
        if (!dicts.en.has(t.toLowerCase())) suspects.add(t);
      }
    }
    if (suspects.size) {
      issues.push({
        category: 'spelling',
        level: 'warn',
        fileId: file.id,
        fileName: file.name,
        message: `מילים לבדיקה (לא נמצאו במילון): ${[...suspects].slice(0, 8).join(', ')}${suspects.size > 8 ? '…' : ''}`,
      });
    }
  } catch {
    /* מילון לא נטען — מדלגים על בדיקת כתיב */
  }

  return issues;
}
