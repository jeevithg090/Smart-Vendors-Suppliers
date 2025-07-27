import { ConvexError } from 'convex/values';
import { ConvexRetryManager, circuitBreakers } from './retry';
import { performanceMonitoring } from '../services/performanceMonitoring';
import type { AppError, NetworkError, BusinessError } from '../types/errors';

export class ConvexErrorHandler {
  static async executeQuery<T>(
    queryFn: () => Promise<T>,
    queryName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      return await circuitBreakers.convex.execute(async () => {
        return await ConvexRetryManager.withConvexRetry(queryFn, {
          maxRetries: 3,
          baseDelay: 500,
          onRetry: (attempt, error) => {
            performanceMonitoring.recordMetric(`${queryName} Query Retry`, attempt, {
              error: error.message,
              context
            });
          }
        });
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track the error
      performanceMonitoring.trackAPICall(
        `convex://${queryName}`,
        'QUERY',
        duration,
        this.getErrorStatus(error),
        0
      );

      // Convert to AppError
      const appError = this.convertConvexError(error, queryName, context);
      throw appError;
    } finally {
      const duration = performance.now() - startTime;
      performanceMonitoring.recordMetric(`${queryName} Query Duration`, duration, context);
    }
  }

  static async executeMutation<T>(
    mutationFn: () => Promise<T>,
    mutationName: string,
    context?: Record<string, any>
  ): Promise<T> {
    const startTime = performance.now();

    try {
      return await circuitBreakers.convex.execute(async () => {
        return await ConvexRetryManager.withConvexRetry(mutationFn, {
          maxRetries: 2, // Fewer retries for mutations to avoid duplicate operations
          baseDelay: 1000,
          retryCondition: (error) => {
            // Only retry on network/server errors, not business logic errors
            return this.isRetryableMutationError(error);
          },
          onRetry: (attempt, error) => {
            performanceMonitoring.recordMetric(`${mutationName} Mutation Retry`, attempt, {
              error: error.message,
              context
            });
          }
        });
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Track the error
      performanceMonitoring.trackAPICall(
        `convex://${mutationName}`,
        'MUTATION',
        duration,
        this.getErrorStatus(error),
        0
      );

      // Convert to AppError
      const appError = this.convertConvexError(error, mutationName, context);
      throw appError;
    } finally {
      const duration = performance.now() - startTime;
      performanceMonitoring.recordMetric(`${mutationName} Mutation Duration`, duration, context);
    }
  }

  private static convertConvexError(
    error: any,
    operationName: string,
    context?: Record<string, any>
  ): AppError {
    // Handle ConvexError
    if (error instanceof ConvexError) {
      return this.handleConvexError(error, operationName, context);
    }

    // Handle network errors
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      const networkError: NetworkError = {
        type: 'NETWORK_ERROR',
        code: 'CONNECTION_FAILED',
        message: `Failed to connect to Convex: ${error.message}`,
        timestamp: Date.now(),
        retryable: true,
        context: { ...context, operationName, convexError: true }
      };
      return networkError;
    }

    // Handle timeout errors
    if (error.message?.includes('timeout')) {
      const networkError: NetworkError = {
        type: 'NETWORK_ERROR',
        code: 'TIMEOUT',
        message: `Convex operation timed out: ${operationName}`,
        timestamp: Date.now(),
        retryable: true,
        context: { ...context, operationName, convexError: true }
      };
      return networkError;
    }

    // Default system error
    return {
      type: 'SYSTEM_ERROR',
      code: 'DATABASE_ERROR',
      message: `Convex ${operationName} failed: ${error.message}`,
      timestamp: Date.now(),
      context: { ...context, operationName, convexError: true }
    };
  }

  private static handleConvexError(
    error: ConvexError<any>,
    operationName: string,
    context?: Record<string, any>
  ): AppError {
    const errorData = error.data;

    // Handle business logic errors
    if (errorData?.type === 'business') {
      const businessError: BusinessError = {
        type: 'BUSINESS_ERROR',
        code: errorData.code || 'UNKNOWN',
        message: error.message,
        timestamp: Date.now(),
        suggestions: errorData.suggestions || [],
        actionable: true,
        context: { ...context, operationName, convexError: true }
      };
      return businessError;
    }

    // Handle validation errors
    if (errorData?.type === 'validation') {
      return {
        type: 'VALIDATION_ERROR',
        field: errorData.field || 'unknown',
        value: errorData.value,
        message: error.message,
        timestamp: Date.now(),
        constraints: errorData.constraints || [],
        context: { ...context, operationName, convexError: true }
      };
    }

    // Handle authentication errors
    if (errorData?.type === 'auth') {
      return {
        type: 'AUTH_ERROR',
        code: errorData.code || 'UNAUTHORIZED',
        message: error.message,
        timestamp: Date.now(),
        context: { ...context, operationName, convexError: true }
      };
    }

    // Default to system error
    return {
      type: 'SYSTEM_ERROR',
      code: 'DATABASE_ERROR',
      message: error.message,
      timestamp: Date.now(),
      context: { ...context, operationName, convexError: true }
    };
  }

  private static isRetryableMutationError(error: any): boolean {
    // Don't retry business logic errors
    if (error instanceof ConvexError && error.data?.type === 'business') {
      return false;
    }

    // Don't retry validation errors
    if (error instanceof ConvexError && error.data?.type === 'validation') {
      return false;
    }

    // Don't retry auth errors
    if (error instanceof ConvexError && error.data?.type === 'auth') {
      return false;
    }

    // Retry network and server errors
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return true;
    }

    // Retry server overload
    if (error.message?.includes('overload') || error.message?.includes('rate limit')) {
      return true;
    }

    return false;
  }

  private static getErrorStatus(error: any): number {
    if (error instanceof ConvexError) {
      const errorData = error.data;
      switch (errorData?.type) {
        case 'validation':
          return 400;
        case 'auth':
          return 401;
        case 'business':
          return 422;
        default:
          return 500;
      }
    }

    if (error.message?.includes('network')) {
      return 0; // Network error
    }

    if (error.message?.includes('timeout')) {
      return 408;
    }

    return 500;
  }

  // Utility method to wrap Convex hooks with error handling
  static wrapConvexHook<T>(
    hookResult: T | undefined,
    hookName: string,
    context?: Record<string, any>
  ): T | undefined {
    // If there's an error in the hook result, handle it
    if (hookResult === undefined) {
      // This might indicate a loading state or error
      // We could track this as a potential issue
      performanceMonitoring.recordMetric(`${hookName} Hook Undefined`, Date.now(), context);
    }

    return hookResult;
  }

  // Method to handle Convex subscription errors
  static handleSubscriptionError(
    error: any,
    subscriptionName: string,
    context?: Record<string, any>
  ): void {
    performanceMonitoring.recordMetric(`${subscriptionName} Subscription Error`, Date.now(), {
      error: error.message,
      context
    });

    // Log subscription errors for monitoring
    console.error(`Convex subscription error in ${subscriptionName}:`, error);
  }
}

// Utility functions for common Convex operations
export const convexUtils = {
  // Wrapper for useQuery with error handling
  safeQuery: <T>(
    result: T | undefined,
    queryName: string,
    context?: Record<string, any>
  ): T | undefined => {
    return ConvexErrorHandler.wrapConvexHook(result, queryName, context);
  },

  // Wrapper for useMutation with error handling
  safeMutation: <T extends (...args: any[]) => Promise<any>>(
    mutation: T,
    mutationName: string
  ): T => {
    return (async (...args: Parameters<T>) => {
      return ConvexErrorHandler.executeMutation(
        () => mutation(...args),
        mutationName,
        { args }
      );
    }) as T;
  }
};