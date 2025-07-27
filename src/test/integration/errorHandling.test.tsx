import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { RetryManager, offlineQueue } from '../../utils/retry';
import { errorReporting } from '../../services/errorReporting';
import { performanceMonitoring } from '../../services/performanceMonitoring';

// Mock services
vi.mock('../../services/errorReporting');
vi.mock('../../services/performanceMonitoring');

// Test component that can trigger various errors
function TestComponent({ errorType }: { errorType?: string }) {
  const { handleError, handleNetworkError, handleBusinessError } = useErrorHandler();

  const triggerError = async () => {
    switch (errorType) {
      case 'network':
        await handleNetworkError(new Error('Network failed'));
        break;
      case 'business':
        await handleBusinessError('INSUFFICIENT_STOCK', 'Not enough stock');
        break;
      case 'runtime':
        throw new Error('Runtime error');
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
          <TestComponent errorType="runtime" />
        </ErrorBoundary>
      );

      const triggerButton = screen.getByTestId('trigger-error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });

      expect(errorReporting.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SYSTEM_ERROR',
          message: 'Runtime error'
        })
      );
    });

    it('should allow recovery from errors', async () => {
      const { rerender } = render(
        <ErrorBoundary>
          <TestComponent errorType="runtime" />
        </ErrorBoundary>
      );

      // Trigger error
      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      // Re-render without error
      rerender(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('content')).toBeInTheDocument();
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
        baseDelay: 10 // Short delay for testing
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should queue operations when offline', async () => {
      // Simulate offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const mockOperation = vi.fn().mockResolvedValue('success');
      
      await offlineQueue.enqueue({
        type: 'CREATE_ORDER',
        execute: mockOperation,
        data: { orderId: 'test-order' }
      });

      // Operation should be queued, not executed immediately
      expect(mockOperation).not.toHaveBeenCalled();

      // Simulate going online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Trigger online event
      window.dispatchEvent(new Event('online'));

      // Wait for queue processing
      await waitFor(() => {
        expect(mockOperation).toHaveBeenCalled();
      });
    });
  });

  describe('Business Logic Error Handling', () => {
    it('should handle business errors with suggestions', async () => {
      render(<TestComponent errorType="business" />);

      const triggerButton = screen.getByTestId('trigger-error');
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(errorReporting.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'BUSINESS_ERROR',
            code: 'INSUFFICIENT_STOCK',
            message: 'Not enough stock',
            actionable: true
          })
        );
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should record performance metrics for errors', async () => {
      render(
        <ErrorBoundary>
          <TestComponent errorType="runtime" />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(performanceMonitoring.recordMetric).toHaveBeenCalledWith(
          'Error Boundary Triggered',
          expect.any(Number),
          expect.objectContaining({
            errorMessage: 'Runtime error'
          })
        );
      });
    });

    it('should measure operation performance', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');
      
      await performanceMonitoring.measureOperation('test-operation', mockOperation);

      expect(mockOperation).toHaveBeenCalled();
      expect(performanceMonitoring.recordMetric).toHaveBeenCalledWith(
        'Custom test-operation',
        expect.any(Number)
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
        baseDelay: 10
      });

      expect(result).toBe('success');
      expect(mockFailingOperation).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed error types in sequence', async () => {
      const { handleError, handleNetworkError, handleBusinessError } = useErrorHandler();

      // Trigger multiple error types
      await handleError(new Error('Generic error'));
      await handleNetworkError(new Error('Network error'));
      await handleBusinessError('PAYMENT_FAILED', 'Payment failed');

      expect(errorReporting.reportError).toHaveBeenCalledTimes(3);
      expect(errorReporting.reportError).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({ type: 'SYSTEM_ERROR' })
      );
      expect(errorReporting.reportError).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({ type: 'NETWORK_ERROR' })
      );
      expect(errorReporting.reportError).toHaveBeenNthCalledWith(3, 
        expect.objectContaining({ type: 'BUSINESS_ERROR' })
      );
    });
  });

  describe('Error Context and Metadata', () => {
    it('should include relevant context in error reports', async () => {
      const { handleError } = useErrorHandler();
      
      await handleError(new Error('Test error'), {
        userId: 'user-123',
        action: 'place-order',
        orderId: 'order-456'
      });

      expect(errorReporting.reportError).toHaveBeenCalledWith(
        expect.objectContaining({
          context: expect.objectContaining({
            userId: 'user-123',
            action: 'place-order',
            orderId: 'order-456'
          })
        })
      );
    });

    it('should capture performance context in error reports', async () => {
      render(
        <ErrorBoundary>
          <TestComponent errorType="runtime" />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByTestId('trigger-error'));

      await waitFor(() => {
        expect(errorReporting.reportError).toHaveBeenCalledWith(
          expect.objectContaining({
            context: expect.objectContaining({
              performanceMetrics: expect.any(Object),
              url: expect.any(String),
              userAgent: expect.any(String)
            })
          })
        );
      });
    });
  });
});