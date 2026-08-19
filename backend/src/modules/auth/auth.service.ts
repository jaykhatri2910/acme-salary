import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { query } from '../../config/db';
import { env } from '../../config/env';
import { verifyPassword } from '../../utils/crypto';

export interface UserSession {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export interface RefreshSessionResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Hash a plain text token using SHA-256.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Validate user credentials.
 * Returns user if email and password match, null otherwise.
 */
export async function validateUserCredentials(
  email: string,
  password: string
) {
  const res = await query<{
    id: string;
    email: string;
    password_hash: string;
    name: string;
    role: string;
  }>('SELECT id, email, password_hash, name, role FROM users WHERE email = $1', [email]);

  if (res.rows.length === 0) {
    return null;
  }

  const user = res.rows[0];
  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

/**
 * Create a new user session:
 * - Generates a 15-minute access JWT.
 * - Generates a random refresh token, hashes it, and stores it in the database (expires in 7 days).
 */
export async function createSession(
  userId: string,
  role: string
): Promise<{ accessToken: string; refreshToken: string }> {
  // Generate short-lived access token
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, {
    expiresIn: '15m',
  });

  // Generate long-lived refresh token
  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Store hashed refresh token in database
  await query(
    'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
    [crypto.randomUUID(), userId, tokenHash, expiresAt.toISOString()]
  );

  return {
    accessToken,
    refreshToken: rawRefreshToken,
  };
}

/**
 * Refresh an active session using a valid refresh token.
 * Performs refresh token rotation (deletes the old one and generates a new one).
 */
export async function refreshSession(
  refreshToken: string
): Promise<RefreshSessionResult | null> {
  const tokenHash = hashToken(refreshToken);

  // Fetch the token record
  const tokenRes = await query<{
    id: string;
    user_id: string;
    expires_at: Date;
  }>('SELECT id, user_id, expires_at FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);

  if (tokenRes.rows.length === 0) {
    return null;
  }

  const tokenRecord = tokenRes.rows[0];

  // Delete the old token (rotation/invalidation)
  await query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id]);

  // Check if expired
  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Fetch user information
  const userRes = await query<{
    id: string;
    role: string;
  }>('SELECT id, role FROM users WHERE id = $1', [tokenRecord.user_id]);

  if (userRes.rows.length === 0) {
    return null;
  }

  const user = userRes.rows[0];

  // Create a new session (returns new access token & rotated refresh token)
  return createSession(user.id, user.role);
}

/**
 * Revoke a refresh token on logout.
 */
export async function revokeSession(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
}
