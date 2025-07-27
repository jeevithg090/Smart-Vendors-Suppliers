// Error type definitions for the application

export interface BaseError {
  type: string;
  message: string;
  timestamp: number;
  userId?: string;
  context?: Record<string, any>;
}

export interface AuthError extends BaseError {
  type: 'AUTH_ERROR';
  code: 'INVALID_CREDENTIALS' | 'SESSION_EXPIRED' | 'UNAUTHORIZED' | 'REGISTRATION_FAILED';
  redirectTo?: string;
}

export interface NetworkError extends BaseError {
  type: 'NETWORK_ERROR';
  code: 'CONNECTION_FAILED' | 'TIMEOUT' | 'SERVER_ERROR' | 'RATE_LIMITED';
  retryable: boolean;
  retryAfter?: number;
}

export interface ValidationError extends BaseError {
  type: 'VALIDATION_ERROR';
  field: string;
  value: any;
  constraints: string[];
}

export interface BusinessError extends BaseError {
  type: 'BUSINESS_ERROR';
  code: 'INSUFFICIENT_STOCK' | 'ORDER_EXPIRED' | 'PAYMENT_FAILED' | 'SUPPLIER_UNAVAILABLE' | 'GROUP_ORDER_FULL' | 
        'MINIMUM_ORDER_NOT_MET' | 'DELIVERY_AREA_NOT_SUPPORTED' | 'GROUP_ORDER_EXPIRED' | 'QUANTITY_EXCEEDS_CAPACITY' | 'INVALID_PAYMENT_AMOUNT';
  suggestions?: string[];
  actionable: boolean;
}

export interface SystemError extends BaseError {
  type: 'SYSTEM_ERROR';
  code: 'UNKNOWN' | 'DATABASE_ERROR' | 'SERVICE_UNAVAILABLE' | 'CHUNK_LOAD_ERROR' | 'NETWORK_ERROR' | 'PERMISSION_ERROR';
  stack?: string;
  componentStack?: string;
}

export type AppError = AuthError | NetworkError | ValidationError | BusinessError | SystemError;

export interface ErrorReport {
  error: AppError;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
}