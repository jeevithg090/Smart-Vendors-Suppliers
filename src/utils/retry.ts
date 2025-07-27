import { useState, useCallback } from 'react';
// import type { NetworkError } from '../types/errors';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { performanceMonitoring } from '../services/performanceMonitoring';

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  retryCondition?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryManager {
  private static defaultOptions: Required<RetryOptions> = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryCondition: (error: any) => {
      // Retry on network errors, timeouts, and 5xx server errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return true;
      }
      if (error.status >= 500 && error.status < 600) {
        return true;
      }
      if (error.code === 'TIMEOUT' || error.code === 'CONNECTION_FAILED') {
        return true;
      }
      return false;
    },
    onRetry: () => {}
  };

  static async withRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const config = { ...this.defaultOptions, ...options };
    let lastError: any;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry if this is the last attempt
        if (attempt === config.maxRetries) {
          break;
        }

        // Check if we should retry this error
        if (!config.retryCondition(error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt),
          config.maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * 1000;

        config.onRetry(attempt + 1, error);

        await this.sleep(jitteredDelay);
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Specialized retry for Convex operations
export class ConvexRetryManager {
  static async withConvexRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const convexOptions: RetryOptions = {
      maxRetries: 3,
      baseDelay: 500,
      retryCondition: (error: any) => {
        // Retry on network issues and temporary server errors
        if (error.message?.includes('network') || error.message?.includes('timeout')) {
          return true;
        }
        // Retry on Convex-specific transient errors
        if (error.code === 'OVERLOADED' || error.code === 'INTERNAL_SERVER_ERROR') {
          return true;
        }
        return false;
      },
      ...options
    };

    return RetryManager.withRetry(operation, convexOptions);
  }
}

// Queue for offline operations
export class OfflineOperationQueue {
  private static instance: OfflineOperationQueue;
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private isOnline = navigator.onLine;

  private constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Load persisted queue from localStorage
    this.loadPersistedQueue();
  }

  static getInstance(): OfflineOperationQueue {
    if (!OfflineOperationQueue.instance) {
      OfflineOperationQueue.instance = new OfflineOperationQueue();
    }
    return OfflineOperationQueue.instance;
  }

  async enqueue(operation: QueuedOperation): Promise<void> {
    this.queue.push({
      ...operation,
      id: operation.id || crypto.randomUUID(),
      timestamp: Date.now(),
      attempts: 0
    });

    this.persistQueue();

    if (this.isOnline) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0 && this.isOnline) {
      const operation = this.queue[0];
      
      try {
        await this.executeOperation(operation);
        this.queue.shift(); // Remove successful operation
        this.persistQueue();
      } catch (error) {
        operation.attempts = (operation.attempts || 0) + 1;
        
        if (operation.attempts >= (operation.maxRetries || 3)) {
          // Remove failed operation after max retries
          this.queue.shift();
          console.error('Operation failed after max retries:', operation, error);
        } else {
          // Move to end of queue for retry
          this.queue.push(this.queue.shift()!);
        }
        
        this.persistQueue();
        
        // Wait before processing next operation
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.isProcessing = false;
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    switch (operation.type) {
      case 'CREATE_ORDER':
        // Execute order creation
        await this.executeWithRetry(() => operation.execute());
        break;
      case 'UPDATE_PROFILE':
        // Execute profile update
        await this.executeWithRetry(() => operation.execute());
        break;
      case 'SUBMIT_RATING':
        // Execute rating submission
        await this.executeWithRetry(() => operation.execute());
        break;
      default:
        await this.executeWithRetry(() => operation.execute());
    }
  }

  private async executeWithRetry(operation: () => Promise<any>): Promise<void> {
    return RetryManager.withRetry(operation, {
      maxRetries: 2,
      baseDelay: 1000,
      retryCondition: (error) => {
        // Don't retry validation errors or client errors
        if (error.status >= 400 && error.status < 500) {
          return false;
        }
        return true;
      }
    });
  }

  private persistQueue(): void {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to persist offline queue:', error);
    }
  }

  private loadPersistedQueue(): void {
    try {
      const persistedQueue = localStorage.getItem('offlineQueue');
      if (persistedQueue) {
        this.queue = JSON.parse(persistedQueue);
      }
    } catch (error) {
      console.warn('Failed to load persisted queue:', error);
      this.queue = [];
    }
  }

  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.isProcessing
    };
  }
}

export interface QueuedOperation {
  id?: string;
  type: 'CREATE_ORDER' | 'UPDATE_PROFILE' | 'SUBMIT_RATING' | 'SEND_MESSAGE' | 'GENERIC';
  execute: () => Promise<any>;
  data: any;
  timestamp?: number;
  attempts?: number;
  maxRetries?: number;
}

// Export singleton instance
export const offlineQueue = OfflineOperationQueue.getInstance();

// Enhanced retry with exponential backoff and jitter
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 1000; // Add up to 1 second of jitter
      const delay = Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
      
      // Track retry attempt
      performanceMonitoring.recordMetric('Retry Attempt', attempt + 1, {
        error: (error as Error).message,
        delay,
        operation: operation.name || 'anonymous'
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Enhanced retry wrapper for React components
export function useRetryableOperation() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { handleError } = useErrorHandler();

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> => {
    setIsRetrying(true);
    setRetryCount(0);

    try {
      const result = await RetryManager.withRetry(operation, {
        ...options,
        onRetry: (attempt, error) => {
          setRetryCount(attempt);
          options.onRetry?.(attempt, error);
        }
      });
      
      setIsRetrying(false);
      setRetryCount(0);
      return result;
    } catch (error) {
      setIsRetrying(false);
      setRetryCount(0);
      await handleError(error as Error);
      throw error;
    }
  }, [handleError]);

  return {
    executeWithRetry,
    isRetrying,
    retryCount
  };
}

// Circuit breaker pattern for failing services
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private threshold: number;
  private timeout: number;
  // private monitoringPeriod: number;

  constructor(
    threshold = 5,
    timeout = 60000, // 1 minute
    _monitoringPeriod = 10000 // 10 seconds
  ) {
    this.threshold = threshold;
    this.timeout = timeout;
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }

  getFailureCount(): number {
    return this.failures;
  }
}

// Service-specific circuit breakers
export const circuitBreakers = {
  convex: new CircuitBreaker(3, 30000), // More sensitive for database
  external: new CircuitBreaker(5, 60000), // Less sensitive for external APIs
  payment: new CircuitBreaker(2, 120000) // Very sensitive for payment
};