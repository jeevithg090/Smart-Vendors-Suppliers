import { describe, expect, it } from 'vitest';
import { extractServerErrorMessage, isConnectivityFailure } from '../../utils/authErrors';

describe('isConnectivityFailure', () => {
  it('detects network-level failures', () => {
    expect(isConnectivityFailure(new Error('TypeError: Failed to fetch'))).toBe(true);
    expect(isConnectivityFailure(new Error('Request timed out after 10000ms'))).toBe(true);
  });

  it('does not treat application errors as connectivity issues', () => {
    expect(isConnectivityFailure(new Error('Invalid email or password'))).toBe(false);
    expect(isConnectivityFailure(new Error('An account with this email already exists'))).toBe(false);
  });
});

describe('extractServerErrorMessage', () => {
  it('extracts the message thrown by a Convex function', () => {
    const error = new Error(
      '[CONVEX M(auth:authenticateUser)] [Request ID: abc] Server Error\nUncaught Error: Invalid email or password\n    at handler (../convex/auth.ts:10:5)',
    );
    expect(extractServerErrorMessage(error, 'fallback')).toBe('Invalid email or password');
  });

  it('falls back for opaque server errors and empty input', () => {
    expect(extractServerErrorMessage(new Error('[CONVEX M(x)] Server Error'), 'fallback')).toBe('fallback');
    expect(extractServerErrorMessage(undefined, 'fallback')).toBe('fallback');
  });

  it('returns plain error messages as-is', () => {
    expect(extractServerErrorMessage(new Error('Something specific'), 'fallback')).toBe('Something specific');
  });
});
