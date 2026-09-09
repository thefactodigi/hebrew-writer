// ─────────────────────────────────────────────────────────────────────────────
// מוקאפים וקטוריים ל-PDF — מקבילה של MockupFrame בציור pdf-lib:
// שלד אתר (עליון / סייד-בר / בתוך תוכן), טלפון (באנר תחתון / אינטרסטישל),
// סטורי עם Shop Now, וכרטיס פיד. גנרי לחלוטין, קווי מתאר בלבד.
// התמונה עצמה מוטמעת ברזולוציית מקור — המוקאפ רק מצויר סביבה.
// ─────────────────────────────────────────────────────────────────────────────

import { rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { PlacementSpec } from '../specs/specs.ts';

const GRAY_9 = rgb(0.11, 0.12, 0.13);
const GRAY_6 = rgb(0.55, 0.57, 0.6);
const GRAY_3 = rgb(0.78, 0.8, 0.82);
const GRAY_2 = rgb(0.88, 0.89, 0.9);
const GRAY_1 = rgb(0.94, 0.94, 0.95);
const WHITE = rgb(1, 1, 1);

export interface MockupCtx {
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
}

/** מצייר את התמונה בריבוע שהמוקאפ מקצה לה (x, yBottom, w, h בנקודות PDF) */
export type ImagePainter = (x: number, yBottom: number, w: number, h: number) => void;

export interface MockupPlan {
  /** מידות הקופסה הכוללת של המוקאפ (pt) */
  w: number;
  h: number;
  /** ציור המוקאפ; קורא ל-img במקום ובשכבה הנכונים */
  draw(ctx: MockupCtx, x: number, yTop: number, img: ImagePainter): void;
}

// ── עזרי ציור ────────────────────────────────────────────────────────────────
function rect(page: PDFPage, x: number, y: number, w: number, h: number, color = GRAY_1) {
  page.drawRectangle({ x, y, width: w, height: h, color });
}

function frame(page: PDFPage, x: number, y: number, w: number, h: number, borderColor = GRAY_3, borderWidth = 0.8) {
  page.drawRectangle({ x, y, width: w, height: h, borderColor, borderWidth, color: WHITE });
}

/** n שורות טקסט אפורות; האחרונה 70% רוחב */
function textLines(page: PDFPage, x: number, yTop: number, w: number, n: number, gap = 8, lh = 4) {
  for (let i = 0; i < n; i++) {
    rect(page, x, yTop - lh - i * gap, w * (i === n - 1 ? 0.7 : 1), lh, GRAY_2);
  }
}

/** פס דפדפן: שלוש נקודות + שורת כתובת */
function browserChrome(page: PDFPage, x: number, yTop: number, w: number): number {
  const h = 14;
  rect(page, x, yTop - h, w, h, GRAY_1);
  for (let i = 0; i < 3; i++) {
    page.drawCircle({ x: x + 8 + i * 8, y: yTop - h / 2, size: 2, color: GRAY_3 });
  }
  rect(page, x + 32, yTop - h + 4, w - 40, 6, WHITE);
  return h;
}

/** סלוט מודעה: מסגרת + תג Ad קטן; מחזיר את מצייר התוכן */
function adSlot(ctx: MockupCtx, x: number, yBottom: number, w: number, h: number, img: ImagePainter) {
  img(x, yBottom, w, h);
  ctx.page.drawRectangle({ x: x - 0.5, y: yBottom - 0.5, width: w + 1, height: h + 1, borderColor: GRAY_3, borderWidth: 0.5 });
  rect(ctx.page, x, yBottom + h - 6, 10, 6, rgb(0.35, 0.37, 0.4));
  ctx.page.drawText('Ad', { x: x + 1.5, y: yBottom + h - 5, size: 4.5, font: ctx.font, color: WHITE });
}

/** מסגרת טלפון: מחזירה את גבולות המסך הפנימי */
function phone(page: PDFPage, x: number, yTop: number, screenW: number, screenH: number) {
  const B = 5;
  page.drawRectangle({ x, y: yTop - screenH - B * 2, width: screenW + B * 2, height: screenH + B * 2, color: rgb(0.15, 0.16, 0.18) });
  rect(page, x + B, yTop - B - screenH, screenW, screenH, WHITE);
  // חריץ עליון
  rect(page, x + B + screenW / 2 - 12, yTop - B - 5, 24, 3, rgb(0.15, 0.16, 0.18));
  return { sx: x + B, syTop: yTop - B, screenW, screenH };
}

// ── פריסות ──────────────────────────────────────────────────────────────────

function websiteTop(dw: number, dh: number): MockupPlan {
  const w = Math.max(dw + 32, 260);
  const pad = 10;
  const h = 14 + 16 + pad + dh + pad + 8 + 24 + pad;
  return {
    w,
    h,
    draw(ctx, x, yTop, img) {
      frame(ctx.page, x, yTop - h, w, h);
      let cy = yTop - browserChrome(ctx.page, x, yTop, w);
      // ניווט
      rect(ctx.page, x + 8, cy - 12, 34, 7, GRAY_3);
      for (let i = 0; i < 3; i++) rect(ctx.page, x + 50 + i * 26, cy - 11, 18, 5, GRAY_2);
      cy -= 16 + pad;
      adSlot(ctx, x + (w - dw) / 2, cy - dh, dw, dh, img);
      cy -= dh + pad;
      rect(ctx.page, x + 8, cy - 7, w * 0.55, 7, GRAY_2);
      textLines(ctx.page, x + 8, cy - 12, w - 16, 2);
    },
  };
}

function websiteSidebar(dw: number, dh: number): MockupPlan {
  const contentW = 170;
  const pad = 10;
  const w = dw + contentW + pad * 3;
  const h = 14 + pad + Math.max(dh, 120) + pad;
  return {
    w,
    h,
    draw(ctx, x, yTop, img) {
      frame(ctx.page, x, yTop - h, w, h);
      const cy = yTop - browserChrome(ctx.page, x, yTop, w) - pad;
      // טור תוכן משמאל, מודעה מימין (כמו במסך)
      rect(ctx.page, x + pad, cy - 8, contentW * 0.8, 8, GRAY_2);
      textLines(ctx.page, x + pad, cy - 14, contentW, 3);
      rect(ctx.page, x + pad, cy - 62, contentW, 28, GRAY_1);
      textLines(ctx.page, x + pad, cy - 96, contentW, Math.max(3, Math.floor((dh - 100) / 22)));
      adSlot(ctx, x + w - pad - dw, cy - dh, dw, dh, img);
    },
  };
}

function websiteInline(dw: number, dh: number): MockupPlan {
  const sideW = 150;
  const pad = 10;
  const w = Math.max(dw + sideW + pad * 3, 300);
  const h = 14 + pad + 12 + dh + pad + 14;
  return {
    w,
    h,
    draw(ctx, x, yTop, img) {
      frame(ctx.page, x, yTop - h, w, h);
      let cy = yTop - browserChrome(ctx.page, x, yTop, w) - pad;
      rect(ctx.page, x + pad, cy - 7, w * 0.6, 7, GRAY_2);
      cy -= 14;
      adSlot(ctx, x + pad, cy - dh, dw, dh, img);
      textLines(ctx.page, x + pad * 2 + dw, cy - 4, w - dw - pad * 3, Math.max(3, Math.floor(dh / 16)), 10);
      textLines(ctx.page, x + pad, cy - dh - 6, w - pad * 2, 1);
    },
  };
}

function phoneBottomBanner(dw: number, dh: number): MockupPlan {
  const screenW = Math.max(dw + 10, 200);
  const screenH = 190 + dh;
  return {
    w: screenW + 10,
    h: screenH + 10,
    draw(ctx, x, yTop, img) {
      const { sx, syTop } = phone(ctx.page, x, yTop, screenW, screenH);
      rect(ctx.page, sx + 8, syTop - 22, screenW * 0.6, 7, GRAY_2);
      textLines(ctx.page, sx + 8, syTop - 32, screenW - 16, 3);
      rect(ctx.page, sx + 8, syTop - 100, screenW - 16, 26, GRAY_1);
      textLines(ctx.page, sx + 8, syTop - 108, screenW - 16, 2);
      // באנר צמוד תחתית
      const by = syTop - screenH;
      rect(ctx.page, sx, by, screenW, dh + 6, GRAY_1);
      adSlot(ctx, sx + (screenW - dw) / 2, by + 3, dw, dh, img);
    },
  };
}

function phoneInterstitial(dw: number, dh: number): MockupPlan {
  const screenW = Math.max(dw + 20, 210);
  const screenH = Math.max(dh + 50, 280);
  return {
    w: screenW + 10,
    h: screenH + 10,
    draw(ctx, x, yTop, img) {
      const { sx, syTop } = phone(ctx.page, x, yTop, screenW, screenH);
      // תוכן מעומעם
      rect(ctx.page, sx + 8, syTop - 20, screenW * 0.6, 6, GRAY_1);
      textLines(ctx.page, sx + 8, syTop - 28, screenW - 16, 4, 8, 3);
      // שכבת כהות
      ctx.page.drawRectangle({ x: sx, y: syTop - screenH, width: screenW, height: screenH, color: rgb(0, 0, 0), opacity: 0.45 });
      const ix = sx + (screenW - dw) / 2;
      const iy = syTop - (screenH - dh) / 2 - dh;
      img(ix, iy, dw, dh);
      // כפתור סגירה
      ctx.page.drawCircle({ x: ix + dw + 2, y: iy + dh + 2, size: 5, color: WHITE });
      ctx.page.drawText('x', { x: ix + dw + 0.4, y: iy + dh - 0.2, size: 6, font: ctx.font, color: GRAY_6 });
    },
  };
}

function phoneStory(dw: number, dh: number): MockupPlan {
  return {
    w: dw + 10,
    h: dh + 10,
    draw(ctx, x, yTop, img) {
      const { sx, syTop } = phone(ctx.page, x, yTop, dw, dh);
      img(sx, syTop - dh, dw, dh);
      // UI עליון: פס פרוגרס + פרופיל + "ממומן"
      rect(ctx.page, sx + 6, syTop - 10, dw - 12, 1.5, rgb(1, 1, 1));
      ctx.page.drawCircle({ x: sx + 12, y: syTop - 20, size: 5.5, color: WHITE, opacity: 0.85 });
      ctx.page.drawRectangle({ x: sx + 20, y: syTop - 22, width: 34, height: 4, color: WHITE, opacity: 0.75 });
      ctx.page.drawText('ממומן', { x: sx + 58, y: syTop - 23, size: 5, font: ctx.font, color: WHITE, opacity: 0.9 });
      // תחתון: חץ החלקה + כפתור Shop Now
      const bw = dw * 0.62;
      const bx = sx + (dw - bw) / 2;
      const by = syTop - dh + 10;
      ctx.page.drawText('^', { x: sx + dw / 2 - 2, y: by + 16, size: 7, font: ctx.bold, color: WHITE });
      ctx.page.drawRectangle({ x: bx, y: by, width: bw, height: 14, color: WHITE });
      const label = 'Shop Now';
      const lw = ctx.bold.widthOfTextAtSize(label, 7);
      ctx.page.drawText(label, { x: sx + dw / 2 - lw / 2, y: by + 4.5, size: 7, font: ctx.bold, color: GRAY_9 });
    },
  };
}

function feedCard(dw: number, dh: number): MockupPlan {
  const header = 24;
  const actions = 20;
  const caption = 16;
  const h = header + dh + actions + caption;
  return {
    w: dw + 2,
    h,
    draw(ctx, x, yTop, img) {
      frame(ctx.page, x, yTop - h, dw + 2, h);
      // כותרת: עיגול פרופיל + שורות + "ממומן"
      ctx.page.drawCircle({ x: x + 13, y: yTop - header / 2, size: 7, color: GRAY_2 });
      rect(ctx.page, x + 24, yTop - 10, 46, 4.5, GRAY_2);
      rect(ctx.page, x + 24, yTop - 17, 26, 3.5, GRAY_1);
      ctx.page.drawText('ממומן', { x: x + dw - 24, y: yTop - 14, size: 5, font: ctx.font, color: GRAY_6 });
      img(x + 1, yTop - header - dh, dw, dh);
      // שורת פעולות + כפתור CTA
      const ay = yTop - header - dh - actions / 2;
      for (let i = 0; i < 3; i++) ctx.page.drawCircle({ x: x + 12 + i * 14, y: ay, size: 4, color: WHITE, borderColor: GRAY_3, borderWidth: 1.2 });
      rect(ctx.page, x + dw - 46, ay - 6, 40, 12, GRAY_9);
      // שורות טקסט
      textLines(ctx.page, x + 8, yTop - header - dh - actions - 2, dw - 16, 2, 7, 3.5);
    },
  };
}

/** התאמה בלי מוקאפ: מסגרת דקה בלבד */
function clean(dw: number, dh: number): MockupPlan {
  return {
    w: dw + 2,
    h: dh + 2,
    draw(ctx, x, yTop, img) {
      ctx.page.drawRectangle({ x, y: yTop - dh - 2, width: dw + 2, height: dh + 2, borderColor: GRAY_3, borderWidth: 0.5, color: WHITE });
      img(x + 1, yTop - dh - 1, dw, dh);
    },
  };
}

/** בחירת פריסה לפי המפרט — אותה לוגיקה כמו MockupFrame במסך */
export function planMockup(spec: PlacementSpec, dw: number, dh: number): MockupPlan {
  if (!spec.mockup) return clean(dw, dh);
  if (spec.mockup === 'phone-story') return phoneStory(dw, dh);
  if (spec.mockup === 'feed-card') return feedCard(dw, dh);

  const aspect = spec.width / spec.height;
  if (spec.group === 'Mobile') {
    if (spec.height >= 320 || (aspect > 1 && spec.height >= 300)) return phoneInterstitial(dw, dh);
    return phoneBottomBanner(dw, dh);
  }
  if (aspect >= 3) return websiteTop(dw, dh);
  if (spec.height >= 400 && aspect <= 0.8) return websiteSidebar(dw, dh);
  return websiteInline(dw, dh);
}
