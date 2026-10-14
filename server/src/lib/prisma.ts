import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

/**
 * Sanitizes the database connection URL to prevent serverless connection pool starvation.
 * When connection_limit=1 is passed, concurrent requests (such as /auth/me and page data)
 * queue behind a single slot and hit Prisma's 10-second pool timeout.
 * We guarantee connection_limit >= 10 and pool_timeout = 20s.
 */
function getSanitizedDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  let sanitized = url.replace(/([?&])connection_limit=1(&|$)/, '$1connection_limit=10$2');
  if (!sanitized.includes('connection_limit=')) {
    sanitized += (sanitized.includes('?') ? '&' : '?') + 'connection_limit=10';
  }
  if (!sanitized.includes('pool_timeout=')) {
    sanitized += '&pool_timeout=20';
  }
  return sanitized;
}

const dbUrl = getSanitizedDatabaseUrl();

export const prisma =
  global.__prismaClient ||
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log:
      process.env.NODE_ENV === 'development' && !process.env.VERCEL
        ? ['warn', 'error']
        : ['error'],
  });

// Cache PrismaClient instance across warm serverless function invocations to prevent connection pool exhaustion
global.__prismaClient = prisma;

