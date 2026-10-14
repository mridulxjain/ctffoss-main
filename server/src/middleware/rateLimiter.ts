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
      const forwarded = req.headers['x-forwarded-for'];
      const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
      return `ip:${ip}`;
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

export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many authentication attempts. Please slow down and try again shortly.',
  code: 'AUTH_RATE_LIMIT_EXCEEDED',
});

export const sessionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: 'Too many session status requests. Please slow down.',
  code: 'SESSION_RATE_LIMIT_EXCEEDED',
});

