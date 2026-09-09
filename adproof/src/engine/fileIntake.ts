// ─────────────────────────────────────────────────────────────────────────────
// קליטת קבצים: קריאת מידות אמיתיות מהקובץ עצמו (לא משם הקובץ),
// זיהוי פורמט וזיהוי GIF מונפש.
// ─────────────────────────────────────────────────────────────────────────────

import type { ImageFormat } from '../specs/specs.ts';
import type { CreativeFile } from '../store/session.ts';

const MIME_TO_FORMAT: Record<string, ImageFormat> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
};

export function formatOf(file: File): ImageFormat | null {
  if (MIME_TO_FORMAT[file.type]) return MIME_TO_FORMAT[file.type];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
  if (ext === 'png') return 'png';
  if (ext === 'gif') return 'gif';
  return null;
}

/** קריאת מידות דרך createImageBitmap, עם fallback ל-Image */
async function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(blob);
      const dims = { width: bmp.width, height: bmp.height };
      bmp.close();
      return dims;
    } catch {
      /* נופלים ל-Image */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('failed to read image'));
    };
    img.src = url;
  });
}

/** GIF מונפש = יותר מ-Graphic Control Extension אחד בקובץ */
async function isAnimatedGif(blob: Blob): Promise<boolean> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let count = 0;
  for (let i = 0; i < buf.length - 3; i++) {
    if (buf[i] === 0x21 && buf[i + 1] === 0xf9 && buf[i + 2] === 0x04) {
      count++;
      if (count > 1) return true;
    }
  }
  return false;
}

export interface IntakeResult {
  accepted: CreativeFile[];
  rejected: string[]; // שמות קבצים שלא נתמכים
}

export async function intakeFiles(fileList: File[]): Promise<IntakeResult> {
  const accepted: CreativeFile[] = [];
  const rejected: string[] = [];

  for (const file of fileList) {
    const format = formatOf(file);
    if (!format) {
      rejected.push(file.name);
      continue;
    }
    try {
      const { width, height } = await readDimensions(file);
      const animated = format === 'gif' ? await isAnimatedGif(file) : false;
      accepted.push({
        id: crypto.randomUUID(),
        name: file.name,
        mime: file.type || `image/${format === 'jpg' ? 'jpeg' : format}`,
        format,
        width,
        height,
        sizeKb: file.size / 1024,
        blob: file,
        url: URL.createObjectURL(file),
        animated,
      });
    } catch {
      rejected.push(file.name);
    }
  }

  return { accepted, rejected };
}
