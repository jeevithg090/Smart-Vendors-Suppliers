import { describe, it, expect } from 'vitest';
import { FormValidator, validationSchemas, commonSchemas } from '../../utils/validation';

describe('FormValidator', () => {
  describe('validate', () => {
    it('should validate required fields', () => {
      const data = { name: '' };
      const schema = { name: { required: true } };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('name');
      expect(result.errors[0].message).toContain('required');
    });

    it('should validate string length constraints', () => {
      const data = { name: 'ab' };
      const schema = { name: { minLength: 3, maxLength: 10 } };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 3 characters');
    });

    it('should validate numeric constraints', () => {
      const data = { quantity: -1 };
      const schema = { quantity: { min: 0, max: 100 } };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 0');
    });

    it('should validate pattern matching', () => {
      const data = { email: 'invalid-email' };
      const schema = { email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('format is invalid');
    });

    it('should validate custom rules', () => {
      const data = { password: 'weak' };
      const schema = { 
        password: { 
          custom: (value: string) => value.length < 8 ? 'Password too weak' : null 
        } 
      };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Password too weak');
    });

    it('should pass validation for valid data', () => {
      const data = { 
        name: 'John Doe',
        email: 'john@example.com',
        age: 25
      };
      const schema = {
        name: { required: true, minLength: 2 },
        email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
        age: { min: 18, max: 100 }
      };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});

describe('Common Schemas', () => {
  describe('email validation', () => {
    it('should validate correct email format', () => {
      const data = { email: 'test@example.com' };
      const schema = { email: commonSchemas.email };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const data = { email: 'invalid-email' };
      const schema = { email: commonSchemas.email };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('phone validation', () => {
    it('should validate correct phone format', () => {
      const data = { phone: '+91 9876543210' };
      const schema = { phone: commonSchemas.phone };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject short phone numbers', () => {
      const data = { phone: '123' };
      const schema = { phone: commonSchemas.phone };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('password validation', () => {
    it('should validate strong password', () => {
      const data = { password: 'StrongPass123' };
      const schema = { password: commonSchemas.password };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject weak password', () => {
      const data = { password: 'weak' };
      const schema = { password: commonSchemas.password };
      
      const result = FormValidator.validate(data, schema);
      
      expect(result.isValid).toBe(false);
    });
  });
});

describe('Validation Schemas', () => {
  describe('vendorRegistration', () => {
    it('should validate complete vendor registration data', () => {
      const data = {
        businessName: 'Test Business',
        ownerName: 'John Doe',
        email: 'john@example.com',
        phone: '+91 9876543210',
        password: 'StrongPass123',
        businessType: 'restaurant',
        address: '123 Main Street, Mumbai, Maharashtra'
      };
      
      const result = FormValidator.validate(data, validationSchemas.vendorRegistration);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject incomplete vendor registration data', () => {
      const data = {
        businessName: '',
        email: 'invalid-email'
      };
      
      const result = FormValidator.validate(data, validationSchemas.vendorRegistration);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('orderPlacement', () => {
    it('should validate complete order data', () => {
      const data = {
        supplierId: 'supplier-123',
        items: [{ name: 'Tomatoes', quantity: 5 }],
        deliveryAddress: '123 Main Street, Mumbai, Maharashtra'
      };
      
      const result = FormValidator.validate(data, validationSchemas.orderPlacement);
      
      expect(result.isValid).toBe(true);
    });

    it('should reject order without items', () => {
      const data = {
        supplierId: 'supplier-123',
        items: [],
        deliveryAddress: '123 Main Street'
      };
      
      const result = FormValidator.validate(data, validationSchemas.orderPlacement);
      
      expect(result.isValid).toBe(false);
    });
  });
});