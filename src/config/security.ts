// Security configuration for the application

export const SECURITY_CONFIG = {
  // Authentication settings
  auth: {
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
    requireMFA: false, // Can be enabled for enhanced security
    passwordMinLength: 8,
    passwordRequirements: {
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true
    }
  },

  // Data protection settings
  dataProtection: {
    encryptSensitiveData: true,
    dataRetentionPeriod: 90 * 24 * 60 * 60 * 1000, // 90 days
    anonymizeAfterDeletion: true,
    auditLogRetention: 365 * 24 * 60 * 60 * 1000, // 1 year
    maxAuditLogs: 10000
  },

  // Network security
  network: {
    allowedDomains: [
      'api.convex.cloud',
      'clerk.accounts.dev',
      'fonts.googleapis.com',
      'fonts.gstatic.com'
    ],
    blockedPatterns: [
      /\.(php|asp|jsp)$/i,
      /\.\./,
      /javascript:/i,
      /data:text\/html/i
    ],
    rateLimiting: {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
      skipSuccessfulRequests: false
    }
  },

  // Content Security Policy
  csp: {
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Required for Vite in development
        'https://api.convex.cloud',
        'https://*.clerk.accounts.dev'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'connect-src': [
        "'self'",
        'https://api.convex.cloud',
        'https://*.clerk.accounts.dev',
        'wss:'
      ],
      'frame-ancestors': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': []
    }
  },

  // Security headers
  headers: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  },

  // Input validation
  validation: {
    maxInputLength: 1000,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    sanitizeHtml: true,
    validateEmails: true,
    validatePhones: true
  },

  // Monitoring and alerting
  monitoring: {
    enableSecurityAlerts: true,
    alertThresholds: {
      failedLogins: 3,
      suspiciousRequests: 10,
      dataExfiltration: 100 * 1024 * 1024 // 100MB
    },
    logLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
  },

  // Privacy settings
  privacy: {
    cookieConsent: true,
    dataMinimization: true,
    rightToErasure: true,
    dataPortability: true,
    consentWithdrawal: true,
    privacyByDesign: true
  },

  // Compliance settings
  compliance: {
    gdprCompliant: true,
    ccpaCompliant: true,
    hipaaCompliant: false, // Not applicable for this use case
    sox404Compliant: false, // Not applicable for this use case
    iso27001Compliant: true
  }
}

// Security utility functions
export const getCSPString = (): string => {
  return Object.entries(SECURITY_CONFIG.csp.directives)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ')
}

export const isAllowedDomain = (url: string): boolean => {
  try {
    const domain = new URL(url).hostname
    return SECURITY_CONFIG.network.allowedDomains.some(allowed => 
      domain === allowed || domain.endsWith(`.${allowed}`)
    )
  } catch {
    return false
  }
}

export const isBlockedPattern = (url: string): boolean => {
  return SECURITY_CONFIG.network.blockedPatterns.some(pattern => 
    pattern.test(url)
  )
}

export const validateFileUpload = (file: File): { valid: boolean; error?: string } => {
  const { allowedFileTypes, maxFileSize } = SECURITY_CONFIG.validation

  if (!allowedFileTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${allowedFileTypes.join(', ')}`
    }
  }

  if (file.size > maxFileSize) {
    return {
      valid: false,
      error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size of ${Math.round(maxFileSize / 1024 / 1024)}MB`
    }
  }

  return { valid: true }
}

export const sanitizeUserInput = (input: string): string => {
  if (!SECURITY_CONFIG.validation.sanitizeHtml) return input

  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:text\/html/gi, '') // Remove data URLs
    .trim()
    .substring(0, SECURITY_CONFIG.validation.maxInputLength)
}

// Security event types for monitoring
export const SecurityEventType = {
  AUTHENTICATION_FAILURE: 'AUTHENTICATION_FAILURE',
  SUSPICIOUS_REQUEST: 'SUSPICIOUS_REQUEST',
  XSS_ATTEMPT: 'XSS_ATTEMPT',
  CSRF_ATTEMPT: 'CSRF_ATTEMPT',
  DATA_BREACH_ATTEMPT: 'DATA_BREACH_ATTEMPT',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  SECURITY_POLICY_VIOLATION: 'SECURITY_POLICY_VIOLATION',
  PRIVACY_VIOLATION: 'PRIVACY_VIOLATION'
}

// Security alert interface
export interface SecurityAlert {
  id: string
  type: typeof SecurityEventType[keyof typeof SecurityEventType]
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details: any
  timestamp: number
  resolved: boolean
  userId?: string
  ipAddress?: string
  userAgent?: string
}

// Export security configuration for use in other modules
export default SECURITY_CONFIG