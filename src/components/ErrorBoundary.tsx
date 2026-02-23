import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { SystemError } from '../types/errors';
import { errorReporting } from '../services/errorReporting';
import { performanceMonitoring } from '../services/performanceMonitoring';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // Whether to isolate this boundary from parent boundaries
  retryable?: boolean; // Whether to show retry button
  maxRetries?: number; // Maximum number of retries allowed
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null, 
      retryCount: 0,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Record performance impact
    performanceMonitoring.recordMetric('Error Boundary Triggered', Date.now(), {
      errorMessage: error.message,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      errorId: this.state.errorId
    });

    // Track error frequency for this boundary
    performanceMonitoring.trackError(error, {
      errorBoundary: true,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      errorId: this.state.errorId,
      isolate: this.props.isolate
    });

    // Report the error with enhanced context
    const systemError: SystemError = {
      type: 'SYSTEM_ERROR',
      code: this.categorizeError(error),
      message: error.message,
      timestamp: Date.now(),
      stack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      context: {
        errorBoundary: true,
        componentStack: errorInfo.componentStack || undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
        retryCount: this.state.retryCount,
        errorId: this.state.errorId,
        isolate: this.props.isolate,
        performanceMetrics: performanceMonitoring.getPerformanceSummary(),
        memoryUsage: this.getMemoryUsage(),
        networkStatus: navigator.onLine ? 'online' : 'offline'
      }
    };

    errorReporting.reportError(systemError);
  }

  componentDidUpdate(prevProps: Props) {
    // Allow recovery when parent rerenders with different children after an error.
    if (this.state.hasError && prevProps.children !== this.props.children) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  }

  private categorizeError(error: Error): SystemError['code'] {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('chunk') || message.includes('loading')) {
      return 'CHUNK_LOAD_ERROR';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (stack.includes('convex') || message.includes('database')) {
      return 'DATABASE_ERROR';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'PERMISSION_ERROR';
    }
    return 'UNKNOWN';
  }

  private getMemoryUsage(): Record<string, number> | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return null;
  }

  private handleRetry = async () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      // Max retries reached, show different UI or escalate
      this.handleMaxRetriesReached();
      return;
    }

    const nextRetryCount = this.state.retryCount + 1;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: nextRetryCount
    });

    performanceMonitoring.recordMetric('Error Boundary Retry Success', nextRetryCount, {
      errorId: this.state.errorId,
      totalRetries: nextRetryCount
    });
  };

  private handleMaxRetriesReached = () => {
    // Track max retries reached
    performanceMonitoring.recordMetric('Error Boundary Max Retries Reached', this.state.retryCount, {
      errorId: this.state.errorId,
      errorMessage: this.state.error?.message
    });

    // Could show a different UI or redirect to a safe page
    if (this.props.isolate) {
      // If isolated, just show error state
      return;
    }

    // Otherwise, might want to redirect to home or show escalated error
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback && this.state.error && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo);
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full space-y-8">
            <div className="text-center">
              <div className="mx-auto h-12 w-12 text-red-500">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Something went wrong
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We're sorry, but something unexpected happened. Our team has been notified.
              </p>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <h3 className="text-sm font-medium text-red-800">Error Details (Development)</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p className="font-mono">{this.state.error.message}</p>
                  {this.state.error.stack && (
                    <pre className="mt-2 text-xs overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </div>
            )}

            <div className="flex space-x-4">
              {this.props.retryable !== false && this.state.retryCount < (this.props.maxRetries || 3) && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
                  disabled={this.state.retryCount >= (this.props.maxRetries || 3)}
                >
                  Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/${this.props.maxRetries || 3})`}
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Reload Page
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Error ID: {this.state.errorId}
              </p>
              {this.state.retryCount > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Retry attempts: {this.state.retryCount}/{this.props.maxRetries || 3}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
