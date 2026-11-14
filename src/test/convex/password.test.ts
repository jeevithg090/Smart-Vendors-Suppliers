import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  timingSafeEqual,
  verifyPassword,
} from '../../../convex/lib/password';

// jsdom does not implement SubtleCrypto; use Node's WebCrypto (same API as the Convex runtime).
beforeAll(() => {
  vi.stubGlobal('crypto', webcrypto);
});

describe('password hashing', () => {
  it('verifies the original password and rejects others', async () => {
    const stored = await hashPassword('correct horse battery', 1000);
    expect(stored.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.salt).toMatch(/^[0-9a-f]{32}$/);
    await expect(verifyPassword('correct horse battery', stored)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', stored)).resolves.toBe(false);
  });

  it('salts every hash', async () => {
    const a = await hashPassword('same-password', 1000);
    const b = await hashPassword('same-password', 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe('helpers', () => {
  it('compares strings in constant time semantics', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
  });

  it('normalises and validates emails', () => {
    expect(normalizeEmail('  Vendor@Example.COM ')).toBe('vendor@example.com');
    expect(isValidEmail('vendor@example.com')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});
