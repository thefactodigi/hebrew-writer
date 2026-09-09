// מוקאפים גנריים לחלוטין — קווי מתאר בלבד, בלי לוגואים של פלטפורמות.
import type { ReactNode } from 'react';

interface Props {
  kind: 'website' | 'phone-story' | 'feed-card';
  children: ReactNode;
  /** רוחב ההתאמה בתצוגה — משמש להתאמת המסגרת */
  displayWidth: number;
}

/** שלד עמוד אתר גנרי אפור סביב באנר */
function WebsiteFrame({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  const frameW = Math.max(displayWidth + 120, 280);
  return (
    <div dir="ltr" className="rounded-md border border-gray-300 bg-white p-3 shadow-sm" style={{ width: frameW }}>
      <div className="mb-2 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        <span className="ms-2 h-3 flex-1 rounded bg-gray-100" />
      </div>
      <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
      <div className="mb-1 h-2 w-full rounded bg-gray-100" />
      <div className="mb-3 h-2 w-5/6 rounded bg-gray-100" />
      <div className="flex justify-center">{children}</div>
      <div className="mt-3 h-2 w-full rounded bg-gray-100" />
      <div className="mt-1 h-2 w-4/6 rounded bg-gray-100" />
    </div>
  );
}

/** מסגרת טלפון עם UI מרומז של סטורי + סימון אזורים בטוחים */
function PhoneStoryFrame({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  return (
    <div dir="ltr" className="rounded-[28px] border-[6px] border-gray-800 bg-black p-0 shadow-md" style={{ width: displayWidth + 12 }}>
      <div className="relative overflow-hidden rounded-[20px]">
        {children}
        {/* UI מרומז: פס פרוגרס + עיגול פרופיל למעלה, שורת תגובה למטה */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1.5 p-2">
          <div className="h-0.5 w-full rounded bg-white/70" />
          <div className="flex items-center gap-1.5">
            <span className="h-5 w-5 rounded-full border border-white/80 bg-white/30" />
            <span className="h-2 w-16 rounded bg-white/60" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 p-2">
          <span className="h-6 flex-1 rounded-full border border-white/70" />
          <span className="h-5 w-5 rounded-full border border-white/70" />
        </div>
      </div>
    </div>
  );
}

/** כרטיס פוסט פיד גנרי */
function FeedCardFrame({ children, displayWidth }: { children: ReactNode; displayWidth: number }) {
  return (
    <div dir="ltr" className="rounded-md border border-gray-300 bg-white shadow-sm" style={{ width: displayWidth + 2 }}>
      <div className="flex items-center gap-2 p-2">
        <span className="h-7 w-7 rounded-full bg-gray-300" />
        <div className="flex flex-col gap-1">
          <span className="h-2.5 w-24 rounded bg-gray-300" />
          <span className="h-2 w-14 rounded bg-gray-200" />
        </div>
      </div>
      {children}
      <div className="flex items-center gap-3 p-2">
        <span className="h-4 w-4 rounded-full border-2 border-gray-300" />
        <span className="h-4 w-4 rounded border-2 border-gray-300" />
        <span className="h-4 w-4 rotate-45 rounded-sm border-2 border-gray-300" />
      </div>
    </div>
  );
}

export default function MockupFrame({ kind, children, displayWidth }: Props) {
  if (kind === 'website') return <WebsiteFrame displayWidth={displayWidth}>{children}</WebsiteFrame>;
  if (kind === 'phone-story') return <PhoneStoryFrame displayWidth={displayWidth}>{children}</PhoneStoryFrame>;
  return <FeedCardFrame displayWidth={displayWidth}>{children}</FeedCardFrame>;
}
