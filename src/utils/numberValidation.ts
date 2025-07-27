// Utility functions to prevent NaN values in calculations

/**
 * Safely divides two numbers, returning 0 if the result would be NaN or Infinity
 */
export const safeDivide = (numerator: number, denominator: number, fallback = 0): number => {
  if (!isFinite(numerator) || !isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return isFinite(result) ? result : fallback;
};

/**
 * Safely multiplies numbers, returning 0 if any value is invalid
 */
export const safeMultiply = (a: number, b: number, fallback = 0): number => {
  if (!isFinite(a) || !isFinite(b)) {
    return fallback;
  }
  const result = a * b;
  return isFinite(result) ? result : fallback;
};

/**
 * Safely calculates percentage, returning 0 if the result would be invalid
 */
export const safePercentage = (value: number, total: number, fallback = 0): number => {
  if (!isFinite(value) || !isFinite(total) || total === 0) {
    return fallback;
  }
  const result = (value / total) * 100;
  return isFinite(result) ? result : fallback;
};

/**
 * Validates a number and returns a fallback if invalid
 */
export const validateNumber = (value: number | undefined | null, fallback = 0): number => {
  if (value === null || value === undefined || !isFinite(value)) {
    return fallback;
  }
  return value;
};

/**
 * Safely calculates the average of an array of numbers
 */
export const safeAverage = (numbers: number[], fallback = 0): number => {
  const validNumbers = numbers.filter(n => isFinite(n));
  if (validNumbers.length === 0) {
    return fallback;
  }
  const sum = validNumbers.reduce((acc, num) => acc + num, 0);
  return safeDivide(sum, validNumbers.length, fallback);
};

/**
 * Formats currency safely, handling NaN and undefined values
 */
export const formatCurrencySafe = (amount: number | undefined | null): string => {
  const validAmount = validateNumber(amount, 0);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(validAmount);
};

/**
 * Safely rounds a number to specified decimal places
 */
export const safeRound = (value: number, decimals = 2, fallback = 0): number => {
  if (!isFinite(value)) {
    return fallback;
  }
  const multiplier = Math.pow(10, decimals);
  const result = Math.round(value * multiplier) / multiplier;
  return isFinite(result) ? result : fallback;
};

/**
 * Ensures a value is within min/max bounds and is a valid number
 */
export const clampNumber = (value: number, min = 0, max = Infinity, fallback = 0): number => {
  if (!isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
};
