import { useState } from 'react';

export default function TrackingStatusBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <div className="text-blue-500 text-2xl">📦</div>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-800">
            Enhanced Order Tracking Available
          </h3>
          <p className="mt-1 text-sm text-blue-700">
            Real-time order tracking is available for your orders, including timelines and
            carrier updates when provided by suppliers.
          </p>
          <div className="mt-2 text-xs text-blue-600">
            Use the "Manage Tracking" buttons on orders to update tracking details.
          </div>
        </div>
        <div className="ml-auto">
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-400 hover:text-blue-600"
            aria-label="Dismiss banner"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
