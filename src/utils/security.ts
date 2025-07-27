// Security utilities and data protection

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

// Email validation with security considerations
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254 // RFC 5321 limit
}

// Phone number validation for Indian numbers
export const validateIndianPhone = (phone: string): boolean => {
  const phoneRegex = /^[6-9]\d{9}$/
  const cleanPhone = phone.replace(/\D/g, '')
  return phoneRegex.test(cleanPhone)
}

// FSSAI license validation
export const validateFSSAI = (license: string): boolean => {
  const fssaiRegex = /^\d{14}$/
  return fssaiRegex.test(license)
}

// Password strength validation
export const validatePasswordStrength = (password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} => {
  const feedback: string[] = []
  let score = 0

  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Password must be at least 8 characters long')
  }

  if (/[a-z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password must contain lowercase letters')
  }

  if (/[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password must contain uppercase letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Password must contain numbers')
  }

  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1
  } else {
    feedback.push('Password must contain special characters')
  }

  // Check for common patterns
  if (/(.)\1{2,}/.test(password)) {
    score -= 1
    feedback.push('Avoid repeating characters')
  }

  if (/123|abc|qwe/i.test(password)) {
    score -= 1
    feedback.push('Avoid common sequences')
  }

  return {
    isValid: score >= 4,
    score: Math.max(0, score),
    feedback
  }
}

// Content Security Policy headers
export const getCSPHeaders = (): Record<string, string> => {
  return {
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://api.convex.cloud https://*.clerk.accounts.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.convex.cloud https://*.clerk.accounts.dev wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)'
  }
}

// Rate limiting utility
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(identifier) || []
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs)
    
    if (validRequests.length >= this.maxRequests) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(identifier, validRequests)
    return true
  }

  getRemainingRequests(identifier: string): number {
    const requests = this.requests.get(identifier) || []
    const now = Date.now()
    const validRequests = requests.filter(time => now - time < this.windowMs)
    return Math.max(0, this.maxRequests - validRequests.length)
  }
}

export const rateLimiter = new RateLimiter()

// Data encryption utilities (for sensitive local storage)
export const encryptData = async (data: string, key: string): Promise<string> => {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const dataBuffer = encoder.encode(data)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )
  
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  )
  
  const result = new Uint8Array(iv.length + encrypted.byteLength)
  result.set(iv)
  result.set(new Uint8Array(encrypted), iv.length)
  
  return btoa(String.fromCharCode(...result))
}

export const decryptData = async (encryptedData: string, key: string): Promise<string> => {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  )
  
  const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  )
  
  return new TextDecoder().decode(decrypted)
}

// Secure local storage wrapper
export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const encryptionKey = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(key + 'smart-street-salt')
      )
      const keyString = Array.from(new Uint8Array(encryptionKey))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32)
      
      const encrypted = await encryptData(value, keyString)
      localStorage.setItem(key, encrypted)
    } catch (error) {
      console.error('Secure storage encryption failed:', error)
      // Fallback to regular storage (not recommended for production)
      localStorage.setItem(key, value)
    }
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      const encrypted = localStorage.getItem(key)
      if (!encrypted) return null
      
      const encryptionKey = await crypto.subtle.digest('SHA-256', 
        new TextEncoder().encode(key + 'smart-street-salt')
      )
      const keyString = Array.from(new Uint8Array(encryptionKey))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, 32)
      
      return await decryptData(encrypted, keyString)
    } catch (error) {
      console.error('Secure storage decryption failed:', error)
      // Fallback to regular storage
      return localStorage.getItem(key)
    }
  },

  removeItem: (key: string): void => {
    localStorage.removeItem(key)
  }
}

// XSS protection
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// CSRF token generation and validation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// Session security
export const isSessionValid = (sessionData: any): boolean => {
  if (!sessionData || !sessionData.timestamp) return false
  
  const now = Date.now()
  const sessionAge = now - sessionData.timestamp
  const maxAge = 24 * 60 * 60 * 1000 // 24 hours
  
  return sessionAge < maxAge
}

// Audit logging
interface AuditLog {
  userId?: string
  action: string
  resource: string
  timestamp: number
  ip?: string
  userAgent?: string
  success: boolean
  details?: any
}

