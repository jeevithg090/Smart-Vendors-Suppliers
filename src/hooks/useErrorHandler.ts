import { useCallback } from 'react';
import type { AppError, NetworkError, BusinessError, ValidationError } from '../types/errors';
import { errorReporting } from '../services/errorReporting';

interface UseErrorHandlerOptions {
  showNotification?: boolean;
  logToConsole?: boolean;
  reportToService?: boolean;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const {
    showNotification = true,
    logToConsole = true,
    reportToService = true
  } = options;

  const handleError = useCallback(async (error: AppError | Error, context?: Record<string, any>) => {
    let appError: AppError;

    // Convert generic Error to AppError
    if (!(error as AppError).type) {
      appError = {
        type: 'SYSTEM_ERROR',
        code: 'UNKNOWN',
        message: error.message,
        timestamp: Date.now(),
        context
      };
    } else {
      appError = error as AppError;
      if (context) {
        appError.context = { ...appError.context, ...context };
      }
    }

    // Log to console if enabled
    if (logToConsole) {
      console.error('Error handled:', appError);
    }

    // Report to error service if enabled
    if (reportToService) {
      try {
        await errorReporting.reportError(appError);
      } catch (reportingError) {
        console.warn('Failed to report error:', reportingError);
      }
    }

    // Show user notification if enabled
    if (showNotification) {
      showErrorNotification(appError);
    }

    return appError;
  }, [showNotification, logToConsole, reportToService]);

  const handleNetworkError = useCallback(async (error: Error, retryable = true) => {
    const networkError: NetworkError = {
      type: 'NETWORK_ERROR',
      code: 'CONNECTION_FAILED',
      message: error.message,
      timestamp: Date.now(),
      retryable
    };

    return handleError(networkError);
  }, [handleError]);

  const handleValidationError = useCallback(async (field: string, value: any, message: string, constraints: string[] = []) => {
    const validationError: ValidationError = {
      type: 'VALIDATION_ERROR',
      field,
      value,
      message,
      timestamp: Date.now(),
      constraints
    };

    return handleError(validationError);
  }, [handleError]);

  const handleBusinessError = useCallback(async (code: BusinessError['code'], message: string, suggestions: string[] = []) => {
    const businessError: BusinessError = {
      type: 'BUSINESS_ERROR',
      code,
      message,
      timestamp: Date.now(),
      suggestions,
      actionable: suggestions.length > 0
    };

    return handleError(businessError);
  }, [handleError]);

  return {
    handleError,
    handleNetworkError,
    handleValidationError,
    handleBusinessError
  };
}

function showErrorNotification(error: AppError) {
  // This would integrate with your notification system
  // For now, we'll use a simple approach
  const message = getUserFriendlyMessage(error);
  
  // You could integrate with a toast library here
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Error', { body: message });
  } else {
    // Fallback to console or custom notification component
    console.warn('User notification:', message);
  }
}

function getUserFriendlyMessage(error: AppError): string {
  switch (error.type) {
    case 'AUTH_ERROR':
      switch (error.code) {
        case 'SESSION_EXPIRED':
          return 'Your session has expired. Please log in again.';
        case 'UNAUTHORIZED':
          return 'You don\'t have permission to perform this action.';
        case 'INVALID_CREDENTIALS':
          return 'Invalid email or password. Please try again.';
        default:
          return 'Authentication error occurred.';
      }
    
    case 'NETWORK_ERROR':
      switch (error.code) {
        case 'CONNECTION_FAILED':
          return 'Unable to connect to the server. Please check your internet connection.';
        case 'TIMEOUT':
          return 'Request timed out. Please try again.';
        case 'SERVER_ERROR':
          return 'Server error occurred. Please try again later.';
        default:
          return 'Network error occurred.';
      }
    
    case 'BUSINESS_ERROR':
      switch (error.code) {
        case 'INSUFFICIENT_STOCK':
          return 'Insufficient stock available for this item.';
        case 'ORDER_EXPIRED':
          return 'This order has expired. Please create a new order.';
        case 'PAYMENT_FAILED':
          return 'Payment failed. Please try again or use a different payment method.';
        case 'SUPPLIER_UNAVAILABLE':
          return 'This supplier is currently unavailable.';
        case 'GROUP_ORDER_FULL':
          return 'This group order is full and cannot accept more participants.';
        default:
          return error.message;
      }
    
    case 'VALIDATION_ERROR':
      return `${error.field}: ${error.message}`;
    
    default:
      return error.message || 'An unexpected error occurred.';
  }
}