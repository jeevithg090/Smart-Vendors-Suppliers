import type { AppError, ErrorReport } from '../types/errors';

class ErrorReportingService {
  private static instance: ErrorReportingService;
  private errorQueue: ErrorReport[] = [];
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.flushErrorQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  async reportError(error: AppError, additionalContext?: Record<string, any>): Promise<void> {
    const errorReport: ErrorReport = {
      error: {
        ...error,
        context: { ...error.context, ...additionalContext }
      },
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId(),
      buildVersion: import.meta.env.VITE_BUILD_VERSION || 'development'
    };

    if (this.isOnline) {
      try {
        await this.sendErrorReport(errorReport);
      } catch (sendError) {
        console.error('Failed to send error report:', sendError);
        this.queueError(errorReport);
      }
    } else {
      this.queueError(errorReport);
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.error('Application Error:', errorReport);
    }
  }

  private async sendErrorReport(errorReport: ErrorReport): Promise<void> {
    // In a real application, this would send to an error reporting service
    // For now, we'll simulate the API call
    const response = await fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorReport),
    });

    if (!response.ok) {
      throw new Error(`Failed to send error report: ${response.status}`);
    }
  }

  private queueError(errorReport: ErrorReport): void {
    this.errorQueue.push(errorReport);
    
    // Store in localStorage for persistence
    try {
      const existingErrors = JSON.parse(localStorage.getItem('errorQueue') || '[]');
      existingErrors.push(errorReport);
      localStorage.setItem('errorQueue', JSON.stringify(existingErrors.slice(-50))); // Keep last 50 errors
    } catch (e) {
      console.warn('Failed to persist error to localStorage:', e);
    }
  }

  private async flushErrorQueue(): Promise<void> {
    // Send queued errors from memory
    const memoryErrors = [...this.errorQueue];
    this.errorQueue = [];

    // Send queued errors from localStorage
    let persistedErrors: ErrorReport[] = [];
    try {
      persistedErrors = JSON.parse(localStorage.getItem('errorQueue') || '[]');
      localStorage.removeItem('errorQueue');
    } catch (e) {
      console.warn('Failed to retrieve persisted errors:', e);
    }

    const allErrors = [...memoryErrors, ...persistedErrors];

    for (const errorReport of allErrors) {
      try {
        await this.sendErrorReport(errorReport);
      } catch (e) {
        // If sending fails, re-queue the error
        this.queueError(errorReport);
      }
    }
  }

  private getCurrentUserId(): string | undefined {
    // This would integrate with your auth system (Clerk)
    try {
      const user = (window as any).Clerk?.user;
      return user?.id;
    } catch (e) {
      return undefined;
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  }
}

export const errorReporting = ErrorReportingService.getInstance();