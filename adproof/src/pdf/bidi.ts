// ─────────────────────────────────────────────────────────────────────────────
// טיפול בכיווניות עבור pdf-lib + fontkit:
// fontkit מרנדר נכון ריצה חד-כיוונית (כולל עברית), אבל בשורה מעורבת שמתחילה
// בלטינית הוא בוחר בסיס LTR וסדר הריצות יוצא הפוך. לכן מפצלים כל שורה
// לריצות כיווניות, מסדרים אותן בסדר ויזואלי (בסיס RTL) ומציירים כל ריצה בנפרד.
// ─────────────────────────────────────────────────────────────────────────────

const RTL_CHAR = /[֐-׿]/;
const LTR_CHAR = /[A-Za-z0-9]/;

type RunType = 'rtl' | 'ltr' | 'neutral';

function charType(c: string): RunType {
  if (RTL_CHAR.test(c)) return 'rtl';
  if (LTR_CHAR.test(c)) return 'ltr';
  return 'neutral';
}

export function containsHebrew(text: string): boolean {
  return RTL_CHAR.test(text);
}

/**
 * פירוק שורה לריצות בסדר ויזואלי (משמאל לימין) עבור בסיס RTL.
 * כל ריצה שמוחזרת היא חד-כיוונית ובטוחה לציור ישיר עם fontkit.
 */
export function visualRuns(text: string): string[] {
  if (!containsHebrew(text)) return [text];

  // פירוק לריצות גולמיות
  const runs: Array<{ type: RunType; text: string }> = [];
  for (const c of text) {
    const t = charType(c);
    const last = runs[runs.length - 1];
    if (last && last.type === t) last.text += c;
    else runs.push({ type: t, text: c });
  }

  // ריצה ניטרלית בין שתי ריצות LTR מסופחת אליהן; אחרת נחשבת RTL (בסיס עברי)
  const resolved = runs.map((r, i) => {
    if (r.type !== 'neutral') return r;
    const prev = runs[i - 1]?.type;
    const next = runs[i + 1]?.type;
    if (prev === 'ltr' && next === 'ltr') return { ...r, type: 'ltr' as RunType };
    return { ...r, type: 'rtl' as RunType };
  });

  // מיזוג ריצות סמוכות מאותו סוג
  const merged: Array<{ type: RunType; text: string }> = [];
  for (const r of resolved) {
    const last = merged[merged.length - 1];
    if (last && last.type === r.type) last.text += r.text;
    else merged.push({ ...r });
  }

  // בסיס RTL: הריצה הלוגית הראשונה יושבת הכי ימינה ⇒ סדר ויזואלי = היפוך סדר הריצות
  return merged.reverse().map((r) => r.text);
}
