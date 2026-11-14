import type { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Contains a failure to one dashboard section so the header and navigation
 * stay usable. Pass a changing `resetKey` (e.g. the active tab) to recover
 * when the user navigates away.
 */
export default function SectionErrorBoundary({
  children,
  resetKey,
}: {
  children: ReactNode;
  resetKey: string;
}) {
  return (
    <ErrorBoundary
      key={resetKey}
      isolate
      fallback={(error) => (
        <div
          role="alert"
          className="mx-auto my-8 max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-center"
        >
          <h2 className="text-lg font-semibold text-red-900">This section couldn&apos;t be loaded</h2>
          <p className="mt-2 text-sm text-red-800">
            {error.message.includes('Uncaught Error:')
              ? error.message.split('Uncaught Error:')[1].split('\n')[0].trim()
              : 'Something went wrong while loading this data. Other sections still work.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-10 rounded-full bg-red-700 px-5 text-sm font-semibold text-white hover:bg-red-800"
          >
            Reload page
          </button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
