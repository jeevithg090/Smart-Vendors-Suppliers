import type { ReactNode } from 'react';
import VoiceQueryLauncher from './VoiceQueryLauncher';

interface DashboardHeaderProps {
  role: 'vendor' | 'supplier';
  title: string;
  subtitle?: ReactNode;
  /** Extra controls rendered before the voice and logout buttons. */
  actions?: ReactNode;
  onLogout: () => void;
}

/** Shared, responsive header for the vendor and supplier dashboards. */
export default function DashboardHeader({ role, title, subtitle, actions, onLogout }: DashboardHeaderProps) {
  const dark = role === 'supplier';
  return (
    <header
      className={
        dark
          ? 'bg-gradient-to-r from-green-700 to-green-800 text-white shadow-lg'
          : 'border-b border-slate-200 bg-white shadow-sm'
      }
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="text-2xl">
            🏪
          </span>
          <div className="min-w-0">
            <p className={`truncate text-lg font-semibold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {title}
            </p>
            {subtitle && (
              <div className={`truncate text-sm ${dark ? 'text-green-50' : 'text-slate-600'}`}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {actions}
          <VoiceQueryLauncher userRole={role} tone={dark ? 'dark' : 'light'} />
          <button
            type="button"
            onClick={onLogout}
            className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${
              dark
                ? 'bg-white/15 text-white hover:bg-white/25'
                : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
