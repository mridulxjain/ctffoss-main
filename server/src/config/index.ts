import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') !== 'production',
  enableDevAuth: process.env.ENABLE_DEV_AUTH === 'true',
  jwtSecret: process.env.JWT_SECRET || 'foss-ctf-super-secure-dev-jwt-secret-key-replace-in-prod-32c',
  flagPepper: process.env.FLAG_PEPPER || 'foss-ctf-flag-pepper-secret-dev-replace-in-prod',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/fossctf?schema=public',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  valenfindUrl: process.env.VALENFIND_URL || 'http://localhost:4000',
  valenfindVerifySecret:
    process.env.VALENFIND_VERIFY_SECRET || 'foss-ctf-internal-verification-secret',
};
