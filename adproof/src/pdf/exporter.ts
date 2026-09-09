// ─────────────────────────────────────────────────────────────────────────────
// ייצוא PDF ממותג: עמוד שער, עמוד(ים) לכל פלטפורמה, הטמעת תמונות
// ברזולוציית המקור המלאה (לא צילום מסך של ה-DOM), פוטר בכל עמוד.
// אזהרות, אזור "לא משויך" והתאמות מוסתרות לא נכנסים למסמך.
// ─────────────────────────────────────────────────────────────────────────────

import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { BoardView, AssignmentView } from '../store/derive.ts';
import type { CreativeFile } from '../store/session.ts';
import { PLATFORM_LABELS } from '../specs/specs.ts';
import { actualSize } from '../engine/scale.ts';
import { planMockup, type MockupPlan } from './mockups.ts';
import { visualRuns } from './bidi.ts';
import heeboRegularUrl from './fonts/Heebo-Regular.ttf';
import heeboBoldUrl from './fonts/Heebo-Bold.ttf';

// ── קבועי עמוד (A4 לרוחב) ────────────────────────────────────────────────────
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 40;
const FOOTER_H = 26;
const CONTENT_W = PAGE_W - MARGIN * 2;
/**
 * המרת פיקסלים לנקודות PDF. ההתאמות מצוירות ב"מידות אמת" יחסיות —
 * באנרים בגודל הסלוט, נכסי Meta/PMax ברוחב הרינדור במכשיר — באותו יחס המרה
 * אחיד, כך שהפרופורציות בין הפלייסמנטים נשמרות כמו בפלטפורמות עצמן.
 */
const PX2PT = 0.62;
const GAP = 14;
const LABEL_H = 13;
/** גובה תוכן מרבי לפריט בעמוד */
const MAX_ITEM_H = PAGE_H - MARGIN * 2 - FOOTER_H - 60;

const GRAY_9 = rgb(0.11, 0.12, 0.13);
const GRAY_5 = rgb(0.45, 0.47, 0.5);
const GRAY_3 = rgb(0.78, 0.8, 0.82);

const TARGET_MAX_BYTES = 25 * 1024 * 1024;
/** תמונות מעל הסף הזה נדחסות ל-JPEG 85 אם המסמך חורג מהיעד */
const BIG_IMAGE_BYTES = 1024 * 1024;

export interface ExportMeta {
  campaignName: string;
  clientName: string;
}

interface Ctx {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  meta: ExportMeta;
  pageNum: number;
}

// ── טקסט עברי: ציור ריצות כיווניות בסדר ויזואלי, ריצה-ריצה ───────────────────
function drawRuns(page: PDFPage, font: PDFFont, text: string, xLeft: number, y: number, size: number, color = GRAY_9) {
  let x = xLeft;
  for (const run of visualRuns(text)) {
    page.drawText(run, { x, y, size, font, color });
    x += font.widthOfTextAtSize(run, size);
  }
}

function textWidth(font: PDFFont, text: string, size: number): number {
  return visualRuns(text).reduce((w, run) => w + font.widthOfTextAtSize(run, size), 0);
}

function drawRtl(page: PDFPage, font: PDFFont, text: string, xRight: number, y: number, size: number, color = GRAY_9) {
  drawRuns(page, font, text, xRight - textWidth(font, text, size), y, size, color);
}

function drawCentered(page: PDFPage, font: PDFFont, text: string, xCenter: number, y: number, size: number, color = GRAY_9) {
  drawRuns(page, font, text, xCenter - textWidth(font, text, size) / 2, y, size, color);
}

// ── הכנת תמונות להטמעה ──────────────────────────────────────────────────────
/** פריים ראשון של GIF (או כל תמונה) כ-PNG bytes דרך canvas */
async function firstFrameAsPng(file: CreativeFile): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file.blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas.toBlob failed'))), 'image/png'),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

/** דחיסת תמונה ל-JPEG איכות 85 (שיטוח שקיפות על רקע לבן) */
async function asJpeg85(file: CreativeFile): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(file.blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas.toBlob failed'))), 'image/jpeg', 0.85),
  );
  return new Uint8Array(await blob.arrayBuffer());
}

interface PreparedImage {
  bytes: Uint8Array;
  kind: 'jpg' | 'png';
}

async function prepareImageBytes(file: CreativeFile, compress: boolean): Promise<PreparedImage> {
  if (file.format === 'gif') {
    return { bytes: await firstFrameAsPng(file), kind: 'png' };
  }
  if (compress && file.blob.size > BIG_IMAGE_BYTES) {
    return { bytes: await asJpeg85(file), kind: 'jpg' };
  }
  // הטמעת הבייטים המקוריים — רזולוציית מקור מלאה, זום ב-PDF נשאר חד
  return {
    bytes: new Uint8Array(await file.blob.arrayBuffer()),
    kind: file.format === 'png' ? 'png' : 'jpg',
  };
}

