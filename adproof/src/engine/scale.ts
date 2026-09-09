// ─────────────────────────────────────────────────────────────────────────────
// קנה מידה חכם לתצוגה (סעיף 5.2):
// - פרופורציות אמת תמיד, בלי מתיחה ובלי חיתוך.
// - הצד הקצר לא יורד מ-140px על המסך.
// - באנרים צרים וארוכים (יחס > 5) מוצגים ברוחב השורה.
// - באנרים קטנים מוצגים ב-100% אמיתי.
// ─────────────────────────────────────────────────────────────────────────────

export const MIN_SHORT_SIDE = 140;
export const MAX_CARD_DIM = 420;
export const WIDE_ROW_WIDTH = 920;

export interface DisplaySize {
  width: number;
  height: number;
  /** 0..1 — אחוז התצוגה ביחס לגודל האמיתי של הסלוט */
  scale: number;
  /** באנר רחב שתופס שורה מלאה */
  fullRow: boolean;
  /** מוצג בגודל שבו הפלייסמנט באמת נראה בפלטפורמה */
  platformSize?: boolean;
}

export type ViewMode = 'smart' | 'actual';

/**
 * מצב "גודל אמיתי": התאמה מוצגת בגודל שבו היא באמת נראית בפלטפורמה.
 * לסלוטים exact זה 100% פיקסלים; לנכסי ratio זה רוחב הרינדור במכשיר
 * (typicalRenderWidth) — קובץ 1080×1920 מוצג בפועל על מסך של ~375px.
 */
export function actualSize(
  slotW: number,
  slotH: number,
  typicalRenderWidth: number | undefined,
  rowWidth: number = WIDE_ROW_WIDTH,
): DisplaySize {
  const targetW = Math.min(typicalRenderWidth ?? slotW, rowWidth);
  const scale = targetW / slotW;
  return {
    width: slotW * scale,
    height: slotH * scale,
    scale,
    fullRow: slotW / slotH > 5 && targetW > rowWidth * 0.8,
    platformSize: true,
  };
}

/**
 * גודל התצוגה של סלוט (slotW×slotH הן מידות הסלוט, לא של קובץ רטינה).
 * rowWidth — רוחב השורה הזמין בפועל (לבאנרים רחבים).
 */
export function displaySize(slotW: number, slotH: number, rowWidth: number = WIDE_ROW_WIDTH): DisplaySize {
  const aspect = slotW / slotH;
  const shortSide = Math.min(slotW, slotH);
  const longSide = Math.max(slotW, slotH);

  // באנרים קטנים — גודל אמיתי 100%
  if (slotW <= 480 && slotH <= 120) {
    return { width: slotW, height: slotH, scale: 1, fullRow: false };
  }

  // באנרים צרים וארוכים — רוחב שורה מלא
  if (aspect > 5) {
    const scale = Math.min(1, rowWidth / slotW);
    return { width: slotW * scale, height: slotH * scale, scale, fullRow: true };
  }

  // ברירת מחדל: להכניס לכרטיס, בלי לרדת מתחת ל-140px בצד הקצר
  let scale = Math.min(1, MAX_CARD_DIM / longSide);
  if (shortSide * scale < MIN_SHORT_SIDE) {
    scale = Math.min(1, MIN_SHORT_SIDE / shortSide);
  }
  return { width: slotW * scale, height: slotH * scale, scale, fullRow: false };
}

export function scaleLabel(scale: number): string {
  return `מוצג ב-${Math.round(scale * 100)}%`;
}
