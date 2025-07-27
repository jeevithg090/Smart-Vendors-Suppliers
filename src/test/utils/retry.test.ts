import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RetryManager, ConvexRetryManager, OfflineOperationQueue, CircuitBreaker } from '../../utils/retry';

describe('RetryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await RetryManager.withRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');
    
    const result = await RetryManager.withRetry(operation, { maxRetries: 3, baseDelay: 10 });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should fail after max retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Persistent failure'));
    
    await expect(RetryManager.withRetry(operation, { maxRetries: 2, baseDelay: 10 }))
      .rejects.toThrow('Persistent failure');
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should not retry when condition is false', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Client error'));
    
    await expect(RetryManager.withRetry(operation, {
      maxRetries: 3,
      baseDelay: 10,
      retryCondition: () => false
    })).rejects.toThrow('Client error');
    
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should call onRetry callback', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success');
    
    const onRetry = vi.fn();
    
    await RetryManager.withRetry(operation, { 
      maxRetries: 2, 
      baseDelay: 10,
      onRetry 
    });
    
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  });

  it('should apply exponential backoff', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockRejectedValueOnce(new Error('Second failure'))
      .mockResolvedValue('success');
    
    const startTime = Date.now();
    
    await RetryManager.withRetry(operation, {
      maxRetries: 3,
      baseDelay: 100,
      backoffFactor: 2
    });
    
    const duration = Date.now() - startTime;
    expect(duration).toBeGreaterThan(200); // At least base delay + backoff
  });
});

describe('ConvexRetryManager', () => {
  it('should retry on Convex-specific errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ code: 'OVERLOADED', message: 'Server overloaded' })
      .mockResolvedValue('success');
    
    const result = await ConvexRetryManager.withConvexRetry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable Convex errors', async () => {
    const operation = vi.fn().mockRejectedValue({ code: 'INVALID_ARGUMENT', message: 'Invalid data' });
    
    await expect(ConvexRetryManager.withConvexRetry(operation))
      .rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    
    expect(operation).toHaveBeenCalledTimes(1);
  });
});

describe('OfflineOperationQueue', () => {
  let queue: OfflineOperationQueue;

  beforeEach(() => {
    queue = OfflineOperationQueue.getInstance();
    // Clear any existing queue
    (queue as any).queue = [];
    localStorage.clear();
    sessionStorage.clear();
  });

  it('should enqueue operations when offline', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
    
    const operation = vi.fn().mockResolvedValue('success');
    
    await queue.enqueue({
      type: 'CREATE_ORDER',
      execute: operation,
      data: { orderId: 'test' }
    });
    
    const status = queue.getQueueStatus();
    expect(status.pending).toBe(1);
    expect(operation).not.toHaveBeenCalled();
  });

  it('should process queue when online', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    // Add operation to queue
    await queue.enqueue({
      type: 'CREATE_ORDER',
      execute: operation,
      data: { orderId: 'test' }
    });
    
    // Simulate going online
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    window.dispatchEvent(new Event('online'));
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(operation).toHaveBeenCalled();
  });

  it('should persist queue to localStorage', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    await queue.enqueue({
      type: 'CREATE_ORDER',
      execute: operation,
      data: { orderId: 'test' }
    });
    
    const stored = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].type).toBe('CREATE_ORDER');
  });

  it('should retry failed operations', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue('success');
    
    await queue.enqueue({
      type: 'CREATE_ORDER',
      execute: operation,
      data: { orderId: 'test' },
      maxRetries: 2
    });
    
    // Simulate processing
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
    window.dispatchEvent(new Event('online'));
    
    // Wait for retry
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(2, 1000); // threshold: 2, timeout: 1s
  });

  it('should execute operation when circuit is closed', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await circuitBreaker.execute(operation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should open circuit after threshold failures', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Service error'));
    
    // First failure
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe('CLOSED');
    
    // Second failure - should open circuit
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Third attempt should fail immediately
    await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    expect(operation).toHaveBeenCalledTimes(2); // Not called on third attempt
  });

  it('should transition to half-open after timeout', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Service error'));
    
    // Trigger circuit to open
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    expect(circuitBreaker.getState()).toBe('OPEN');
    
    // Wait for timeout (mock time passage)
    vi.advanceTimersByTime(1100);
    
    // Next call should transition to half-open
    const successOperation = vi.fn().mockResolvedValue('success');
    const result = await circuitBreaker.execute(successOperation);
    
    expect(result).toBe('success');
    expect(circuitBreaker.getState()).toBe('CLOSED');
  });

  it('should track failure count', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Service error'));
    
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    expect(circuitBreaker.getFailureCount()).toBe(1);
    
    await expect(circuitBreaker.execute(operation)).rejects.toThrow();
    expect(circuitBreaker.getFailureCount()).toBe(2);
  });

  it('should reset failure count on success', async () => {
    const failingOperation = vi.fn().mockRejectedValue(new Error('Service error'));
    const successOperation = vi.fn().mockResolvedValue('success');
    
    // One failure
    await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow();
    expect(circuitBreaker.getFailureCount()).toBe(1);
    
    // Success should reset count
    await circuitBreaker.execute(successOperation);
    expect(circuitBreaker.getFailureCount()).toBe(0);
  });
});