// ── פוטר ────────────────────────────────────────────────────────────────────
function drawFooter(ctx: Ctx, page: PDFPage) {
  ctx.pageNum += 1;
  const y = MARGIN / 2;
  page.drawLine({
    start: { x: MARGIN, y: y + 12 },
    end: { x: PAGE_W - MARGIN, y: y + 12 },
    thickness: 0.5,
    color: GRAY_3,
  });
  drawRtl(page, ctx.font, ctx.meta.campaignName || 'ללא שם קמפיין', PAGE_W - MARGIN, y, 8, GRAY_5);
  drawCentered(page, ctx.font, 'הופק ב-AdProof', PAGE_W / 2, y, 8, GRAY_5);
  drawRtl(page, ctx.font, `עמוד ${ctx.pageNum}`, MARGIN + 40, y, 8, GRAY_5);
}

function newPage(ctx: Ctx): PDFPage {
  const page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  drawFooter(ctx, page);
  return page;
}

// ── עמוד שער ────────────────────────────────────────────────────────────────
function drawCover(ctx: Ctx, board: BoardView) {
  const page = newPage(ctx);
  const cx = PAGE_W / 2;

  page.drawRectangle({ x: cx - 46, y: PAGE_H - 150, width: 92, height: 30, color: GRAY_9 });
  drawCentered(page, ctx.bold, 'AdProof', cx, PAGE_H - 141, 16, rgb(1, 1, 1));

  drawCentered(page, ctx.bold, ctx.meta.clientName || 'לקוח', cx, PAGE_H - 230, 30);
  drawCentered(page, ctx.font, ctx.meta.campaignName || 'קמפיין', cx, PAGE_H - 262, 18, GRAY_5);
  drawCentered(page, ctx.font, new Date().toLocaleDateString('he-IL'), cx, PAGE_H - 288, 11, GRAY_5);

  let y = PAGE_H - 340;
  drawCentered(page, ctx.bold, 'התאמות לאישור', cx, y, 13);
  y -= 24;
  for (const p of board.platforms) {
    if (p.visibleCount === 0) continue;
    drawCentered(page, ctx.font, `${PLATFORM_LABELS[p.platform]} — ${p.visibleCount} התאמות`, cx, y, 11, GRAY_5);
    y -= 18;
  }
}

// ── עמודי פלטפורמות ─────────────────────────────────────────────────────────
interface PlacedItem {
  item: AssignmentView;
  plan: MockupPlan;
  /** מידות התמונה בתוך המוקאפ (pt) */
  dw: number;
  dh: number;
}

/**
 * תכנון פריט: גודל אמת של הפלייסמנט (סלוט/רוחב מכשיר) בתוך המוקאפ שלו,
 * מוקטן רק אם הקופסה חורגת מגבולות העמוד.
 */
function planItem(item: AssignmentView): PlacedItem {
  const slotW = item.spec.matchType === 'exact' ? item.spec.width : Math.round(item.file.width / item.retina);
  const slotH = item.spec.matchType === 'exact' ? item.spec.height : Math.round(item.file.height / item.retina);
  const d = actualSize(slotW, slotH, item.spec.typicalRenderWidth, CONTENT_W / PX2PT);
  let dw = d.width * PX2PT;
  let dh = d.height * PX2PT;
  let plan = planMockup(item.spec, dw, dh);
  const shrink = Math.min(1, CONTENT_W / plan.w, MAX_ITEM_H / plan.h);
  if (shrink < 1) {
    dw *= shrink;
    dh *= shrink;
    plan = planMockup(item.spec, dw, dh);
  }
  return { item, plan, dw, dh };
}

function itemLabel(item: AssignmentView): string {
  const slotW = item.spec.matchType === 'exact' ? item.spec.width : Math.round(item.file.width / item.retina);
  const slotH = item.spec.matchType === 'exact' ? item.spec.height : Math.round(item.file.height / item.retina);
  const parts = [`${slotW}×${slotH}`];
  if (item.retina > 1) parts.push(`@${item.retina}x`);
  if (item.file.animated) parts.push('Animated GIF');
  if (item.versionTag) parts.push(item.versionTag);
  return parts.join(' · ');
}

