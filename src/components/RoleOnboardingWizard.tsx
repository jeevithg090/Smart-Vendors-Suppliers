import { useEffect, useMemo, useState } from 'react';

type Role = 'vendor' | 'supplier';

interface RoleOnboardingWizardProps {
  role: Role;
  userId?: string;
}

interface ChecklistItem {
  id: string;
  label: string;
  hint: string;
}

const ROLE_CHECKLIST: Record<Role, ChecklistItem[]> = {
  vendor: [
    { id: 'profile', label: 'Complete business profile', hint: 'Adds trust and improves recommendations.' },
    { id: 'supplier-list', label: 'Save first supplier list', hint: 'Speed up repeat buying decisions.' },
    { id: 'first-order', label: 'Create first order template', hint: 'Enable one-click repeat ordering.' },
    { id: 'alerts', label: 'Enable delivery alerts', hint: 'Get delay warnings before service hours.' },
    { id: 'insights', label: 'Review market bulletin', hint: 'Use city trends for better pricing windows.' },
  ],
  supplier: [
    { id: 'profile', label: 'Complete supplier profile', hint: 'Visibility improves with richer information.' },
    { id: 'catalog', label: 'Add inventory items', hint: 'Vendors can discover your listings faster.' },
    { id: 'media', label: 'Upload profile media', hint: 'Build buyer trust with storefront proof.' },
    { id: 'sla', label: 'Track order fulfillment SLA', hint: 'Operational reliability boosts trust score.' },
    { id: 'analytics', label: 'Open analytics and forecasting', hint: 'Plan inventory with demand signals.' },
  ],
};

function getStorageKey(role: Role, userId?: string) {
  return `onboarding_wizard_${role}_${userId || 'guest'}`;
}

export default function RoleOnboardingWizard({ role, userId }: RoleOnboardingWizardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const checklist = useMemo(() => ROLE_CHECKLIST[role], [role]);
  const storageKey = useMemo(() => getStorageKey(role, userId), [role, userId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        setCompleted(parsed);
      }
    } catch {
      // Ignore corrupt local storage payloads.
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(completed));
    } catch {
      // Ignore storage failures in restricted environments.
    }
  }, [completed, storageKey]);

  const doneCount = checklist.filter((item) => completed[item.id]).length;
  const completionRatio = Math.round((doneCount / checklist.length) * 100);

  const toggleItem = (itemId: string) => {
    setCompleted((previous) => ({
      ...previous,
      [itemId]: !previous[itemId],
    }));
  };

  return (
    <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900">
            {role === 'vendor' ? 'Vendor' : 'Supplier'} onboarding checklist
          </h3>
          <p className="text-xs text-indigo-700">
            {doneCount}/{checklist.length} completed • {completionRatio}% ready
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-36 overflow-hidden rounded-full bg-indigo-100">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all duration-500"
              style={{ width: `${completionRatio}%` }}
            />
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((previous) => !previous)}
            className="rounded-md border border-indigo-300 bg-white px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
          >
            {collapsed ? 'Show' : 'Hide'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {checklist.map((item) => (
            <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3">
              <input
                type="checkbox"
                checked={Boolean(completed[item.id])}
                onChange={() => toggleItem(item.id)}
                className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{item.label}</div>
                <div className="text-xs text-slate-500">{item.hint}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

