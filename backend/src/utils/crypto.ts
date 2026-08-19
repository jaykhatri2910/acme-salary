import crypto from 'crypto';

/**
 * Deterministically hash a password using PBKDF2 (SHA-512).
 * Uses a fixed salt for simplicity and compatibility with the database seed.
 */
export function hashPassword(password: string): string {
  const salt = 'acme_salary_salt_2026';
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `pbkdf2_${salt}_${hash}`;
}

/**
 * Verify a plain text password against a PBKDF2 hash.
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
