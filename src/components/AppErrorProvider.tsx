import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { OfflineManager } from './OfflineManager';
import { ErrorReportingDashboard } from './ErrorReportingDashboard';
import { useComprehensiveErrorHandling } from '../hooks/useComprehensiveErrorHandling';

interface AppErrorContextType {
  executeOperation: <T>(
    operation: () => Promise<T>,
    operationName?: string,
    context?: Record<string, any>
  ) => Promise<T>;
  validateBusinessLogic: (
    validationType: 'orderPlacement' | 'groupOrderParticipation' | 'payment',
    data: any
  ) => Promise<any>;
  validateForm: (
    formData: Record<string, any>,
    validationRules: Record<string, any>
  ) => Promise<any>;
  handleError: (
    error: Error,
    context?: Record<string, any>,
    recoveryActions?: string[]
  ) => Promise<any>;
  isLoading: boolean;
  error: any;
  canRetry: boolean;
  retry: () => Promise<void>;
  clearError: () => void;
}

const AppErrorContext = createContext<AppErrorContextType | null>(null);

interface AppErrorProviderProps {
  children: ReactNode;
}

export function AppErrorProvider({ children }: AppErrorProviderProps) {
  const errorHandling = useComprehensiveErrorHandling({
    enableRetry: true,
    enableBusinessValidation: true,
    enablePerformanceTracking: true,
    maxRetries: 3,
    retryDelay: 1000
  });

  return (
    <AppErrorContext.Provider value={errorHandling}>
      <ErrorBoundary>
        <OfflineManager>
          {children}
          <ErrorReportingDashboard />
        </OfflineManager>
      </ErrorBoundary>
    </AppErrorContext.Provider>
  );
}

export function useAppError() {
  const context = useContext(AppErrorContext);
  if (!context) {
    throw new Error('useAppError must be used within an AppErrorProvider');
  }
  return context;
}