// ─────────────────────────────────────────────────────────────────────────────
// מוקאפים גנריים לחלוטין — קווי מתאר בלבד, בלי לוגואים של פלטפורמות.
// המוקאפ ממקם את ההתאמה לפי הפלייסמנט האמיתי שלה:
// ליידרבורד בראש עמוד, סקייסקרייפר בסייד-בר, מלבן בתוך תוכן,
// באנר מובייל בתחתית מסך טלפון, אינטרסטישל כשכבה על התוכן,
// סטורי במסך מלא, פוסט פיד בכרטיס.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import type { PlacementSpec } from '../specs/specs.ts';

interface Props {
  spec: PlacementSpec;
  children: ReactNode;
  /** מידות ההתאמה בתצוגה */
  displayWidth: number;
  displayHeight: number;
}

const AD_TAG = (
  <span className="absolute left-0 top-0 z-10 rounded-br bg-black/40 px-1 text-[8px] leading-3 text-white">Ad</span>
);

/** פסי טקסט אפורים גנריים */
function TextLines({ n, w = '100%' }: { n: number; w?: string }) {
  return (
    <div className="flex flex-col gap-1.5" style={{ width: w }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="h-2 rounded bg-gray-200" style={{ width: i === n - 1 ? '70%' : '100%' }} />
      ))}
    </div>
  );
}

function BrowserChrome() {
  return (
    <div className="flex items-center gap-1.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
      <span className="h-2 w-2 rounded-full bg-gray-300" />
      <span className="h-2 w-2 rounded-full bg-gray-300" />
      <span className="h-2 w-2 rounded-full bg-gray-300" />
      <span className="ms-2 h-3.5 flex-1 rounded-full bg-white ring-1 ring-gray-200" />
    </div>
  );
}

const adSlot = (children: ReactNode) => (
  <div className="relative shrink-0 self-center outline outline-1 outline-gray-200">
    {AD_TAG}
    {children}
  </div>
);