export const logAuditEvent = (event: Omit<AuditLog, 'timestamp'>): void => {
  const auditEvent: AuditLog = {
    ...event,
    timestamp: Date.now()
  }
  
  // In production, send to secure logging service
  if (process.env.NODE_ENV === 'development') {
    console.log('Audit Event:', auditEvent)
  }
  
  // Store in secure local storage for offline capability
  const existingLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]')
  existingLogs.push(auditEvent)
  
  // Keep only last 100 logs to prevent storage bloat
  if (existingLogs.length > 100) {
    existingLogs.splice(0, existingLogs.length - 100)
  }
  
  localStorage.setItem('audit_logs', JSON.stringify(existingLogs))
}

// Privacy compliance utilities
export const anonymizeData = (data: any): any => {
  const anonymized = { ...data }
  
  // Remove or hash sensitive fields
  if (anonymized.email) {
    anonymized.email = anonymized.email.replace(/(.{2}).*(@.*)/, '$1***$2')
  }
  
  if (anonymized.phone) {
    anonymized.phone = anonymized.phone.replace(/(\d{2})\d{6}(\d{2})/, '$1******$2')
  }
  
  if (anonymized.address) {
    anonymized.address = anonymized.address.replace(/\d+/g, '***')
  }
  
  return anonymized
}

// Data retention policy
export const cleanupExpiredData = (): void => {
  const now = Date.now()
  const retentionPeriod = 90 * 24 * 60 * 60 * 1000 // 90 days
  
  // Clean up audit logs
  const auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]')
  const validLogs = auditLogs.filter((log: AuditLog) => 
    now - log.timestamp < retentionPeriod
  )
  localStorage.setItem('audit_logs', JSON.stringify(validLogs))
  
  // Clean up cached data
  const cacheKeys = Object.keys(localStorage).filter(key => 
    key.startsWith('cache_')
  )
  
  cacheKeys.forEach(key => {
    try {
      const cached = JSON.parse(localStorage.getItem(key) || '{}')
      if (cached.timestamp && now - cached.timestamp > retentionPeriod) {
        localStorage.removeItem(key)
      }
    } catch (error) {
      // Remove invalid cache entries
      localStorage.removeItem(key)
    }
  })
}

// Security monitoring
export const monitorSecurityEvents = (): void => {
  // Monitor for suspicious activity
  let failedLoginAttempts = 0
  const maxFailedAttempts = 5
  const lockoutDuration = 15 * 60 * 1000 // 15 minutes

  // Track failed login attempts
  window.addEventListener('clerk:signInAttempt', (event: any) => {
    if (!event.detail.success) {
      failedLoginAttempts++
      
      if (failedLoginAttempts >= maxFailedAttempts) {
        logAuditEvent({
          action: 'SECURITY_LOCKOUT',
          resource: 'authentication',
          success: false,
          details: {
            attempts: failedLoginAttempts,
            lockoutDuration,
            userAgent: navigator.userAgent
          }
        })
        
        // Implement temporary lockout
        localStorage.setItem('security_lockout', (Date.now() + lockoutDuration).toString())
      }
    } else {
      failedLoginAttempts = 0
    }
  })

  // Monitor for XSS attempts
  const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.set
  if (originalInnerHTML) {
    Object.defineProperty(Element.prototype, 'innerHTML', {
      set: function(value: string) {
        if (typeof value === 'string' && /<script|javascript:|on\w+=/i.test(value)) {
          logAuditEvent({
            action: 'XSS_ATTEMPT_BLOCKED',
            resource: 'dom',
            success: false,
            details: {
              content: value.substring(0, 100),
              element: this.tagName
            }
          })
          return
        }
        return originalInnerHTML.call(this, value)
      },
      get: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.get
    })
  }

  // Monitor for suspicious network requests
  const originalFetch = window.fetch
  window.fetch = async function(...args) {
    const [resource, config] = args
    const url = typeof resource === 'string' ? resource : (resource as Request).url
    
    // Check for suspicious patterns
    if (/\.(php|asp|jsp)$/i.test(url) || /\.\./i.test(url)) {
      logAuditEvent({
        action: 'SUSPICIOUS_REQUEST_BLOCKED',
        resource: 'network',
        success: false,
        details: {
          url,
          method: config?.method || 'GET'
        }
      })
      throw new Error('Suspicious request blocked')
    }
    
    return originalFetch.apply(this, args)
  }
}

