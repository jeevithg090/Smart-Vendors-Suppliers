import React, { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '../utils/retry';
// import type { QueuedOperation } from '../utils/retry';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { performanceMonitoring } from '../services/performanceMonitoring';

interface OfflineManagerProps {
  children: React.ReactNode;
}

export function OfflineManager({ children }: OfflineManagerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueStatus, setQueueStatus] = useState({ pending: 0, processing: false });
  const [connectionQuality, setConnectionQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { handleNetworkError } = useErrorHandler();

  // Monitor connection quality
  const checkConnectionQuality = useCallback(async () => {
    if (!navigator.onLine) {
      setConnectionQuality('offline');
      return;
    }

    try {
      const startTime = performance.now();
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const endTime = performance.now();
      const latency = endTime - startTime;

      if (response.ok) {
        setConnectionQuality(latency > 2000 ? 'poor' : 'good');
        performanceMonitoring.recordMetric('Connection Latency', latency);
      } else {
        setConnectionQuality('poor');
      }
    } catch (error) {
      setConnectionQuality('poor');
      await handleNetworkError(error as Error, true);
    }
  }, [handleNetworkError]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setLastSyncTime(new Date());
      
      // Check connection quality when coming back online
      await checkConnectionQuality();
      
      // Show success message when back online
      if (queueStatus.pending > 0) {
        showNotification('Back online! Processing pending actions...', 'success');
        
        // Track offline duration
        const offlineStart = localStorage.getItem('offlineStartTime');
        if (offlineStart) {
          const offlineDuration = Date.now() - parseInt(offlineStart);
          performanceMonitoring.recordMetric('Offline Duration', offlineDuration);
          localStorage.removeItem('offlineStartTime');
        }
      }
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionQuality('offline');
      localStorage.setItem('offlineStartTime', Date.now().toString());
      showNotification('You\'re offline. Actions will be saved and synced when you\'re back online.', 'warning');
      
      // Track offline event
      performanceMonitoring.recordMetric('Offline Event', Date.now(), {
        pendingOperations: queueStatus.pending
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update queue status periodically
    const statusInterval = setInterval(() => {
      setQueueStatus(offlineQueue.getQueueStatus());
    }, 1000);

    // Check connection quality periodically when online
    const qualityInterval = setInterval(() => {
      if (navigator.onLine) {
        checkConnectionQuality();
      }
    }, 30000); // Every 30 seconds

    // Initial connection quality check
    checkConnectionQuality();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(statusInterval);
      clearInterval(qualityInterval);
    };
  }, [queueStatus.pending, checkConnectionQuality]);

  const showNotification = (message: string, type: 'success' | 'warning' | 'error') => {
    // This would integrate with your notification system
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Track notification events
    performanceMonitoring.recordMetric('Offline Notification', Date.now(), {
      type,
      message: message.substring(0, 50) // Truncate for privacy
    });
  };

  // Queue operation for offline execution
  // const _queueOperation = useCallback(async (operation: Omit<QueuedOperation, 'id' | 'timestamp' | 'attempts'>) => {
  //   try {
  //     await offlineQueue.enqueue(operation);
  //     showNotification(`Action saved. Will sync when back online.`, 'success');
  //   } catch (error) {
  //     await handleNetworkError(error as Error, false);
  //     showNotification(`Failed to save action. Please try again.`, 'error');
  //   }
  // }, [handleNetworkError]);

  // Provide offline context to children
  // const offlineContext = {
  //   isOnline,
  //   connectionQuality,
  //   queueOperation,
  //   queueStatus,
  //   lastSyncTime
  // };

  return (
    <>
      {children}
      
      {/* Offline indicator */}
      {!isOnline && (
        <div 
          className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center text-sm font-medium z-50 shadow-lg"
          data-testid="offline-indicator"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>You're offline</span>
            <span className="text-yellow-200">•</span>
            <span className="text-xs">Actions will be saved and synced later</span>
          </div>
        </div>
      )}

      {/* Queue status indicator */}
      {queueStatus.pending > 0 && (
        <div 
          className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50"
          data-testid="pending-actions"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center space-x-2">
            {queueStatus.processing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <span className="text-sm">
              {queueStatus.processing ? 'Syncing...' : `${queueStatus.pending} action${queueStatus.pending !== 1 ? 's' : ''} pending`}
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Connection Status Indicator */}
      <div 
        className={`fixed top-4 right-4 flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium z-50 transition-all duration-300 ${
          connectionQuality === 'good' 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : connectionQuality === 'poor'
            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}
        title={
          connectionQuality === 'good' 
            ? 'Good connection' 
            : connectionQuality === 'poor'
            ? 'Poor connection'
            : 'Offline'
        }
        data-testid="connection-status"
      >
        <div 
          className={`w-2 h-2 rounded-full ${
            connectionQuality === 'good' 
              ? 'bg-green-500' 
              : connectionQuality === 'poor'
              ? 'bg-yellow-500 animate-pulse'
              : 'bg-red-500'
          }`}
        />
        <span>
          {connectionQuality === 'good' 
            ? 'Online' 
            : connectionQuality === 'poor'
            ? 'Slow'
            : 'Offline'
          }
        </span>
        {lastSyncTime && (
          <span className="text-xs opacity-75">
            {lastSyncTime.toLocaleTimeString()}
          </span>
        )}
      </div>
    </>
  );
}