import { useState, useEffect } from 'react';
import { performanceMonitoring } from '../services/performanceMonitoring';
// import { errorReporting } from '../services/errorReporting';
import { offlineQueue } from '../utils/retry';

interface ErrorStats {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recentErrors: Array<{
    timestamp: number;
    type: string;
    message: string;
    count: number;
  }>;
}

interface PerformanceStats {
  avgResponseTime: number;
  slowRequests: number;
  errorRate: number;
  memoryUsage?: number;
}

export function ErrorReportingDashboard() {
  const [errorStats, setErrorStats] = useState<ErrorStats>({
    totalErrors: 0,
    errorsByType: {},
    recentErrors: []
  });
  
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats>({
    avgResponseTime: 0,
    slowRequests: 0,
    errorRate: 0
  });
  
  const [queueStatus, setQueueStatus] = useState({ pending: 0, processing: false });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = import.meta.env.DEV || localStorage.getItem('showErrorDashboard') === 'true';
    setIsVisible(shouldShow);

    if (!shouldShow) return;

    const updateStats = () => {
      // Get performance summary
      const perfSummary = performanceMonitoring.getPerformanceSummary();
      
      // Calculate error stats
      const errorMetrics = Object.entries(perfSummary).filter(([key]) => 
        key.includes('Error') || key.includes('error')
      );
      
      const totalErrors = errorMetrics.reduce((sum, [, stats]) => sum + stats.count, 0);
      const errorsByType = errorMetrics.reduce((acc, [key, stats]) => {
        acc[key] = stats.count;
        return acc;
      }, {} as Record<string, number>);

      setErrorStats({
        totalErrors,
        errorsByType,
        recentErrors: getRecentErrors(perfSummary)
      });

      // Calculate performance stats
      const apiCalls = perfSummary['API Call'];
      const slowCalls = perfSummary['Slow API Call'];
      const apiErrors = perfSummary['API Error'];

      setPerformanceStats({
        avgResponseTime: apiCalls?.avg || 0,
        slowRequests: slowCalls?.count || 0,
        errorRate: apiCalls ? ((apiErrors?.count || 0) / apiCalls.count) * 100 : 0,
        memoryUsage: getMemoryUsage()
      });

      // Update queue status
      setQueueStatus(offlineQueue.getQueueStatus());
    };

    // Update stats immediately and then every 5 seconds
    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  const getRecentErrors = (perfSummary: Record<string, any>) => {
    // This would ideally come from a more detailed error log
    // For now, we'll simulate recent errors based on the summary
    return Object.entries(perfSummary)
      .filter(([key]) => key.includes('Error'))
      .map(([key, stats]) => ({
        timestamp: Date.now() - Math.random() * 3600000, // Random time in last hour
        type: key,
        message: `${key} occurred`,
        count: stats.count
      }))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 5);
  };

  const getMemoryUsage = (): number | undefined => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100);
    }
    return undefined;
  };

  const clearErrorStats = () => {
    // Clear session storage error counts
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('errorCount_')) {
        sessionStorage.removeItem(key);
      }
    });
    
    // Clear local metrics
    localStorage.removeItem('performanceMetrics');
    
    // Reset stats
    setErrorStats({ totalErrors: 0, errorsByType: {}, recentErrors: [] });
  };

  const exportErrorReport = async () => {
    const report = {
      timestamp: new Date().toISOString(),
      errorStats,
      performanceStats,
      queueStatus,
      performanceSummary: performanceMonitoring.getPerformanceSummary(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 w-80 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Error Dashboard</h3>
          <div className="flex space-x-2">
            <button
              onClick={exportErrorReport}
              className="text-xs text-blue-600 hover:text-blue-800"
              title="Export Report"
            >
              Export
            </button>
            <button
              onClick={clearErrorStats}
              className="text-xs text-red-600 hover:text-red-800"
              title="Clear Stats"
            >
              Clear
            </button>
            <button
              onClick={() => setIsVisible(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
              title="Hide Dashboard"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Error Summary */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Error Summary</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-red-50 p-2 rounded">
              <div className="text-red-800 font-medium">Total Errors</div>
              <div className="text-red-600 text-lg">{errorStats.totalErrors}</div>
            </div>
            <div className="bg-yellow-50 p-2 rounded">
              <div className="text-yellow-800 font-medium">Error Rate</div>
              <div className="text-yellow-600 text-lg">{performanceStats.errorRate.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">Performance</h4>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span>Avg Response Time:</span>
              <span className={performanceStats.avgResponseTime > 1000 ? 'text-red-600' : 'text-green-600'}>
                {performanceStats.avgResponseTime.toFixed(0)}ms
              </span>
            </div>
            <div className="flex justify-between">
              <span>Slow Requests:</span>
              <span className={performanceStats.slowRequests > 0 ? 'text-yellow-600' : 'text-green-600'}>
                {performanceStats.slowRequests}
              </span>
            </div>
            {performanceStats.memoryUsage && (
              <div className="flex justify-between">
                <span>Memory Usage:</span>
                <span className={performanceStats.memoryUsage > 80 ? 'text-red-600' : 'text-green-600'}>
                  {performanceStats.memoryUsage}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Queue Status */}
        {queueStatus.pending > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">Offline Queue</h4>
            <div className="bg-blue-50 p-2 rounded text-xs">
              <div className="flex justify-between">
                <span>Pending Operations:</span>
                <span className="text-blue-600 font-medium">{queueStatus.pending}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={queueStatus.processing ? 'text-green-600' : 'text-yellow-600'}>
                  {queueStatus.processing ? 'Processing' : 'Waiting'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Types */}
        {Object.keys(errorStats.errorsByType).length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">Error Types</h4>
            <div className="space-y-1">
              {Object.entries(errorStats.errorsByType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-xs">
                  <span className="truncate" title={type}>{type}</span>
                  <span className="text-red-600 font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Errors */}
        {errorStats.recentErrors.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Errors</h4>
            <div className="space-y-1">
              {errorStats.recentErrors.map((error, index) => (
                <div key={index} className="text-xs bg-gray-50 p-2 rounded">
                  <div className="flex justify-between">
                    <span className="font-medium text-red-600">{error.type}</span>
                    <span className="text-gray-500">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-600 truncate" title={error.message}>
                    {error.message}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Health Status */}
        <div>
          <h4 className="text-xs font-medium text-gray-700 mb-2">System Health</h4>
          <div className="flex items-center space-x-2 text-xs">
            <div className={`w-2 h-2 rounded-full ${
              errorStats.totalErrors === 0 ? 'bg-green-500' :
              errorStats.totalErrors < 5 ? 'bg-yellow-500' : 'bg-red-500'
            }`}></div>
            <span>
              {errorStats.totalErrors === 0 ? 'Healthy' :
               errorStats.totalErrors < 5 ? 'Warning' : 'Critical'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toggle function for showing/hiding dashboard
export function toggleErrorDashboard() {
  const current = localStorage.getItem('showErrorDashboard') === 'true';
  localStorage.setItem('showErrorDashboard', (!current).toString());
  window.location.reload(); // Simple way to toggle visibility
}