/** באנר רחב (ליידרבורד/בילבורד) — בראש עמוד תוכן, מתחת לניווט */
function WebsiteTop({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  const w = Math.max(displayWidth + 48, 360);
  return (
    <div dir="ltr" className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm" style={{ width: w }}>
      <BrowserChrome />
      <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-2">
        <span className="h-4 w-14 rounded bg-gray-300" />
        <span className="h-2 w-8 rounded bg-gray-200" />
        <span className="h-2 w-8 rounded bg-gray-200" />
        <span className="h-2 w-8 rounded bg-gray-200" />
      </div>
      <div className="flex flex-col items-center gap-3 p-3">
        {adSlot(children)}
        <div className="h-4 w-2/3 self-start rounded bg-gray-300" />
        <div className="flex w-full gap-4">
          <TextLines n={4} w="60%" />
          <div className="h-16 flex-1 rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

/** באנר גבוה (סקייסקרייפר/חצי עמוד) — בסייד-בר לצד תוכן */
function WebsiteSidebar({ children, displayWidth, displayHeight }: { children: ReactNode; displayWidth: number; displayHeight: number }) {
  const w = displayWidth + 300;
  return (
    <div dir="ltr" className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm" style={{ width: w }}>
      <BrowserChrome />
      <div className="flex gap-3 p-3">
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div className="h-4 w-3/4 rounded bg-gray-300" />
          <TextLines n={3} />
          <div className="rounded bg-gray-100" style={{ height: Math.max(60, displayHeight * 0.3) }} />
          <TextLines n={Math.max(3, Math.round(displayHeight / 44))} />
        </div>
        {adSlot(children)}
      </div>
    </div>
  );
}

/** מלבן (300×250 וכו') — משובץ בתוך גוף התוכן */
function WebsiteInline({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  const w = Math.max(displayWidth + 220, 420);
  return (
    <div dir="ltr" className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm" style={{ width: w }}>
      <BrowserChrome />
      <div className="flex flex-col gap-2.5 p-3">
        <div className="h-4 w-3/4 rounded bg-gray-300" />
        <TextLines n={2} />
        <div className="flex items-start gap-3">
          {adSlot(children)}
          <TextLines n={6} />
        </div>
        <TextLines n={2} />
      </div>
    </div>
  );
}

/** מסגרת טלפון גנרית */
function Phone({ children, screenW }: { children: ReactNode; screenW: number }) {
  return (
    <div dir="ltr" className="rounded-[30px] border-[7px] border-gray-800 bg-gray-800 shadow-md" style={{ width: screenW + 14 }}>
      <div className="relative overflow-hidden rounded-[23px] bg-white">
        <div className="absolute left-1/2 top-1.5 z-20 h-3.5 w-16 -translate-x-1/2 rounded-full bg-gray-800" />
        {children}
      </div>
    </div>
  );
}

/** באנר מובייל — מוצמד לתחתית מסך טלפון מעל תוכן */
function PhoneBottomBanner({ children, displayWidth, displayHeight }: { children: ReactNode; displayWidth: number; displayHeight: number }) {
  const screenW = Math.max(displayWidth, 320) + 16;
  return (
    <Phone screenW={screenW}>
      <div className="flex flex-col" style={{ width: screenW, height: 300 + displayHeight }}>
        <div className="flex flex-col gap-2 p-3 pt-8">
          <div className="h-3.5 w-2/3 rounded bg-gray-300" />
          <TextLines n={3} />
          <div className="h-16 rounded bg-gray-100" />
          <TextLines n={2} />
        </div>
        <div className="mt-auto flex justify-center border-t border-gray-200 bg-gray-50 py-1">
          {adSlot(children)}
        </div>
      </div>
    </Phone>
  );
}

/** אינטרסטישל — שכבה מעל תוכן מעומעם */
function PhoneInterstitial({ children, displayWidth, displayHeight }: { children: ReactNode; displayWidth: number; displayHeight: number }) {
  const screenW = Math.max(displayWidth + 24, 340);
  const screenH = Math.max(displayHeight + 80, 480);
  return (
    <Phone screenW={screenW}>
      <div className="relative" style={{ width: screenW, height: screenH }}>
        <div className="flex flex-col gap-2 p-3 pt-8 opacity-40">
          <div className="h-3.5 w-2/3 rounded bg-gray-300" />
          <TextLines n={4} />
          <div className="h-20 rounded bg-gray-100" />
          <TextLines n={3} />
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="relative">
            <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-gray-500 shadow">✕</span>
            {children}
          </div>
        </div>
      </div>
    </Phone>
  );
}

/** סטורי/רילס — מסך מלא עם UI מרומז */
function PhoneStory({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  return (
    <Phone screenW={displayWidth}>
      <div className="relative">
        {children}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1.5 p-2 pt-6">
          <div className="h-0.5 w-full rounded bg-white/70" />
          <div className="flex items-center gap-1.5">
            <span className="h-6 w-6 rounded-full border border-white/80 bg-white/30" />
            <span className="h-2 w-16 rounded bg-white/60" />
            <span className="ms-1 rounded bg-white/25 px-1 text-[8px] leading-3 text-white">ממומן</span>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 p-2 pb-4">
          <span className="h-7 flex-1 rounded-full border border-white/70" />
          <span className="h-6 w-6 rounded-full border border-white/70" />
          <span className="h-6 w-6 rounded-full border border-white/70" />
        </div>
      </div>
    </Phone>
  );
}

/** פוסט פיד — כרטיס עם כותרת פרופיל, תמונה, שורת פעולות */
function FeedCard({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  return (
    <div dir="ltr" className="overflow-hidden rounded-lg border border-gray-300 bg-white shadow-sm" style={{ width: displayWidth + 2 }}>
      <div className="flex items-center gap-2 p-2.5">
        <span className="h-8 w-8 rounded-full bg-gray-300" />
        <div className="flex flex-col gap-1">
          <span className="h-2.5 w-24 rounded bg-gray-300" />
          <span className="h-2 w-14 rounded bg-gray-200 text-[8px]" />
        </div>
        <span className="ms-auto rounded bg-gray-100 px-1.5 text-[9px] leading-4 text-gray-400">ממומן</span>
      </div>
      {children}
      <div className="flex items-center gap-3 p-2.5">
        <span className="h-4.5 w-4.5 rounded-full border-2 border-gray-300" style={{ width: 18, height: 18 }} />
        <span className="rounded border-2 border-gray-300" style={{ width: 18, height: 18 }} />
        <span className="rotate-45 rounded-sm border-2 border-gray-300" style={{ width: 18, height: 18 }} />
        <span className="ms-auto h-6 w-20 rounded bg-gray-800" />
      </div>
      <div className="flex flex-col gap-1 px-2.5 pb-2.5">
        <span className="h-2 w-3/4 rounded bg-gray-200" />
        <span className="h-2 w-1/2 rounded bg-gray-200" />
      </div>
    </div>
  );
}

export default function MockupFrame({ spec, children, displayWidth, displayHeight }: Props) {
  if (spec.mockup === 'phone-story') {
    return <PhoneStory displayWidth={displayWidth}>{children}</PhoneStory>;
  }
  if (spec.mockup === 'feed-card') {
    return <FeedCard displayWidth={displayWidth}>{children}</FeedCard>;
  }

  // website — בחירת פריסה לפי צורת הסלוט והקבוצה
  const aspect = spec.width / spec.height;
  const isMobileGroup = spec.group === 'Mobile';

  if (isMobileGroup) {
    // אינטרסטישל (320×480 / 480×320) לעומת באנר צמוד-תחתית
    if (spec.height >= 320 || (aspect > 1 && spec.height >= 300)) {
      return <PhoneInterstitial displayWidth={displayWidth} displayHeight={displayHeight}>{children}</PhoneInterstitial>;
    }
    return <PhoneBottomBanner displayWidth={displayWidth} displayHeight={displayHeight}>{children}</PhoneBottomBanner>;
  }
  if (aspect >= 3) {
    return <WebsiteTop displayWidth={displayWidth}>{children}</WebsiteTop>;
  }
  if (spec.height >= 400 && aspect <= 0.8) {
    return <WebsiteSidebar displayWidth={displayWidth} displayHeight={displayHeight}>{children}</WebsiteSidebar>;
  }
  return <WebsiteInline displayWidth={displayWidth}>{children}</WebsiteInline>;
}