async function drawPlatformPages(ctx: Ctx, board: BoardView, images: Map<string, PDFImage>) {
  for (const platform of board.platforms) {
    if (platform.visibleCount === 0) continue;
    let page = newPage(ctx);
    let y = PAGE_H - MARGIN;

    drawRtl(page, ctx.bold, PLATFORM_LABELS[platform.platform], PAGE_W - MARGIN, y - 16, 18);
    page.drawLine({ start: { x: MARGIN, y: y - 26 }, end: { x: PAGE_W - MARGIN, y: y - 26 }, thickness: 1, color: GRAY_9 });
    y -= 48;

    for (const group of platform.groups) {
      const items = group.items.filter((i) => !i.hidden);
      if (!items.length) continue;

      // כותרת קבוצה (עמוד חדש אם אין מקום מינימלי)
      if (y < MARGIN + FOOTER_H + 120) {
        page = newPage(ctx);
        y = PAGE_H - MARGIN - 10;
      }
      drawRtl(page, ctx.bold, group.group, PAGE_W - MARGIN, y - 10, 12, GRAY_5);
      y -= 26;

      // פריסת שורות RTL עם גלישה; כל פריט מצויר בתוך המוקאפ שלו
      let rowItems: PlacedItem[] = [];
      let xRight = PAGE_W - MARGIN;

      const flushRow = () => {
        if (!rowItems.length) return;
        const rowH = Math.max(...rowItems.map((r) => r.plan.h));
        if (y - rowH - LABEL_H < MARGIN + FOOTER_H) {
          page = newPage(ctx);
          y = PAGE_H - MARGIN - 10;
        }
        let x = PAGE_W - MARGIN;
        for (const placed of rowItems) {
          const pdfImg = images.get(placed.item.file.id);
          const drawX = x - placed.plan.w;
          const yTop = y - (rowH - placed.plan.h);
          if (pdfImg) {
            placed.plan.draw({ page, font: ctx.font, bold: ctx.bold }, drawX, yTop, (ix, iy, iw, ih) => {
              page.drawImage(pdfImg, { x: ix, y: iy, width: iw, height: ih });
            });
          }
          drawCentered(page, ctx.font, itemLabel(placed.item), drawX + placed.plan.w / 2, y - rowH - 11, 7.5, GRAY_5);
          x = drawX - GAP;
        }
        y -= rowH + LABEL_H + GAP;
        rowItems = [];
        xRight = PAGE_W - MARGIN;
      };

      for (const item of items) {
        const placed = planItem(item);
        if (xRight - placed.plan.w < MARGIN && rowItems.length) flushRow();
        rowItems.push(placed);
        xRight -= placed.plan.w + GAP;
      }
      flushRow();
      y -= 6;
    }
  }
}

// ── נקודת הכניסה ────────────────────────────────────────────────────────────
export async function exportPdf(board: BoardView, meta: ExportMeta): Promise<void> {
  const visibleItems = board.platforms.flatMap((p) => p.groups).flatMap((g) => g.items).filter((i) => !i.hidden);
  if (!visibleItems.length) throw new Error('אין התאמות גלויות לייצוא');

  // קובץ מוטמע פעם אחת גם אם משויך לכמה פלטפורמות
  const uniqueFiles = new Map<string, CreativeFile>();
  for (const i of visibleItems) uniqueFiles.set(i.file.id, i.file);

  // בדיקת תקציב גודל: אם סך המקור חורג מהיעד — דחיסת הגדולות בלבד
  const totalBytes = [...uniqueFiles.values()].reduce((n, f) => n + f.blob.size, 0);
  const compress = totalBytes > TARGET_MAX_BYTES;

  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regBytes, boldBytes] = await Promise.all([
    fetch(heeboRegularUrl).then((r) => r.arrayBuffer()),
    fetch(heeboBoldUrl).then((r) => r.arrayBuffer()),
  ]);
  const font = await doc.embedFont(regBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });

  doc.setTitle(`AdProof — ${meta.clientName} / ${meta.campaignName}`);
  doc.setCreator('AdProof');

  const images = new Map<string, PDFImage>();
  for (const file of uniqueFiles.values()) {
    const prepared = await prepareImageBytes(file, compress);
    images.set(
      file.id,
      prepared.kind === 'png' ? await doc.embedPng(prepared.bytes) : await doc.embedJpg(prepared.bytes),
    );
  }

  const ctx: Ctx = { doc, font, bold, meta, pageNum: 0 };
  drawCover(ctx, board);
  await drawPlatformPages(ctx, board, images);

  const bytes = await doc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safe = (s: string) => s.trim().replace(/[\\/:*?"<>|]/g, '-') || 'adproof';
  a.href = url;
  a.download = `AdProof_${safe(meta.clientName)}_${safe(meta.campaignName)}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
