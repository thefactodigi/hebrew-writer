import { describe, it, expect } from 'vitest';
import {
  matchExact,
  matchRatio,
  matchFile,
  ratioMatches,
  nearestSpec,
  versionTags,
  type FileMeta,
} from './matcher.ts';

const file = (id: string, width: number, height: number, format: FileMeta['format'] = 'jpg'): FileMeta => ({
  id,
  width,
  height,
  format,
});

const specIds = (matches: ReturnType<typeof matchFile>) => matches.map((m) => m.specId).sort();

describe('matchExact', () => {
  it('משייך התאמת פיקסלים 1:1', () => {
    const m = matchExact(file('f1', 300, 600));
    expect(specIds(m)).toEqual(['gdn_300x600', 'yandex_300x600']);
    expect(m.every((x) => x.retina === 1)).toBe(true);
  });

  it('משייך רטינה x2 לסלוט הבסיס', () => {
    const m = matchExact(file('f1', 600, 1200));
    expect(specIds(m)).toEqual(['gdn_300x600', 'yandex_300x600']);
    expect(m.every((x) => x.retina === 2)).toBe(true);
  });

  it('משייך רטינה x3', () => {
    const m = matchExact(file('f1', 960, 150));
    expect(m.some((x) => x.specId === 'gdn_320x50' && x.retina === 3)).toBe(true);
  });

  it('לא משייך מידה שאינה סלוט ואינה כפולה', () => {
    expect(matchExact(file('f1', 301, 600))).toEqual([]);
  });
});

describe('ratioMatches', () => {
  it('מקבל יחס מדויק', () => {
    expect(ratioMatches(1200, 628, 1200, 628)).toBe(true);
  });

  it('מקבל סטייה של עד 1%', () => {
    // 1194x628 → סטייה של 0.5% מ-1.91:1
    expect(ratioMatches(1194, 628, 1200, 628)).toBe(true);
  });

  it('דוחה סטייה מעל 1%', () => {
    expect(ratioMatches(1100, 628, 1200, 628)).toBe(false);
  });
});

describe('matchRatio', () => {
  it('משייך 1080x1080 גם ל-Meta Feed וגם ל-PMax Square (ריבוי שיוכים)', () => {
    const ids = specIds(matchRatio(file('f1', 1080, 1080)));
    expect(ids).toContain('meta_feed_square');
    expect(ids).toContain('pmax_square');
    expect(ids).not.toContain('pmax_logo_square');
  });

  it('מסווג 1:1 קטן (עד 400px) כלוגו PMax ולא כתמונה', () => {
    const ids = specIds(matchRatio(file('f1', 380, 380)));
    expect(ids).toContain('pmax_logo_square');
    expect(ids).not.toContain('pmax_square');
  });

  it('דוחה קובץ מתחת למינימום הפיקסלים', () => {
    // 1.91:1 אבל מתחת ל-600x314
    const ids = specIds(matchRatio(file('f1', 400, 209)));
    expect(ids).not.toContain('pmax_landscape');
    expect(ids).not.toContain('meta_link');
  });

  it('משייך 1200x628 גם ל-PMax Landscape וגם ל-Meta Link', () => {
    const ids = specIds(matchRatio(file('f1', 1200, 628)));
    expect(ids).toContain('pmax_landscape');
    expect(ids).toContain('meta_link');
  });

  it('משייך 9:16 לסטוריז', () => {
    const ids = specIds(matchRatio(file('f1', 1080, 1920)));
    expect(ids).toContain('meta_stories');
  });
});

describe('matchFile — ריבוי שיוכים בין פלטפורמות', () => {
  it('300x250 נכנס גם ל-Google Display וגם ל-Yandex', () => {
    const ids = specIds(matchFile(file('f1', 300, 250)));
    expect(ids).toContain('gdn_300x250');
    expect(ids).toContain('yandex_300x250');
  });

  it('קובץ 250x250 מקבל exact ב-GDN בלי ratio של PMax (מתחת למינימום)', () => {
    const ids = specIds(matchFile(file('f1', 250, 250)));
    expect(ids).toContain('gdn_250x250');
    expect(ids).not.toContain('pmax_square');
    // 250px הוא עד 400 → מועמד לוגו, ועומד במינימום 128
    expect(ids).toContain('pmax_logo_square');
  });

  it('קובץ שלא תואם כלום מחזיר רשימה ריקה', () => {
    expect(matchFile(file('f1', 777, 333))).toEqual([]);
  });
});

describe('nearestSpec', () => {
  it('מציע את הסלוט הקרוב ביותר לקובץ לא משויך', () => {
    const s = nearestSpec({ width: 305, height: 255 });
    expect(s).not.toBeNull();
    expect(['gdn_300x250', 'yandex_300x250']).toContain(s!.spec.id);
  });
});

describe('versionTags — כפילויות', () => {
  it('נותן גרסה A/B לשני קבצים באותה מידה', () => {
    const tags = versionTags([file('a', 300, 250), file('b', 300, 250), file('c', 728, 90)]);
    expect(tags['a']).toBe('גרסה A');
    expect(tags['b']).toBe('גרסה B');
    expect(tags['c']).toBeUndefined();
  });
});
