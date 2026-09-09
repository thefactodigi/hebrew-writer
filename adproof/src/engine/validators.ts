// ─────────────────────────────────────────────────────────────────────────────
// ולידציות ואזהרות — מוצגות במצב עבודה בלבד, לא חוסמות ולא נכנסות ל-PDF.
// ─────────────────────────────────────────────────────────────────────────────

import type { ImageFormat, PlacementSpec } from '../specs/specs.ts';

export type WarningLevel = 'warn' | 'error';

export interface CreativeWarning {
  level: WarningLevel;
  message: string;
}

export interface ValidatableFile {
  width: number;
  height: number;
  format: ImageFormat;
  sizeKb: number;
}

/** כל האזהרות של קובץ ביחס לסלוט שהוא משויך אליו */
export function validateAgainstSpec(file: ValidatableFile, spec: PlacementSpec): CreativeWarning[] {
  const warnings: CreativeWarning[] = [];

  if (file.sizeKb > spec.maxFileKb) {
    warnings.push({
      level: 'error',
      message: `המשקל ${Math.round(file.sizeKb)}KB חורג ממגבלת ${spec.maxFileKb}KB של הסלוט`,
    });
  }

  if (!spec.formats.includes(file.format)) {
    warnings.push({
      level: 'error',
      message: `פורמט ${file.format.toUpperCase()} לא נתמך בסלוט הזה (${spec.formats.map((f) => f.toUpperCase()).join('/')})`,
    });
  }

  if (spec.matchType === 'ratio') {
    if ((spec.minWidth && file.width < spec.minWidth) || (spec.minHeight && file.height < spec.minHeight)) {
      warnings.push({
        level: 'error',
        message: `הרזולוציה ${file.width}×${file.height} מתחת למינימום ${spec.minWidth}×${spec.minHeight}`,
      });
    }
    if (spec.platform === 'pmax' && !spec.isLogo) {
      warnings.push({
        level: 'warn',
        message: 'PMax עלול לחתוך שוליים — ודאו שהתוכן החשוב נמצא ב-80% המרכזיים של התמונה',
      });
    }
  }

  return warnings;
}
