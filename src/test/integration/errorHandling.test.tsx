import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { RetryManager, offlineQueue } from '../../utils/retry';
import { errorReporting } from '../../services/errorReporting';
import { performanceMonitoring } from '../../services/performanceMonitoring';

// Mock services
vi.mock('../../services/errorReporting');
vi.mock('../../services/performanceMonitoring');

function TestComponent({ errorType }: { errorType?: string }) {
  const { handleError, handleNetworkError, handleBusinessError } = useErrorHandler();

  const triggerError = async () => {
    switch (errorType) {
      case 'network':
        await handleNetworkError(new Error('Network failed'));
        break;
      case 'business':
        await handleBusinessError('INSUFFICIENT_STOCK', 'Not enough stock', ['Try different supplier']);
        break;
      default:
        await handleError(new Error('Generic error'));
    }
  };

  return (
    <div>
      <button onClick={triggerError} data-testid="trigger-error">
        Trigger Error
      </button>
      <div data-testid="content">Normal content</div>
    </div>
  );
}

function RuntimeErrorTrigger() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Runtime error');
  }

  return (
    <button onClick={() => setShouldThrow(true)} data-testid="trigger-runtime-error">
      Trigger Runtime Error
    </button>
  );
}

describe('Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Error Boundary Integration', () => {
    it('should catch and handle runtime errors', async () => {
      render(
        <ErrorBoundary>
          <RuntimeErrorTrigger />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('trigger-runtime-error'));

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });

      expect(errorReporting.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SYSTEM_ERROR',
          message: 'Runtime error',
        })
      );
    });

    it('should allow recovery from errors', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <RuntimeErrorTrigger />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('trigger-runtime-error'));

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText(/Try Again/));

      rerender(
        <ErrorBoundary>
          <div data-testid="content">Normal content</div>
        </ErrorBoundary>
      );

      await waitFor(() => {
        expect(screen.getByTestId('content')).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network errors with retry', async () => {
      let attemptCount = 0;
      const mockOperation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Network error');
        }
        return Promise.resolve('success');
      });

      const result = await RetryManager.withRetry(mockOperation, {
        maxRetries: 3,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should queue operations when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const mockOperation = vi.fn().mockResolvedValue('success');

      await offlineQueue.enqueue({
        type: 'CREATE_ORDER',
        execute: mockOperation,
        data: { orderId: 'test-order' },
      });

      expect(mockOperation).not.toHaveBeenCalled();

      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(mockOperation).toHaveBeenCalled();
      });
    });
  });

  describe('Business Logic Error Handling', () => {
    it('should handle business errors with suggestions', async () => {
      render(<TestComponent errorType="business" />);

      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(errorReporting.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'BUSINESS_ERROR',
            code: 'INSUFFICIENT_STOCK',
            message: 'Not enough stock',
            actionable: true,
          }),
          undefined
        );
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should record performance metrics for errors', async () => {
      render(
        <ErrorBoundary>
          <RuntimeErrorTrigger />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('trigger-runtime-error'));

      await waitFor(() => {
        expect(performanceMonitoring.recordMetric).toHaveBeenCalledWith(
          'Error Boundary Triggered',
          expect.any(Number),
          expect.objectContaining({
            errorMessage: 'Runtime error',
          })
        );
      });
    });

    it('should measure operation performance', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      vi.mocked(performanceMonitoring.measureOperation).mockImplementation(
        async (_operationName: string, operation: () => Promise<unknown>) => operation()
      );

      await performanceMonitoring.measureOperation('test-operation', mockOperation);

      expect(mockOperation).toHaveBeenCalled();
      expect(performanceMonitoring.measureOperation).toHaveBeenCalledWith(
        'test-operation',
        mockOperation
      );
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle cascading errors gracefully', async () => {
      const mockFailingOperation = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'))
        .mockResolvedValueOnce('success');

      const result = await RetryManager.withRetry(mockFailingOperation, {
        maxRetries: 3,
        baseDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockFailingOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed error types in sequence', async () => {
      const { result } = renderHook(() => useErrorHandler());

      await act(async () => {
        await result.current.handleError(new Error('Generic error'));
        await result.current.handleNetworkError(new Error('Network error'));
        await result.current.handleBusinessError('PAYMENT_FAILED', 'Payment failed');
      });

      expect(errorReporting.reportError).toHaveBeenCalledTimes(3);
      expect(errorReporting.reportError).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ type: 'SYSTEM_ERROR' }),
        undefined
      );
      expect(errorReporting.reportError).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ type: 'NETWORK_ERROR' }),
        undefined
      );
      expect(errorReporting.reportError).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({ type: 'BUSINESS_ERROR' }),
        undefined
      );
    });
  });

  describe('Error Context and Metadata', () => {
    it('should include relevant context in error reports', async () => {
      const { result } = renderHook(() => useErrorHandler());

      await act(async () => {
        await result.current.handleError(new Error('Test error'), {
          userId: 'user-123',
          action: 'place-order',
          orderId: 'order-456',
        });
      });

      expect(errorReporting.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user-123',
            action: 'place-order',
            orderId: 'order-456',
          }),
        }),
        undefined
      );
    });

    it('should capture performance context in error reports', async () => {
      render(
        <ErrorBoundary>
          <RuntimeErrorTrigger />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('trigger-runtime-error'));

      await waitFor(() => {
        expect(errorReporting.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              errorBoundary: true,
              url: expect.any(String),
              userAgent: expect.any(String),
            }),
          })
        );
      });
    });
  });
});
