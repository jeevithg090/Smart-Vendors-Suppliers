import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { performanceMonitoring } from '../../services/performanceMonitoring';

// Mock fetch
global.fetch = vi.fn();

// Mock performance APIs
const mockPerformanceObserver = vi.fn();
global.PerformanceObserver = mockPerformanceObserver;

// Mock performance.timing
Object.defineProperty(global, 'performance', {
  value: {
    timing: {
      navigationStart: 1000,
      domainLookupStart: 1010,
      domainLookupEnd: 1020,
      connectStart: 1020,
      connectEnd: 1030,
      requestStart: 1030,
      responseStart: 1040,
      responseEnd: 1050,
      domLoading: 1050,
      domContentLoadedEventEnd: 1100,
      loadEventStart: 1150,
      loadEventEnd: 1200
    },
    now: vi.fn(() => Date.now()),
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  },
  writable: true
});

describe('PerformanceMonitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 200 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      performanceMonitoring.recordMetric('Test Metric', 100, { test: true });
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Test Metric']).toBeDefined();
      expect(summary['Test Metric'].count).toBe(1);
      expect(summary['Test Metric'].avg).toBe(100);
    });

    it('should limit metrics to prevent memory issues', () => {
      // Add more than 1000 metrics
      for (let i = 0; i < 1100; i++) {
        performanceMonitoring.recordMetric('Test Metric', i);
      }
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Test Metric'].count).toBe(1000);
    });

    it('should send critical metrics immediately', async () => {
      performanceMonitoring.recordMetric('LCP', 3000); // Above threshold
      
      // Should have called fetch to send metric
      expect(fetch).toHaveBeenCalledWith('/api/metrics', expect.objectContaining({
        method: 'POST'
      }));
    });
  });

  describe('measureOperation', () => {
    it('should measure synchronous operation', () => {
      const operation = vi.fn(() => 'result');
      
      const result = performanceMonitoring.measureOperation('sync-op', operation);
      
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Custom sync-op']).toBeDefined();
    });

    it('should measure asynchronous operation', async () => {
      const operation = vi.fn().mockResolvedValue('async-result');
      
      const result = await performanceMonitoring.measureOperation('async-op', operation);
      
      expect(result).toBe('async-result');
      expect(operation).toHaveBeenCalled();
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Custom async-op']).toBeDefined();
    });

    it('should measure failed operations', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(performanceMonitoring.measureOperation('failing-op', operation))
        .rejects.toThrow('Operation failed');
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Custom failing-op (Error)']).toBeDefined();
    });
  });

  describe('trackError', () => {
    it('should track error with context', () => {
      const error = new Error('Test error');
      const context = { userId: 'user-123', action: 'test-action' };
      
      performanceMonitoring.trackError(error, context);
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Error Occurred']).toBeDefined();
    });

    it('should track frequent error patterns', () => {
      const error = new Error('Frequent error');
      
      // Trigger the same error multiple times
      for (let i = 0; i < 6; i++) {
        performanceMonitoring.trackError(error);
      }
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Frequent Error Pattern']).toBeDefined();
    });
  });

  describe('trackUserInteraction', () => {
    it('should track user interaction', () => {
      performanceMonitoring.trackUserInteraction('click', 'button', 150);
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['User Interaction']).toBeDefined();
    });
  });

  describe('trackAPICall', () => {
    it('should track successful API call', () => {
      performanceMonitoring.trackAPICall('/api/users', 'GET', 200, 200, 1024);
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['API Call']).toBeDefined();
    });

    it('should track slow API calls', () => {
      performanceMonitoring.trackAPICall('/api/slow', 'GET', 3000, 200);
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['Slow API Call']).toBeDefined();
    });

    it('should track API errors', () => {
      performanceMonitoring.trackAPICall('/api/error', 'POST', 500, 500);
      
      const summary = performanceMonitoring.getPerformanceSummary();
      expect(summary['API Error']).toBeDefined();
    });
  });

  describe('sendBatchMetrics', () => {
    it('should send metrics with device and network info', async () => {
      performanceMonitoring.recordMetric('Test Metric', 100);
      
      await performanceMonitoring.sendBatchMetrics();
      
      expect(fetch).toHaveBeenCalledWith('/api/metrics/batch', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('deviceInfo')
      }));
    });

    it('should store metrics locally on send failure', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));
      
      performanceMonitoring.recordMetric('Test Metric', 100);
      await performanceMonitoring.sendBatchMetrics();
      
      const stored = localStorage.getItem('performanceMetrics');
      expect(stored).toBeTruthy();
    });

    it('should not send if no metrics', async () => {
      await performanceMonitoring.sendBatchMetrics();
      
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('getPerformanceSummary', () => {
    it('should calculate statistics correctly', () => {
      const values = [10, 20, 30, 40, 50];
      values.forEach(value => {
        performanceMonitoring.recordMetric('Test Metric', value);
      });
      
      const summary = performanceMonitoring.getPerformanceSummary();
      const stats = summary['Test Metric'];
      
      expect(stats.count).toBe(5);
      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.avg).toBe(30);
    });
  });

  describe('device and network info', () => {
    it('should collect device information', () => {
      const deviceInfo = (performanceMonitoring as any).getDeviceInfo();
      
      expect(deviceInfo.screen).toBeDefined();
      expect(deviceInfo.viewport).toBeDefined();
      expect(deviceInfo.memory).toBeDefined();
      expect(deviceInfo.hardwareConcurrency).toBeDefined();
    });

    it('should handle missing network connection API', () => {
      const networkInfo = (performanceMonitoring as any).getNetworkInfo();
      
      expect(networkInfo.available).toBe(false);
    });

    it('should collect network information when available', () => {
      // Mock connection API
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '4g',
          downlink: 10,
          rtt: 50,
          saveData: false
        },
        writable: true
      });
      
      const networkInfo = (performanceMonitoring as any).getNetworkInfo();
      
      expect(networkInfo.effectiveType).toBe('4g');
      expect(networkInfo.downlink).toBe(10);
      expect(networkInfo.rtt).toBe(50);
    });
  });
});