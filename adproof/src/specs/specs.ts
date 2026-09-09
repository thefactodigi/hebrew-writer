// ─────────────────────────────────────────────────────────────────────────────
// AdProof — Spec Registry
// כל המידות והפלייסמנטים של כל הפלטפורמות יושבים כאן, ורק כאן.
// הוספת מידה חדשה = הוספת רשומה אחת למערך, בלי לגעת בלוגיקה.
// ─────────────────────────────────────────────────────────────────────────────

export type Platform = 'google_display' | 'pmax' | 'meta' | 'yandex';
export type MatchType = 'exact' | 'ratio';
export type ImageFormat = 'jpg' | 'png' | 'gif';

export interface SafeArea {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

/** שוליים בטוחים מומלצים לבאנרים ולפיד — 5% מכל צד */
export const SAFE_MARGIN_5: SafeArea = { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 };
/** כלל ה-80% המרכזי של PMax — התוכן החשוב ב-80% הפנימיים */
export const SAFE_PMAX_80: SafeArea = { top: 0.1, bottom: 0.1, left: 0.1, right: 0.1 };

export interface PlacementSpec {
  id: string;
  platform: Platform;
  /** קבוצת תצוגה בתוך הפלטפורמה (Desktop / Mobile / Feed וכו') */
  group: string;
  name: string;
  /** ב-exact: מידות הסלוט. ב-ratio: המידה המומלצת (לחישוב יחס). */
  width: number;
  height: number;
  matchType: MatchType;
  maxFileKb: number;
  formats: ImageFormat[];
  /** ל-ratio בלבד: מינימום פיקסלים */
  minWidth?: number;
  minHeight?: number;
  /** נכס חובה בקמפיין (PMax) */
  required?: boolean;
  /**
   * אזור בטוח: שוליים (כשבר 0..1) מכל צד שבהם אסור לשים תוכן חשוב.
   * Stories: פסי UI עליון/תחתון; PMax: כלל ה-80% המרכזי; באנרים/פיד: שוליים מומלצים.
   */
  safeArea?: SafeArea;
  /** לוגו (להבחנת Square Image / Square Logo) */
  isLogo?: boolean;
  /** מוקאפ הקשר מתאים */
  mockup?: 'website' | 'phone-story' | 'feed-card';
  /**
   * ל-ratio בלבד: הרוחב שבו הנכס באמת מוצג בפלטפורמה (קובץ 1080×1920
   * מוצג בפועל על מסך טלפון של ~375px). משמש למצב "גודל אמיתי".
   */
  typicalRenderWidth?: number;
  /** הערה קצרה למעצב */
  note?: string;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  google_display: 'Google Display',
  pmax: 'Performance Max',
  meta: 'Meta',
  yandex: 'Yandex',
};

export const PLATFORM_ORDER: Platform[] = ['google_display', 'pmax', 'meta', 'yandex'];

/** טולרנס סטיית יחס להתאמות ratio (1%) */
export const RATIO_TOLERANCE = 0.01;

/** קובץ 1:1 עד גודל זה (כולל) מסווג כלוגו PMax, מעליו כתמונה */
export const PMAX_LOGO_MAX_PX = 400;

export const SPECS: PlacementSpec[] = [
  // ── Google Display Network (exact, עד 150KB) ──────────────────────────────
  { id: 'gdn_300x250', platform: 'google_display', group: 'Desktop', name: 'Medium Rectangle', width: 300, height: 250, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_336x280', platform: 'google_display', group: 'Desktop', name: 'Large Rectangle', width: 336, height: 280, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_728x90', platform: 'google_display', group: 'Desktop', name: 'Leaderboard', width: 728, height: 90, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_300x600', platform: 'google_display', group: 'Desktop', name: 'Half Page', width: 300, height: 600, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_160x600', platform: 'google_display', group: 'Desktop', name: 'Wide Skyscraper', width: 160, height: 600, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_970x90', platform: 'google_display', group: 'Desktop', name: 'Large Leaderboard', width: 970, height: 90, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_970x250', platform: 'google_display', group: 'Desktop', name: 'Billboard', width: 970, height: 250, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_250x250', platform: 'google_display', group: 'Desktop', name: 'Square', width: 250, height: 250, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_200x200', platform: 'google_display', group: 'Desktop', name: 'Small Square', width: 200, height: 200, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_120x600', platform: 'google_display', group: 'Desktop', name: 'Skyscraper', width: 120, height: 600, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_468x60', platform: 'google_display', group: 'Desktop', name: 'Banner', width: 468, height: 60, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_320x50', platform: 'google_display', group: 'Mobile', name: 'Mobile Banner', width: 320, height: 50, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_320x100', platform: 'google_display', group: 'Mobile', name: 'Large Mobile Banner', width: 320, height: 100, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_300x50', platform: 'google_display', group: 'Mobile', name: 'Mobile Banner (small)', width: 300, height: 50, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_320x480', platform: 'google_display', group: 'Mobile', name: 'Interstitial Portrait', width: 320, height: 480, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'gdn_480x320', platform: 'google_display', group: 'Mobile', name: 'Interstitial Landscape', width: 480, height: 320, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },

  // ── Google Performance Max (ratio, עד 5120KB, JPG/PNG בלבד) ───────────────
  { id: 'pmax_landscape', platform: 'pmax', group: 'Images', name: 'Landscape Image (1.91:1)', width: 1200, height: 628, matchType: 'ratio', minWidth: 600, minHeight: 314, maxFileKb: 5120, formats: ['jpg', 'png'], required: true, mockup: 'feed-card', typicalRenderWidth: 400 },
  { id: 'pmax_square', platform: 'pmax', group: 'Images', name: 'Square Image (1:1)', width: 1200, height: 1200, matchType: 'ratio', minWidth: 300, minHeight: 300, maxFileKb: 5120, formats: ['jpg', 'png'], required: true, mockup: 'feed-card', typicalRenderWidth: 375 },
  { id: 'pmax_portrait', platform: 'pmax', group: 'Images', name: 'Portrait Image (4:5)', width: 960, height: 1200, matchType: 'ratio', minWidth: 480, minHeight: 600, maxFileKb: 5120, formats: ['jpg', 'png'], note: 'מומלץ', mockup: 'feed-card', typicalRenderWidth: 375 },
  { id: 'pmax_logo_square', platform: 'pmax', group: 'Logos', name: 'Square Logo (1:1)', width: 1200, height: 1200, matchType: 'ratio', minWidth: 128, minHeight: 128, maxFileKb: 5120, formats: ['jpg', 'png'], required: true, isLogo: true, typicalRenderWidth: 128 },
  { id: 'pmax_logo_landscape', platform: 'pmax', group: 'Logos', name: 'Landscape Logo (4:1)', width: 1200, height: 300, matchType: 'ratio', minWidth: 512, minHeight: 128, maxFileKb: 5120, formats: ['jpg', 'png'], isLogo: true, typicalRenderWidth: 320 },

  // ── Meta — Facebook + Instagram (ratio) ───────────────────────────────────
  { id: 'meta_feed_square', platform: 'meta', group: 'Feed', name: 'Feed Square (1:1)', width: 1080, height: 1080, matchType: 'ratio', minWidth: 600, minHeight: 600, maxFileKb: 30720, formats: ['jpg', 'png', 'gif'], mockup: 'feed-card', note: 'פיד FB + IG', typicalRenderWidth: 375 },
  { id: 'meta_feed_vertical', platform: 'meta', group: 'Feed', name: 'Feed Vertical (4:5)', width: 1080, height: 1350, matchType: 'ratio', minWidth: 600, minHeight: 750, maxFileKb: 30720, formats: ['jpg', 'png', 'gif'], mockup: 'feed-card', note: 'פיד מובייל, הפורמט המועדף', typicalRenderWidth: 375 },
  { id: 'meta_stories', platform: 'meta', group: 'Stories / Reels', name: 'Stories / Reels (9:16)', width: 1080, height: 1920, matchType: 'ratio', minWidth: 600, minHeight: 1067, maxFileKb: 30720, formats: ['jpg', 'png', 'gif'], safeArea: { top: 0.14, bottom: 0.2 }, mockup: 'phone-story', note: 'אזור בטוח: 14% עליון, 20% תחתון', typicalRenderWidth: 375 },
  { id: 'meta_link', platform: 'meta', group: 'Right Column / Link', name: 'Right Column / Link (1.91:1)', width: 1200, height: 628, matchType: 'ratio', minWidth: 600, minHeight: 314, maxFileKb: 30720, formats: ['jpg', 'png', 'gif'], note: 'דסקטופ', mockup: 'feed-card', typicalRenderWidth: 500 },

  // ── Yandex Direct (exact, רוב הפורמטים 120–150KB) ────────────────────────
  { id: 'yandex_240x400', platform: 'yandex', group: 'Desktop', name: '240×400 (הפורמט הנפוץ ביאנדקס)', width: 240, height: 400, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_160x600', platform: 'yandex', group: 'Desktop', name: '160×600', width: 160, height: 600, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_240x600', platform: 'yandex', group: 'Desktop', name: '240×600', width: 240, height: 600, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_300x250', platform: 'yandex', group: 'Desktop', name: '300×250', width: 300, height: 250, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_300x300', platform: 'yandex', group: 'Desktop', name: '300×300', width: 300, height: 300, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_300x500', platform: 'yandex', group: 'Desktop', name: '300×500', width: 300, height: 500, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_300x600', platform: 'yandex', group: 'Desktop', name: '300×600', width: 300, height: 600, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_336x280', platform: 'yandex', group: 'Desktop', name: '336×280', width: 336, height: 280, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_728x90', platform: 'yandex', group: 'Desktop', name: '728×90', width: 728, height: 90, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_970x250', platform: 'yandex', group: 'Desktop', name: '970×250', width: 970, height: 250, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_1000x120', platform: 'yandex', group: 'Desktop', name: '1000×120', width: 1000, height: 120, matchType: 'exact', maxFileKb: 150, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_320x50', platform: 'yandex', group: 'Mobile', name: '320×50', width: 320, height: 50, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_320x100', platform: 'yandex', group: 'Mobile', name: '320×100', width: 320, height: 100, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_320x480', platform: 'yandex', group: 'Mobile', name: '320×480', width: 320, height: 480, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
  { id: 'yandex_480x320', platform: 'yandex', group: 'Mobile', name: '480×320', width: 480, height: 320, matchType: 'exact', maxFileKb: 120, formats: ['jpg', 'png', 'gif'], mockup: 'website' },
];

// אזור בטוח לכל פלייסמנט שלא הגדיר אחד מפורשות:
// PMax (תמונות) — כלל ה-80% המרכזי; לוגואים — בלי; כל השאר — שוליים 5%.
for (const s of SPECS) {
  if (s.safeArea || s.isLogo) continue;
  s.safeArea = s.platform === 'pmax' ? SAFE_PMAX_80 : SAFE_MARGIN_5;
}

export function getSpec(id: string): PlacementSpec | undefined {
  return SPECS.find((s) => s.id === id);
}
