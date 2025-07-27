import { describe, it, expect } from 'vitest';
import { 
  safeDivide, 
  safeMultiply, 
  safePercentage, 
  validateNumber, 
  safeAverage, 
  formatCurrencySafe, 
  safeRound,
  clampNumber 
} from '../../utils/numberValidation';

describe('Number Validation Utilities', () => {
  describe('safeDivide', () => {
    it('should return correct result for valid division', () => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(100, 4)).toBe(25);
    });

    it('should return fallback for division by zero', () => {
      expect(safeDivide(10, 0)).toBe(0);
      expect(safeDivide(10, 0, -1)).toBe(-1);
    });

    it('should return fallback for NaN inputs', () => {
      expect(safeDivide(NaN, 2)).toBe(0);
      expect(safeDivide(10, NaN)).toBe(0);
      expect(safeDivide(NaN, NaN)).toBe(0);
    });

    it('should return fallback for undefined inputs', () => {
      expect(safeDivide(undefined as any, 2)).toBe(0);
      expect(safeDivide(10, undefined as any)).toBe(0);
    });
  });

  describe('safeMultiply', () => {
    it('should return correct result for valid multiplication', () => {
      expect(safeMultiply(5, 4)).toBe(20);
      expect(safeMultiply(-3, 2)).toBe(-6);
    });

    it('should return fallback for NaN inputs', () => {
      expect(safeMultiply(NaN, 2)).toBe(0);
      expect(safeMultiply(5, NaN)).toBe(0);
    });

    it('should return fallback for undefined inputs', () => {
      expect(safeMultiply(undefined as any, 2)).toBe(0);
      expect(safeMultiply(5, undefined as any)).toBe(0);
    });
  });

  describe('safePercentage', () => {
    it('should calculate percentage correctly', () => {
      expect(safePercentage(25, 100)).toBe(25);
      expect(safePercentage(1, 4)).toBe(25);
    });

    it('should return fallback for division by zero', () => {
      expect(safePercentage(10, 0)).toBe(0);
    });

    it('should return fallback for invalid inputs', () => {
      expect(safePercentage(NaN, 100)).toBe(0);
      expect(safePercentage(25, NaN)).toBe(0);
    });
  });

  describe('validateNumber', () => {
    it('should return valid numbers unchanged', () => {
      expect(validateNumber(42)).toBe(42);
      expect(validateNumber(-10.5)).toBe(-10.5);
      expect(validateNumber(0)).toBe(0);
    });

    it('should return fallback for invalid inputs', () => {
      expect(validateNumber(NaN)).toBe(0);
      expect(validateNumber(undefined)).toBe(0);
      expect(validateNumber(null)).toBe(0);
      expect(validateNumber(Infinity)).toBe(0);
      expect(validateNumber(-Infinity)).toBe(0);
    });

    it('should use custom fallback', () => {
      expect(validateNumber(NaN, 42)).toBe(42);
      expect(validateNumber(undefined, -1)).toBe(-1);
    });
  });

  describe('safeAverage', () => {
    it('should calculate average correctly', () => {
      expect(safeAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(safeAverage([10, 20, 30])).toBe(20);
    });

    it('should filter out invalid numbers', () => {
      expect(safeAverage([1, NaN, 3, Infinity, 5])).toBe(3);
      expect(safeAverage([10, undefined as any, 30])).toBe(20);
    });

    it('should return fallback for empty or all-invalid arrays', () => {
      expect(safeAverage([])).toBe(0);
      expect(safeAverage([NaN, Infinity, undefined as any])).toBe(0);
      expect(safeAverage([NaN, Infinity], 42)).toBe(42);
    });
  });

  describe('formatCurrencySafe', () => {
    it('should format valid numbers correctly', () => {
      expect(formatCurrencySafe(1000)).toMatch(/₹.*1,000/);
      expect(formatCurrencySafe(0)).toMatch(/₹.*0/);
    });

    it('should handle invalid inputs gracefully', () => {
      expect(formatCurrencySafe(NaN)).toMatch(/₹.*0/);
      expect(formatCurrencySafe(undefined)).toMatch(/₹.*0/);
      expect(formatCurrencySafe(null)).toMatch(/₹.*0/);
    });
  });

  describe('safeRound', () => {
    it('should round numbers correctly', () => {
      expect(safeRound(3.14159, 2)).toBe(3.14);
      expect(safeRound(10.567, 1)).toBe(10.6);
      expect(safeRound(42.999, 0)).toBe(43);
    });

    it('should return fallback for invalid inputs', () => {
      expect(safeRound(NaN, 2)).toBe(0);
      expect(safeRound(Infinity, 2)).toBe(0);
      expect(safeRound(NaN, 2, 42)).toBe(42);
    });
  });

  describe('clampNumber', () => {
    it('should clamp numbers to range', () => {
      expect(clampNumber(15, 10, 20)).toBe(15);
      expect(clampNumber(5, 10, 20)).toBe(10);
      expect(clampNumber(25, 10, 20)).toBe(20);
    });

    it('should return fallback for invalid inputs', () => {
      expect(clampNumber(NaN, 10, 20)).toBe(0);
      expect(clampNumber(Infinity, 10, 20)).toBe(0);
      expect(clampNumber(NaN, 10, 20, 42)).toBe(42);
    });
  });
});
