import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const parsedCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') !== 'production',
  enableDevAuth: process.env.ENABLE_DEV_AUTH === 'true',
  jwtSecret: process.env.JWT_SECRET || 'foss-ctf-super-secure-dev-jwt-secret-key-replace-in-prod-32c',
  flagPepper: process.env.FLAG_PEPPER || 'foss-ctf-flag-pepper-secret-dev-replace-in-prod',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
  directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=ctf',
  storageDriver: (process.env.STORAGE_DRIVER as 'postgres' | 'memory' | undefined) || null,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  corsOrigins: parsedCorsOrigins,
  cookieSameSite: ((process.env.COOKIE_SAME_SITE as 'lax' | 'none' | 'strict') || 'lax') as 'lax' | 'none' | 'strict',
  trustProxy: process.env.TRUST_PROXY || ((process.env.NODE_ENV || 'development') === 'production' ? '1' : false),
  valenfindUrl: process.env.VALENFIND_URL || 'https://ctffoss.vercel.app',
  valenfindChallengeUrl:
    process.env.LOVENTIA_CHALLENGE_URL ||
    process.env.VALENFIND_CHALLENGE_URL ||
    'https://ctffoss.vercel.app',
  loventiaChallengeUrl:
    process.env.LOVENTIA_CHALLENGE_URL ||
    process.env.VALENFIND_CHALLENGE_URL ||
    'https://ctffoss.vercel.app',
  valenfindVerifySecret:
    process.env.LOVENTIA_VERIFY_KEY ||
    process.env.LOVENTIA_VERIFY_SECRET ||
    process.env.VALENFIND_VERIFY_SECRET ||
    'foss-ctf-internal-verification-secret',
  oidcIssuer: process.env.OIDC_ISSUER_URL || process.env.OIDC_ISSUER || 'https://oidc.fossclub.tech',
  oidcClientId: process.env.OIDC_CLIENT_ID || 'ctf',
  oidcClientSecret: process.env.OIDC_CLIENT_SECRET || '',
  oidcRedirectUri:
    process.env.OIDC_REDIRECT_URI || 'http://localhost:4000/api/v1/auth/callback',
  oidcPostLogoutRedirectUri:
    process.env.OIDC_POST_LOGOUT_REDIRECT_URI || 'http://localhost:5173',
  oidcScopes: process.env.OIDC_SCOPES || 'openid profile email club',
};

export const DEV_DEFAULT_SECRETS = {
  jwtSecret: 'foss-ctf-super-secure-dev-jwt-secret-key-replace-in-prod-32c',
  flagPepper: 'foss-ctf-flag-pepper-secret-dev-replace-in-prod',
  valenfindVerifySecret: 'foss-ctf-internal-verification-secret',
};

/**
 * Validates critical configuration parameters when operating in production mode.
 * Throws descriptive error and prevents insecure startup without exposing secret values.
 */
export function validateProductionConfig(): void {
  if (config.nodeEnv !== 'production') return;

  const errors: string[] = [];

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === '' || process.env.JWT_SECRET === DEV_DEFAULT_SECRETS.jwtSecret) {
    errors.push('JWT_SECRET must be set to a secure, unique string in production (cannot use development default).');
  }

  if (!process.env.FLAG_PEPPER || process.env.FLAG_PEPPER.trim() === '' || process.env.FLAG_PEPPER === DEV_DEFAULT_SECRETS.flagPepper) {
    errors.push('FLAG_PEPPER must be set to a secure, unique string in production (cannot use development default).');
  }

  const verifySecret =
    process.env.LOVENTIA_VERIFY_KEY ||
    process.env.LOVENTIA_VERIFY_SECRET ||
    process.env.VALENFIND_VERIFY_SECRET;
  if (!verifySecret || verifySecret.trim() === '' || verifySecret === DEV_DEFAULT_SECRETS.valenfindVerifySecret) {
    errors.push('VALENFIND_VERIFY_SECRET or LOVENTIA_VERIFY_KEY must be explicitly configured in production.');
  }

  if (process.env.ENABLE_DEV_AUTH === 'true') {
    errors.push('ENABLE_DEV_AUTH must not be enabled in production.');
  }

  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === '') {
    errors.push('DATABASE_URL must be configured for PostgreSQL in production.');
  }

  if (!process.env.DIRECT_URL || process.env.DIRECT_URL.trim() === '') {
    errors.push('DIRECT_URL must be configured for direct database connection in production.');
  }

  if (errors.length > 0) {
    const errorMsg = `[Configuration Error] Production startup rejected:\n${errors.map((e) => `  - ${e}`).join('\n')}`;
    throw new Error(errorMsg);
  }
}

