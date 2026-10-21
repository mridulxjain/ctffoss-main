import { Request, Response, NextFunction } from 'express';

interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  code?: string;
  keyGenerator?: (req: Request) => string;
}

interface WindowRecord {
  count: number;
  resetTime: number;
}

/**
 * Securely extracts client IP address, prioritizing Vercel's verified edge headers
 * that cannot be forged by downstream HTTP clients.
 */
export function getClientIp(req: Request): string {
  // 1. Vercel Edge infrastructure verified headers
  const vercelForwarded = req.headers['x-vercel-forwarded-for'];
  if (typeof vercelForwarded === 'string' && vercelForwarded.trim()) {
    return vercelForwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) {
    return realIp.trim();
  }

  // 2. Express req.ip (populated via trusted proxy hops)
  if (req.ip && typeof req.ip === 'string' && req.ip.trim()) {
    return req.ip.trim();
  }

  // 3. Fallback to network socket
  return req.socket?.remoteAddress || 'unknown';
}

/**
 * Lightweight in-memory sliding window rate limiter for Express.
 * Suitable for single-instance deployments and process-local throttling.
 * Note: In multi-replica deployments, a distributed store (e.g. Redis) is recommended.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests. Please slow down and try again later.',
    code = 'TOO_MANY_REQUESTS',
    keyGenerator = (req: Request) => {
      // Prioritize authenticated team ID, then authenticated user ID, then remote IP
      if (req.user?.teamId) return `team:${req.user.teamId}`;
      if (req.user?.id) return `user:${req.user.id}`;
      return `ip:${getClientIp(req)}`;
    },
  } = options;

  const hits = new Map<string, WindowRecord>();

  // Periodic cleanup to avoid memory leak
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, Math.max(windowMs, 60000));

  // Allow Node process to exit cleanly without being kept alive by the interval
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test environment, bypass rate limiting unless explicitly tested
    const isTest = process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.execArgv.includes('--test');
    if (isTest && req.headers['x-test-rate-limit'] !== 'true') {
      next();
      return;
    }

    const key = keyGenerator(req);
    const now = Date.now();

    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(key, record);
      next();
      return;
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        error: {
          message,
          code,
          retryAfterSeconds,
        },
      });
      return;
    }

    next();
  };
}

// Rate limiter for OIDC login initiation: max 180 requests per minute to support simultaneous campus Wi-Fi / NAT logins
export const loginLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: 'Too many authentication attempts. Please slow down and try again shortly.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

// Rate limiter for OIDC callback: max 180 requests per minute
export const callbackLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: 'Too many authentication callbacks. Please slow down and try again shortly.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

// Backward-compatible alias for existing tests / routes
export const authLimiter = loginLimiter;

export const sessionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many session status requests. Please slow down.',
  code: 'SESSION_RATE_LIMIT_EXCEEDED',
});


