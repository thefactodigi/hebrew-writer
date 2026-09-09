import { useCallback, useRef, useState } from 'react';
import { intakeFiles } from '../engine/fileIntake.ts';
import { useSession } from '../store/session.ts';

export default function UploadZone({ compact = false }: { compact?: boolean }) {
  const addFiles = useSession((s) => s.addFiles);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rejected, setRejected] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (list: FileList | File[]) => {
      setBusy(true);
      const { accepted, rejected } = await intakeFiles(Array.from(list));
      addFiles(accepted);
      setRejected(rejected);
      setBusy(false);
    },
    [addFiles],
  );

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition-colors ${
        dragOver ? 'border-sky-400 bg-sky-50' : 'border-gray-300 bg-white'
      } ${compact ? 'p-4' : 'p-16'}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) void handleFiles(e.dataTransfer.files);
      }}
    >
      {busy ? (
        <p className="text-gray-500">קורא מידות ומסווג…</p>
      ) : (
        <>
          <p className={compact ? 'text-sm text-gray-500' : 'mb-2 text-xl font-medium text-gray-700'}>
            {compact ? 'גרירת קבצים נוספים לכאן' : 'גררו לכאן את כל קבצי ההתאמות של הקמפיין'}
          </p>
          {!compact && <p className="mb-4 text-sm text-gray-400">JPG / PNG / GIF · הזיהוי והשיוך אוטומטיים</p>}
          <button
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm text-white hover:bg-gray-700"
            onClick={() => inputRef.current?.click()}
          >
            בחירת קבצים
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </>
      )}
      {rejected.length > 0 && (
        <p className="mt-3 text-xs text-red-500">לא נקלטו (פורמט לא נתמך): {rejected.join(', ')}</p>
      )}
    </div>
  );
}