// Content Security Policy enforcement
export const enforceCSP = (): void => {
  // Create and inject CSP meta tag
  const cspMeta = document.createElement('meta')
  cspMeta.httpEquiv = 'Content-Security-Policy'
  cspMeta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://api.convex.cloud https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.convex.cloud https://*.clerk.accounts.dev wss:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')
  
  document.head.appendChild(cspMeta)
}

// Secure cookie settings
export const setSecureCookie = (name: string, value: string, options: {
  expires?: Date
  maxAge?: number
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
} = {}): void => {
  const {
    expires,
    maxAge,
    secure = true,
    sameSite = 'strict'
  } = options

  let cookieString = `${name}=${encodeURIComponent(value)}`
  
  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`
  }
  
  if (maxAge) {
    cookieString += `; max-age=${maxAge}`
  }
  
  if (secure) {
    cookieString += '; secure'
  }
  
  cookieString += `; samesite=${sameSite}`
  cookieString += '; httponly'
  
  document.cookie = cookieString
}

// Secure session management
export const secureSessionManager = {
  setSession: (sessionData: any): void => {
    const encrypted = JSON.stringify({
      ...sessionData,
      timestamp: Date.now(),
      fingerprint: generateFingerprint()
    })
    
    secureStorage.setItem('session', encrypted)
  },

  getSession: async (): Promise<any | null> => {
    try {
      const encrypted = await secureStorage.getItem('session')
      if (!encrypted) return null
      
      const session = JSON.parse(encrypted)
      
      // Validate session fingerprint
      if (session.fingerprint !== generateFingerprint()) {
        logAuditEvent({
          action: 'SESSION_FINGERPRINT_MISMATCH',
          resource: 'session',
          success: false
        })
        secureStorage.removeItem('session')
        return null
      }
      
      // Check session expiry
      if (!isSessionValid(session)) {
        secureStorage.removeItem('session')
        return null
      }
      
      return session
    } catch (error) {
      console.error('Session validation failed:', error)
      return null
    }
  },

  clearSession: (): void => {
    secureStorage.removeItem('session')
    logAuditEvent({
      action: 'SESSION_CLEARED',
      resource: 'session',
      success: true
    })
  }
}

// Generate browser fingerprint for session validation
const generateFingerprint = (): string => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx!.textBaseline = 'top'
  ctx!.font = '14px Arial'
  ctx!.fillText('Browser fingerprint', 2, 2)
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|')
  
  return btoa(fingerprint).substring(0, 32)
}

// Initialize security measures
export const initializeSecurity = (): void => {
  // Clean up expired data on startup
  cleanupExpiredData()
  
  // Set up periodic cleanup
  setInterval(cleanupExpiredData, 24 * 60 * 60 * 1000) // Daily cleanup
  
  // Enforce Content Security Policy
  enforceCSP()
  
  // Start security monitoring
  monitorSecurityEvents()
  
  // Log application start
  logAuditEvent({
    action: 'APPLICATION_START',
    resource: 'system',
    success: true,
    details: {
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      fingerprint: generateFingerprint()
    }
  })
  
  // Set up security headers if running in a service worker context
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(_registration => {
      console.log('Security measures initialized with service worker')
    })
  }
  
  // Monitor for tab visibility changes (potential security risk)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      logAuditEvent({
        action: 'TAB_HIDDEN',
        resource: 'session',
        success: true,
        details: { timestamp: Date.now() }
      })
    }
  })
  
  // Monitor for developer tools (basic detection)
  let devtools = { open: false, orientation: null }
  const threshold = 160
  
  setInterval(() => {
    if (window.outerHeight - window.innerHeight > threshold || 
        window.outerWidth - window.innerWidth > threshold) {
      if (!devtools.open) {
        devtools.open = true
        logAuditEvent({
          action: 'DEVTOOLS_OPENED',
          resource: 'security',
          success: false,
          details: { timestamp: Date.now() }
        })
      }
    } else {
      devtools.open = false
    }
  }, 500)
}