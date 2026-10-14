import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config/index';
import { authenticate } from './middleware/auth';
import apiRoutes from './routes/index';

export const app = express();

// Reverse proxy trust (for accurate protocol detection & OIDC callback matching)
if (config.trustProxy) {
  app.set('trust proxy', config.trustProxy);
}

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible integration during dev
  })
);

// CORS configuration for local Vite development and production domains
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, internal server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        config.frontendUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5174',
        'https://ctf.fossclub.tech',
        ...config.corsOrigins,
      ];

      if (allowedOrigins.includes(origin) || (config.isDev && origin.endsWith('.vercel.app'))) {
        return callback(null, true);
      }

      // Permissive fallback ONLY in development mode
      if (config.isDev) {
        return callback(null, true);
      }

      const corsError = new Error(`Origin ${origin} is not allowed by CORS policy`);
      (corsError as any).status = 403;
      (corsError as any).code = 'CORS_DISALLOWED';
      return callback(corsError);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);


app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global authentication extractor (attaches req.user if token present)
app.use(authenticate);

// API v1 routes (mounted under both /api/v1 and /v1 for serverless rewrites compatibility)
app.use('/api/v1', apiRoutes);
app.use('/v1', apiRoutes);

// Serverless root and health check endpoints
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'foss-ctf-api',
    docs: '/api/v1/health',
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'foss-ctf-api',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'Welcome to FOSS CTF API',
    docs: '/api/v1/health',
  });
});

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found', code: 'NOT_FOUND' },
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  // 1. CORS rejection
  if (err.code === 'CORS_DISALLOWED' || err.message?.includes('CORS policy')) {
    res.status(403).json({
      success: false,
      error: {
        message: 'Request origin is not permitted by CORS policy',
        code: 'CORS_DISALLOWED',
      },
    });
    return;
  }

  // 2. Database connectivity / Prisma errors
  const isPrismaError =
    err.name?.includes('Prisma') ||
    err.code?.startsWith('P') ||
    err.name === 'DatabaseError' ||
    err.code === 'DATABASE_ERROR';

  if (isPrismaError) {
    console.error('[Database Error]', err.message || err);
    res.status(503).json({
      success: false,
      error: {
        message: config.isDev
          ? err.message
          : 'Database service is temporarily unavailable. Please try again shortly.',
        code: 'DATABASE_UNAVAILABLE',
      },
    });
    return;
  }

  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_SERVER_ERROR',
    },
  });
});

