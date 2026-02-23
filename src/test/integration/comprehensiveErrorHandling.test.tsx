import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppErrorProvider } from '../../components/AppErrorProvider';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { useAppError } from '../../components/AppErrorProvider';
import { errorReporting } from '../../services/errorReporting';
import { performanceMonitoring } from '../../services/performanceMonitoring';

// Mock services
vi.mock('../../services/errorReporting', () => ({
  errorReporting: {
    reportError: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../services/performanceMonitoring', () => ({
  performanceMonitoring: {
    recordMetric: vi.fn(),
    trackError: vi.fn(),
    getPerformanceSummary: vi.fn().mockReturnValue({}),
  },
}));

// Test component that uses error handling
function TestComponent() {
  const { executeOperation, validateBusinessLogic, handleError, isLoading, error, retry, clearError } = useAppError();

  const handleNetworkOperation = async () => {
    await executeOperation(
      async () => {
        throw new Error('Network timeout');
      },
      'testNetworkOperation',
      { testContext: true }
    );
  };

  const handleBusinessValidation = async () => {
    await validateBusinessLogic('orderPlacement', {
      supplierId: 'test-supplier',
      items: [{ itemName: 'Test Item', quantity: 5 }],
      totalCost: 500,
      deliveryAddress: 'Test Address'
    });
  };

  const handleManualError = async () => {
    await handleError(new Error('Manual error'), { manual: true }, ['Try again', 'Contact support']);
  };

  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading...' : 'Not loading'}</div>
      <div data-testid="error">{error ? error.message : 'No error'}</div>
      
      <button onClick={handleNetworkOperation} data-testid="network-button">
        Network Operation
      </button>
      <button onClick={handleBusinessValidation} data-testid="business-button">
        Business Validation
      </button>
      <button onClick={handleManualError} data-testid="manual-error-button">
        Manual Error
      </button>
      <button onClick={retry} data-testid="retry-button">
        Retry
      </button>
      <button onClick={clearError} data-testid="clear-button">
        Clear Error
      </button>
    </div>
  );
}

describe('Comprehensive Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle network errors with retry capability', async () => {
    const user = userEvent.setup();
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    // Initially no error
    expect(screen.getByTestId('error')).toHaveTextContent('No error');
    expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');

    // Trigger network operation
    await user.click(screen.getByTestId('network-button'));

    // Should show loading state briefly, then error
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network timeout');
    }, { timeout: 5000 });

    // Should report error
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Network timeout',
        context: expect.objectContaining({
          testContext: true,
          operationName: 'testNetworkOperation'
        })
      }),
      undefined
    );

    // Should track performance
    expect(performanceMonitoring.trackError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        testContext: true,
        operationName: 'testNetworkOperation'
      })
    );
  });

  it('should handle business validation errors', async () => {
    const user = userEvent.setup();
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    // Trigger business validation
    await user.click(screen.getByTestId('business-button'));

    await waitFor(() => {
      // Should complete without error (assuming validation passes)
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
    });
  });

  it('should handle manual errors with recovery actions', async () => {
    const user = userEvent.setup();
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    // Trigger manual error
    await user.click(screen.getByTestId('manual-error-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Manual error');
    });

    // Should report error with recovery actions
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Manual error',
        context: expect.objectContaining({
          manual: true,
          recoveryActions: ['Try again', 'Contact support']
        })
      }),
      undefined
    );
  });

  it('should allow clearing errors', async () => {
    const user = userEvent.setup();
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    // Trigger error
    await user.click(screen.getByTestId('manual-error-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Manual error');
    });

    // Clear error
    await user.click(screen.getByTestId('clear-button'));

    expect(screen.getByTestId('error')).toHaveTextContent('No error');
  });

  it('should integrate with error boundary for unhandled errors', async () => {
    function ThrowingComponent() {
      throw new Error('Unhandled component error');
    }

    render(
      <AppErrorProvider>
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      </AppErrorProvider>
    );

    // Should show error boundary UI
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    // Should report the error
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SYSTEM_ERROR',
        message: 'Unhandled component error'
      })
    );
  });

  it('should handle offline scenarios', async () => {
    const user = userEvent.setup();
    
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    // Trigger network operation while offline
    await user.click(screen.getByTestId('network-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network timeout');
    }, { timeout: 5000 });

    // Should still report error (will be queued for when online)
    expect(errorReporting.reportError).toHaveBeenCalled();
  });

  it('should handle rapid successive errors', async () => {
    const user = userEvent.setup();
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    // Trigger multiple errors rapidly
    await Promise.all([
      user.click(screen.getByTestId('network-button')),
      user.click(screen.getByTestId('manual-error-button'))
    ]);

    // Should handle both errors even when retries and manual handling overlap
    await waitFor(() => {
      expect(vi.mocked(errorReporting.reportError).mock.calls.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 5000 });
  });

  it('should track performance metrics during error handling', async () => {
    const user = userEvent.setup();
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    await user.click(screen.getByTestId('network-button'));

    await waitFor(() => {
      expect(performanceMonitoring.recordMetric).toHaveBeenCalledWith(
        'Error Handling Duration',
        expect.any(Number),
        expect.objectContaining({
          errorType: 'SYSTEM_ERROR'
        })
      );
    }, { timeout: 5000 });
  });

  it('should handle error reporting failures gracefully', async () => {
    const user = userEvent.setup();
    
    // Mock error reporting to fail
    vi.mocked(errorReporting.reportError).mockRejectedValue(new Error('Reporting service down'));
    
    render(
      <AppErrorProvider>
        <TestComponent />
      </AppErrorProvider>
    );

    await user.click(screen.getByTestId('manual-error-button'));

    // Should still show the error to user
    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Manual error');
    });

    // Should log warning about reporting failure
    expect(console.warn).toHaveBeenCalledWith(
      'Failed to report error:',
      expect.any(Error)
    );
  });
});
