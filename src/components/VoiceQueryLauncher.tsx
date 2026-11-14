import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const VoiceQuery = lazy(() => import('./VoiceQuery'));

interface VoiceQueryLauncherProps {
  userRole: 'vendor' | 'supplier';
  /** Visual variant for light (white) or dark/coloured headers. */
  tone?: 'light' | 'dark';
}

/**
 * Compact header button that opens the voice assistant in a dialog, so the
 * full voice panel doesn't crowd the header.
 */
export default function VoiceQueryLauncher({ userRole, tone = 'light' }: VoiceQueryLauncherProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors ${
          tone === 'dark'
            ? 'bg-white/15 text-white hover:bg-white/25'
            : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
        }`}
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-2.08A7 7 0 0 0 19 12h-2Z" />
        </svg>
        <span className="hidden sm:inline">Voice</span>
        <span className="sr-only sm:hidden">Open voice assistant</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-dialog-title"
            className="relative w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl animate-fade-in"
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 id="voice-dialog-title" className="text-lg font-semibold text-slate-900">
                Voice assistant
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close voice assistant"
              >
                ✕
              </button>
            </div>
            <Suspense
              fallback={
                <div className="flex h-40 items-center justify-center" role="status">
                  <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-orange-500" />
                  <span className="sr-only">Loading voice assistant…</span>
                </div>
              }
            >
              <VoiceQuery userRole={userRole} />
            </Suspense>
          </div>
        </div>
      )}
    </>
  );
}
