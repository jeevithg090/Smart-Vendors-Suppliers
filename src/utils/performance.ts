// Performance optimization utilities
import React from 'react'

// Debounce function for search inputs
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function for scroll events
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Intersection Observer for lazy loading
export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver => {
  return new IntersectionObserver(callback, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  })
}

// Image lazy loading utility
export const lazyLoadImage = (img: HTMLImageElement, src: string) => {
  const observer = createIntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = entry.target as HTMLImageElement
        target.src = src
        target.classList.remove('opacity-0')
        target.classList.add('opacity-100')
        observer.unobserve(target)
      }
    })
  })
  
  observer.observe(img)
  return observer
}

// Memory usage monitoring
export const getMemoryUsage = (): any | null => {
  if ('memory' in performance) {
    return (performance as any).memory
  }
  return null
}

// Bundle size analyzer
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available in production build')
    return
  }
  
  // Log performance metrics
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  const paint = performance.getEntriesByType('paint')
  
  console.group('Performance Metrics')
  console.log('DOM Content Loaded:', navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart, 'ms')
  console.log('Load Complete:', navigation.loadEventEnd - navigation.loadEventStart, 'ms')
  
  paint.forEach(entry => {
    console.log(`${entry.name}:`, entry.startTime, 'ms')
  })
  
  const memory = getMemoryUsage()
  if (memory) {
    console.log('Memory Usage:', {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB',
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024) + ' MB',
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) + ' MB'
    })
  }
  console.groupEnd()
}

// Component performance tracker
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  return (props: P) => {
    const startTime = performance.now()
    
    React.useEffect(() => {
      const endTime = performance.now()
      console.log(`${componentName} render time:`, endTime - startTime, 'ms')
    })
    
    return React.createElement(Component, props)
  }
}

// Virtual scrolling utility for large lists
export const useVirtualScrolling = (
  items: any[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = React.useState(0)
  
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(
    startIndex + Math.ceil(containerHeight / itemHeight) + 1,
    items.length
  )
  
  const visibleItems = items.slice(startIndex, endIndex)
  const totalHeight = items.length * itemHeight
  const offsetY = startIndex * itemHeight
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    onScroll: (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop)
    }
  }
}

// Preload critical resources
export const preloadResource = (href: string, as: string) => {
  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  link.as = as
  document.head.appendChild(link)
}

// Critical CSS inlining
export const inlineCriticalCSS = (css: string) => {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

// Service Worker registration with error handling
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      console.log('SW registered: ', registration)
      return registration
    } catch (registrationError) {
      console.log('SW registration failed: ', registrationError)
      return null
    }
  }
  return null
}

// Resource hints
export const addResourceHints = () => {
  // DNS prefetch for external domains
  const dnsPrefetch = [
    'https://api.convex.cloud',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com'
  ]
  
  dnsPrefetch.forEach(domain => {
    const link = document.createElement('link')
    link.rel = 'dns-prefetch'
    link.href = domain
    document.head.appendChild(link)
  })
  
  // Preconnect to critical origins
  const preconnect = [
    'https://api.convex.cloud',
    'https://fonts.googleapis.com'
  ]
  
  preconnect.forEach(origin => {
    const link = document.createElement('link')
    link.rel = 'preconnect'
    link.href = origin
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

// Code splitting utilities
export const loadComponentAsync = <T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) => {
  return React.lazy(importFunc)
}

// Image optimization
export const optimizeImage = (src: string, width?: number, height?: number, quality = 80) => {
  if (!src) return src
  
  // For production, you might want to use a service like Cloudinary or ImageKit
  const params = new URLSearchParams()
  if (width) params.append('w', width.toString())
  if (height) params.append('h', height.toString())
  params.append('q', quality.toString())
  
  return `${src}?${params.toString()}`
}

// Critical resource preloading
export const preloadCriticalResources = () => {
  const criticalResources = [
    { href: '/fonts/inter-var.woff2', as: 'font', type: 'font/woff2' },
    { href: '/api/vendors/current', as: 'fetch' },
    { href: '/api/suppliers/nearby', as: 'fetch' }
  ]
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = resource.href
    link.as = resource.as
    if (resource.type) link.type = resource.type
    if (resource.as === 'font') link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  })
}

// Bundle size monitoring
export const monitorBundleSize = () => {
  if (process.env.NODE_ENV === 'production') {
    // Monitor initial bundle load time
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'navigation') {
          const nav = entry as PerformanceNavigationTiming
          console.log('Bundle load metrics:', {
            domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            loadComplete: nav.loadEventEnd - nav.loadEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime
          })
        }
      })
    })
    
    observer.observe({ entryTypes: ['navigation', 'paint'] })
  }
}

// Optimize React rendering
export const useOptimizedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return React.useCallback(callback, deps)
}

export const useOptimizedMemo = <T>(
  factory: () => T,
  deps: React.DependencyList
): T => {
  return React.useMemo(factory, deps)
}

// Initialize performance optimizations
export const initializePerformanceOptimizations = () => {
  // Add resource hints
  addResourceHints()
  
  // Preload critical resources
  preloadCriticalResources()
  
  // Register service worker
  registerServiceWorker()
  
  // Monitor bundle size
  monitorBundleSize()
  
  // Analyze bundle size in production
  if (process.env.NODE_ENV === 'production') {
    setTimeout(analyzeBundleSize, 1000)
  }
  
  // Monitor memory usage
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const memory = getMemoryUsage()
      if (memory && memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB threshold
        console.warn('High memory usage detected:', Math.round(memory.usedJSHeapSize / 1024 / 1024) + ' MB')
      }
    }, 30000) // Check every 30 seconds
  }
  
  // Enable React concurrent features
  if (typeof window !== 'undefined') {
    // Enable time slicing for better performance
    (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__?.onCommitFiberRoot?.(
      null,
      null,
      null,
      true
    )
  }
}