import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { errorReporting } from '../../services/errorReporting';

// Mock the error reporting service
vi.mock('../../services/errorReporting', () => ({
  errorReporting: {
    reportError: vi.fn(),
  },
}));

describe('useErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.error = vi.fn();
    console.warn = vi.fn();
  });

  it('should handle generic errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const error = new Error('Test error');
    
    await act(async () => {
      await result.current.handleError(error);
    });
    
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'SYSTEM_ERROR',
        code: 'UNKNOWN',
        message: 'Test error'
      })
    );
  });

  it('should handle network errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    const error = new Error('Network failed');
    
    await act(async () => {
      await result.current.handleNetworkError(error, true);
    });
    
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NETWORK_ERROR',
        code: 'CONNECTION_FAILED',
        retryable: true
      })
    );
  });

  it('should handle validation errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    await act(async () => {
      await result.current.handleValidationError('email', 'invalid-email', 'Invalid email format', ['pattern']);
    });
    
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'VALIDATION_ERROR',
        field: 'email',
        value: 'invalid-email',
        message: 'Invalid email format',
        constraints: ['pattern']
      })
    );
  });

  it('should handle business errors', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    await act(async () => {
      await result.current.handleBusinessError('INSUFFICIENT_STOCK', 'Not enough stock', ['Try different supplier']);
    });
    
    expect(errorReporting.reportError).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'BUSINESS_ERROR',
        code: 'INSUFFICIENT_STOCK',
        message: 'Not enough stock',
        suggestions: ['Try different supplier'],
        actionable: true
      })
    );
  });

  it('should respect options for logging and reporting', async () => {
    const { result } = renderHook(() => 
      useErrorHandler({ 
        logToConsole: false, 
        reportToService: false,
        showNotification: false 
      })
    );
    
    const error = new Error('Test error');
    
    await act(async () => {
      await result.current.handleError(error);
    });
    
    expect(console.error).not.toHaveBeenCalled();
    expect(errorReporting.reportError).not.toHaveBeenCalled();
  });

  it('should continue execution if error reporting fails', async () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // Mock error reporting to fail
    vi.mocked(errorReporting.reportError).mockRejectedValue(new Error('Reporting failed'));
    
    const error = new Error('Test error');
    
    await act(async () => {
      const handledError = await result.current.handleError(error);
      expect(handledError).toBeDefined();
    });
    
    expect(console.warn).toHaveBeenCalledWith('Failed to report error:', expect.any(Error));
  });
});