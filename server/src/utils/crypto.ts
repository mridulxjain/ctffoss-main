import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/index';

/**
 * Creates a deterministic SHA-256 hash of a flag salted with a server-side pepper.
 */
export function hashFlag(flag: string, isCaseSensitive: boolean = true): string {
  const normalized = isCaseSensitive ? flag.trim() : flag.trim().toLowerCase();
  return crypto
    .createHmac('sha256', config.flagPepper)
    .update(normalized)
    .digest('hex');
}

/**
 * Compares a submitted flag against the stored hash in constant time.
 */
export function verifyFlag(
  submitted: string,
  storedHash: string,
  isCaseSensitive: boolean = true
): boolean {
  try {
    const computedHash = hashFlag(submitted, isCaseSensitive);
    const computedBuf = Buffer.from(computedHash, 'utf8');
    const storedBuf = Buffer.from(storedHash, 'utf8');

    if (computedBuf.length !== storedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy, alphanumeric invite code for teams.
 */
export function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 characters
}

/**
 * Signs a JWT token with session details.
 */
export function signToken(payload: object, expiresIn: string = '7d'): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn } as jwt.SignOptions);
}

/**
 * Verifies a JWT token and returns the decoded payload.
 */
export function verifyJwtToken<T extends object>(token: string): T | null {
  try {
    return jwt.verify(token, config.jwtSecret) as T;
  } catch {
    return null;
  }
}
