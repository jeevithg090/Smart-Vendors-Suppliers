import type { ValidationError } from '../types/errors';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: any) => string | null;
}

export interface ValidationSchema {
  [field: string]: ValidationRule;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class FormValidator {
  static validate(data: Record<string, any>, schema: ValidationSchema): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, rules);
      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private static validateField(field: string, value: any, rules: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = [];
    const constraints: string[] = [];

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push({
        type: 'VALIDATION_ERROR',
        field,
        value,
        message: `${field} is required`,
        timestamp: Date.now(),
        constraints: ['required']
      });
      return errors; // Don't continue if required field is empty
    }

    // Skip other validations if value is empty and not required
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // String length validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        constraints.push(`minLength:${rules.minLength}`);
        errors.push({
          type: 'VALIDATION_ERROR',
          field,
          value,
          message: `${field} must be at least ${rules.minLength} characters long`,
          timestamp: Date.now(),
          constraints
        });
      }

      if (rules.maxLength && value.length > rules.maxLength) {
        constraints.push(`maxLength:${rules.maxLength}`);
        errors.push({
          type: 'VALIDATION_ERROR',
          field,
          value,
          message: `${field} must be no more than ${rules.maxLength} characters long`,
          timestamp: Date.now(),
          constraints
        });
      }

      // Pattern validation
      if (rules.pattern && !rules.pattern.test(value)) {
        constraints.push(`pattern:${rules.pattern.source}`);
        errors.push({
          type: 'VALIDATION_ERROR',
          field,
          value,
          message: `${field} format is invalid`,
          timestamp: Date.now(),
          constraints
        });
      }
    }

    // Numeric validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        constraints.push(`min:${rules.min}`);
        errors.push({
          type: 'VALIDATION_ERROR',
          field,
          value,
          message: `${field} must be at least ${rules.min}`,
          timestamp: Date.now(),
          constraints
        });
      }

      if (rules.max !== undefined && value > rules.max) {
        constraints.push(`max:${rules.max}`);
        errors.push({
          type: 'VALIDATION_ERROR',
          field,
          value,
          message: `${field} must be no more than ${rules.max}`,
          timestamp: Date.now(),
          constraints
        });
      }
    }

    // Custom validation
    if (rules.custom) {
      const customError = rules.custom(value);
      if (customError) {
        constraints.push('custom');
        errors.push({
          type: 'VALIDATION_ERROR',
          field,
          value,
          message: customError,
          timestamp: Date.now(),
          constraints
        });
      }
    }

    return errors;
  }
}

// Common validation schemas
export const commonSchemas = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    custom: (value: string) => {
      if (value && !value.includes('@')) {
        return 'Please enter a valid email address';
      }
      return null;
    }
  },

  phone: {
    pattern: /^[+]?[\d\s\-\(\)]{10,}$/,
    custom: (value: string) => {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.length < 10) {
        return 'Phone number must be at least 10 digits';
      }
      return null;
    }
  },

  password: {
    minLength: 8,
    custom: (value: string) => {
      if (!/(?=.*[a-z])/.test(value)) {
        return 'Password must contain at least one lowercase letter';
      }
      if (!/(?=.*[A-Z])/.test(value)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!/(?=.*\d)/.test(value)) {
        return 'Password must contain at least one number';
      }
      return null;
    }
  },

  quantity: {
    min: 1,
    custom: (value: number) => {
      if (!Number.isInteger(value)) {
        return 'Quantity must be a whole number';
      }
      return null;
    }
  },

  price: {
    min: 0,
    custom: (value: number) => {
      if (value < 0) {
        return 'Price cannot be negative';
      }
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        return 'Price can have at most 2 decimal places';
      }
      return null;
    }
  }
};

// Validation schemas for specific forms
export const validationSchemas = {
  vendorRegistration: {
    businessName: { required: true, minLength: 2, maxLength: 100 },
    ownerName: { required: true, minLength: 2, maxLength: 50 },
    email: { required: true, ...commonSchemas.email },
    phone: { required: true, ...commonSchemas.phone },
    password: { required: true, ...commonSchemas.password },
    businessType: { required: true },
    address: { required: true, minLength: 10, maxLength: 200 }
  },

  orderPlacement: {
    supplierId: { required: true },
    items: { 
      required: true,
      custom: (value: any[]) => {
        if (!Array.isArray(value) || value.length === 0) {
          return 'At least one item is required';
        }
        return null;
      }
    },
    deliveryAddress: { required: true, minLength: 10, maxLength: 200 }
  },

  supplierSearch: {
    query: { minLength: 2, maxLength: 100 },
    maxDistance: { min: 1, max: 100 },
    minRating: { min: 1, max: 5 }
  },

  groupOrderCreation: {
    itemName: { required: true, minLength: 2, maxLength: 100 },
    targetQuantity: { required: true, ...commonSchemas.quantity },
    pricePerUnit: { required: true, ...commonSchemas.price },
    supplierId: { required: true }
  },

  rating: {
    rating: { required: true, min: 1, max: 5 },
    review: { maxLength: 500 },
    orderId: { required: true }
  }
};