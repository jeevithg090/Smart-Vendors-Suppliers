/**
 * Password hashing with PBKDF2-SHA256 via the Web Crypto API, which is
 * available both in the Convex runtime and in Node 18+ (used by tests).
 */

export const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTES = 16;
export const MIN_PASSWORD_LENGTH = 8;

export interface PasswordHash {
  hash: string;
  salt: string;
  iterations: number;
}

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

const fromHex = (hex: string) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_LENGTH_BITS,
  );
  return toHex(new Uint8Array(bits));
}

export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<PasswordHash> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  return { hash: await derive(password, salt, iterations), salt: toHex(salt), iterations };
}

/** Length-independent constant-time string comparison. */
export function timingSafeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  const candidate = await derive(password, fromHex(stored.salt), stored.iterations);
  return timingSafeEqual(candidate, stored.hash);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
