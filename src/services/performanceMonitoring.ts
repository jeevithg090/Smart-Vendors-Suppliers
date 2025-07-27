interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface NavigationTiming {
  dns: number;
  tcp: number;
  request: number;
  response: number;
  dom: number;
  load: number;
  total: number;
}

class PerformanceMonitoringService {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  private constructor() {
    this.initializeObservers();
    this.collectNavigationTiming();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  private initializeObservers(): void {
    // Observe Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.recordMetric('LCP', lastEntry.startTime, {
          element: lastEntry.element?.tagName,
          url: lastEntry.url
        });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.recordMetric('FID', entry.processingStart - entry.startTime, {
            eventType: entry.name
          });
        });
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.recordMetric('CLS', clsValue);
      });

      try {
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // Long Tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.recordMetric('Long Task', entry.duration, {
            startTime: entry.startTime,
            name: entry.name
          });
        });
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported');
      }

      // Resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
            this.recordMetric('API Request', entry.duration, {
              url: entry.name,
              method: entry.initiatorType,
              size: entry.transferSize
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    }
  }

  private collectNavigationTiming(): void {
    if ('performance' in window && 'timing' in performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = performance.timing;
          const navigationTiming: NavigationTiming = {
            dns: timing.domainLookupEnd - timing.domainLookupStart,
            tcp: timing.connectEnd - timing.connectStart,
            request: timing.responseStart - timing.requestStart,
            response: timing.responseEnd - timing.responseStart,
            dom: timing.domContentLoadedEventEnd - timing.domLoading,
            load: timing.loadEventEnd - timing.loadEventStart,
            total: timing.loadEventEnd - timing.navigationStart
          };

          Object.entries(navigationTiming).forEach(([key, value]) => {
            this.recordMetric(`Navigation ${key}`, value);
          });
        }, 0);
      });
    }
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Send critical metrics immediately
    if (this.isCriticalMetric(name, value)) {
      this.sendMetric(metric);
    }
  }

  private isCriticalMetric(name: string, value: number): boolean {
    // Define thresholds for critical metrics
    const thresholds = {
      'LCP': 2500, // 2.5 seconds
      'FID': 100,  // 100ms
      'CLS': 0.1,  // 0.1
      'Long Task': 50, // 50ms
      'API Request': 1000 // 1 second
    };

    return value > (thresholds[name as keyof typeof thresholds] || Infinity);
  }

  private async sendMetric(metric: PerformanceMetric): Promise<void> {
    try {
      // In a real application, send to your analytics service
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metric,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        }),
      });
    } catch (error) {
      console.warn('Failed to send performance metric:', error);
    }
  }

  // Measure custom operations
  measureOperation<T>(name: string, operation: () => T): T;
  measureOperation<T>(name: string, operation: () => Promise<T>): Promise<T>;
  measureOperation<T>(name: string, operation: () => T | Promise<T>): T | Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = operation();
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime;
          this.recordMetric(`Custom ${name}`, duration);
        });
      } else {
        const duration = performance.now() - startTime;
        this.recordMetric(`Custom ${name}`, duration);
        return result;
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordMetric(`Custom ${name} (Error)`, duration, { error: (error as Error).message });
      throw error;
    }
  }

  // Get performance summary
  getPerformanceSummary(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    // Group metrics by name
    const groupedMetrics = this.metrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric.value);
      return acc;
    }, {} as Record<string, number[]>);

    // Calculate statistics for each metric
    Object.entries(groupedMetrics).forEach(([name, values]) => {
      summary[name] = {
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        p95: this.percentile(values, 95),
        p99: this.percentile(values, 99)
      };
    });

    return summary;
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // Send batch metrics
  async sendBatchMetrics(): Promise<void> {
    if (this.metrics.length === 0) return;

    try {
      const summary = this.getPerformanceSummary();
      const deviceInfo = this.getDeviceInfo();
      const networkInfo = this.getNetworkInfo();
      
      await fetch('/api/metrics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          deviceInfo,
          networkInfo,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now(),
          sessionId: this.getSessionId(),
          userId: this.getCurrentUserId()
        }),
      });

      // Clear metrics after successful send
      this.metrics = [];
    } catch (error) {
      console.warn('Failed to send batch metrics:', error);
      // Store metrics locally for retry
      this.storeMetricsLocally();
    }
  }

  private getDeviceInfo(): Record<string, any> {
    return {
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: window.devicePixelRatio
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      memory: (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
      } : null,
      hardwareConcurrency: navigator.hardwareConcurrency,
      platform: navigator.platform
    };
  }

  private getNetworkInfo(): Record<string, any> {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    
    return { available: false };
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performanceSessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('performanceSessionId', sessionId);
    }
    return sessionId;
  }

  private getCurrentUserId(): string | undefined {
    try {
      const user = (window as any).Clerk?.user;
      return user?.id;
    } catch (e) {
      return undefined;
    }
  }

  private storeMetricsLocally(): void {
    try {
      const existingMetrics = JSON.parse(localStorage.getItem('performanceMetrics') || '[]');
      const allMetrics = [...existingMetrics, ...this.metrics];
      localStorage.setItem('performanceMetrics', JSON.stringify(allMetrics.slice(-500))); // Keep last 500
    } catch (e) {
      console.warn('Failed to store metrics locally:', e);
    }
  }

  // Enhanced error tracking
  trackError(error: Error, context?: Record<string, any>): void {
    this.recordMetric('Error Occurred', Date.now(), {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      context,
      url: window.location.href,
      timestamp: Date.now()
    });

    // Track error frequency
    const errorKey = `${error.name}:${error.message}`;
    const errorCount = parseInt(sessionStorage.getItem(`errorCount_${errorKey}`) || '0') + 1;
    sessionStorage.setItem(`errorCount_${errorKey}`, errorCount.toString());

    if (errorCount > 5) {
      this.recordMetric('Frequent Error Pattern', errorCount, {
        errorPattern: errorKey,
        context
      });
    }
  }

  // Track user interactions
  trackUserInteraction(action: string, element?: string, duration?: number): void {
    this.recordMetric('User Interaction', duration || Date.now(), {
      action,
      element,
      url: window.location.href,
      timestamp: Date.now()
    });
  }

  // Track API performance
  trackAPICall(url: string, method: string, duration: number, status: number, size?: number): void {
    this.recordMetric('API Call', duration, {
      url,
      method,
      status,
      size,
      timestamp: Date.now()
    });

    // Track slow API calls
    if (duration > 2000) {
      this.recordMetric('Slow API Call', duration, {
        url,
        method,
        status
      });
    }

    // Track API errors
    if (status >= 400) {
      this.recordMetric('API Error', status, {
        url,
        method,
        duration
      });
    }
  }

  // Cleanup observers
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Export singleton instance
export const performanceMonitoring = PerformanceMonitoringService.getInstance();

// Send batch metrics periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    performanceMonitoring.sendBatchMetrics();
  }, 30000); // Every 30 seconds

  // Send metrics before page unload
  window.addEventListener('beforeunload', () => {
    performanceMonitoring.sendBatchMetrics();
  });
}