import { useCallback, useEffect, useState } from 'react';
import { useErrorHandler } from './useErrorHandler';
import { useRetryableOperation } from '../utils/retry';
import { businessValidator } from '../utils/businessErrorHandler';
import { performanceMonitoring } from '../services/performanceMonitoring';
import type { AppError, ValidationError } from '../types/errors';

interface ErrorHandlingOptions {
  enableRetry?: boolean;
  enableBusinessValidation?: boolean;
  enablePerformanceTracking?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorHandlingState {
  isLoading: boolean;
  error: AppError | null;
  retryCount: number;
  canRetry: boolean;
}

export function useComprehensiveErrorHandling(options: ErrorHandlingOptions = {}) {
  const {
    enableRetry = true,
    enableBusinessValidation = true,
    enablePerformanceTracking = true,
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  const [state, setState] = useState<ErrorHandlingState>({
    isLoading: false,
    error: null,
    retryCount: 0,
    canRetry: false
  });

  const { handleError, handleBusinessError, handleValidationError } = useErrorHandler();
  const { executeWithRetry, isRetrying } = useRetryableOperation();

  // Enhanced error handling with context and recovery suggestions
  const handleErrorWithContext = useCallback(async (
    error: Error | AppError,
    context?: Record<string, any>,
    recoveryActions?: string[]
  ) => {
    const startTime = performance.now();

    try {
      // Track error performance impact
      if (enablePerformanceTracking) {
        performanceMonitoring.trackError(error as Error, context);
      }

      // Convert to AppError if needed
      let appError: AppError;
      if ('type' in error) {
        appError = error as AppError;
      } else {
        appError = {
          type: 'SYSTEM_ERROR',
          code: 'UNKNOWN',
          message: error.message,
          timestamp: Date.now(),
          context
        };
      }

      // Add recovery suggestions
      if (recoveryActions) {
        appError.context = { ...appError.context, recoveryActions };
      }

      setState(prev => ({
        ...prev,
        error: appError,
        canRetry: enableRetry && isRetryableError(appError)
      }));

      await handleError(appError, context);

      // Track error handling performance
      if (enablePerformanceTracking) {
        const duration = performance.now() - startTime;
        performanceMonitoring.recordMetric('Error Handling Duration', duration, {
          errorType: appError.type,
          errorCode: (appError as any).code
        });
      }

      return appError;
    } catch (handlingError) {
      console.error('Error in error handling:', handlingError);
      throw handlingError;
    }
  }, [handleError, enablePerformanceTracking, enableRetry]);

  // Execute operation with comprehensive error handling
  const executeOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName?: string,
    context?: Record<string, any>
  ): Promise<T> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let result: T;

      if (enableRetry) {
        result = await executeWithRetry(operation, {
          maxRetries,
          baseDelay: retryDelay,
          onRetry: (attempt, error) => {
            setState(prev => ({ ...prev, retryCount: attempt }));
            
            if (enablePerformanceTracking && operationName) {
              performanceMonitoring.recordMetric(`${operationName} Retry`, attempt, {
                error: error.message,
                context
              });
            }
          }
        });
      } else {
        result = await operation();
      }

      // Success - reset error state
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null,
        retryCount: 0,
        canRetry: false
      }));

      return result;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      
      await handleErrorWithContext(
        error as Error,
        { ...context, operationName },
        getRecoveryActions(error as Error, operationName)
      );
      
      throw error;
    }
  }, [
    executeWithRetry,
    enableRetry,
    maxRetries,
    retryDelay,
    enablePerformanceTracking,
    handleErrorWithContext
  ]);

  // Business logic validation with error handling
  const validateBusinessLogic = useCallback(async (
    validationType: 'orderPlacement' | 'groupOrderParticipation' | 'payment',
    data: any
  ) => {
    if (!enableBusinessValidation) return { isValid: true, errors: [], warnings: [] };

    try {
      let result;
      
      switch (validationType) {
        case 'orderPlacement':
          result = await businessValidator.validateOrderPlacement(data);
          break;
        case 'groupOrderParticipation':
          result = await businessValidator.validateGroupOrderParticipation(data);
          break;
        case 'payment':
          result = await businessValidator.validatePayment(data);
          break;
        default:
          throw new Error(`Unknown validation type: ${validationType}`);
      }

      // Handle business errors
      if (!result.isValid) {
        for (const error of result.errors) {
          await handleBusinessError(error.code, error.message, error.suggestions);
        }
      }

      return result;
    } catch (error) {
      await handleErrorWithContext(error as Error, { validationType, data });
      throw error;
    }
  }, [enableBusinessValidation, handleBusinessError, handleErrorWithContext]);

  // Form validation with error handling
  const validateForm = useCallback(async (
    formData: Record<string, any>,
    validationRules: Record<string, any>
  ) => {
    try {
      const errors: ValidationError[] = [];
      
      // Perform validation (this would use your validation utility)
      for (const [field, rules] of Object.entries(validationRules)) {
        const value = formData[field];
        
        if (rules.required && (!value || value === '')) {
          const error: ValidationError = {
            type: 'VALIDATION_ERROR',
            field,
            value,
            message: `${field} is required`,
            timestamp: Date.now(),
            constraints: ['required']
          };
          
          errors.push(error);
          await handleValidationError(field, value, error.message, error.constraints);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      await handleErrorWithContext(error as Error, { formData, validationRules });
      throw error;
    }
  }, [handleValidationError, handleErrorWithContext]);

  // Retry current operation
  const retry = useCallback(async () => {
    if (!state.canRetry || !state.error) return;

    setState(prev => ({ ...prev, error: null, retryCount: 0 }));
    
    // This would need to be implemented based on your specific retry logic
    // For now, we'll just clear the error state
  }, [state.canRetry, state.error]);

  // Clear error state
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
      canRetry: false,
      retryCount: 0
    }));
  }, []);

  // Monitor for unhandled errors
  useEffect(() => {
    const handleUnhandledError = (event: ErrorEvent) => {
      handleErrorWithContext(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        unhandled: true
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleErrorWithContext(new Error(event.reason), {
        unhandledRejection: true
      });
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleErrorWithContext]);

  return {
    // State
    ...state,
    isRetrying,

    // Methods
    executeOperation,
    validateBusinessLogic,
    validateForm,
    handleError: handleErrorWithContext,
    retry,
    clearError,

    // Utilities
    isRetryableError: (error: AppError) => isRetryableError(error),
    getErrorSeverity: (error: AppError) => getErrorSeverity(error),
    getRecoveryActions: (error: Error, context?: string) => getRecoveryActions(error, context)
  };
}

// Helper functions
function isRetryableError(error: AppError): boolean {
  switch (error.type) {
    case 'NETWORK_ERROR':
      return true;
    case 'SYSTEM_ERROR':
      return error.code !== 'PERMISSION_ERROR';
    case 'BUSINESS_ERROR':
      return false; // Business errors usually aren't retryable
    case 'VALIDATION_ERROR':
      return false; // Validation errors need user input
    default:
      return false;
  }
}

function getErrorSeverity(error: AppError): 'low' | 'medium' | 'high' | 'critical' {
  switch (error.type) {
    case 'VALIDATION_ERROR':
      return 'low';
    case 'BUSINESS_ERROR':
      return 'medium';
    case 'NETWORK_ERROR':
      return 'medium';
    case 'AUTH_ERROR':
      return 'high';
    case 'SYSTEM_ERROR':
      return error.code === 'DATABASE_ERROR' ? 'critical' : 'high';
    default:
      return 'medium';
  }
}

function getRecoveryActions(error: Error, context?: string): string[] {
  const message = error.message.toLowerCase();
  const actions: string[] = [];

  if (message.includes('network') || message.includes('fetch')) {
    actions.push('Check your internet connection');
    actions.push('Try again in a few moments');
  }

  if (message.includes('timeout')) {
    actions.push('The request timed out - try again');
    actions.push('Check if the service is available');
  }

  if (message.includes('unauthorized') || message.includes('permission')) {
    actions.push('Please log in again');
    actions.push('Contact support if the issue persists');
  }

  if (message.includes('validation') || message.includes('invalid')) {
    actions.push('Please check your input and try again');
    actions.push('Make sure all required fields are filled');
  }

  if (context === 'payment') {
    actions.push('Try a different payment method');
    actions.push('Contact your bank if the issue persists');
  }

  if (actions.length === 0) {
    actions.push('Refresh the page and try again');
    actions.push('Contact support if the problem continues');
  }

  return actions;
}