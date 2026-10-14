import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { config } from './config/index';
import { authenticate } from './middleware/auth';
import apiRoutes from './routes/index';

export const app = express();

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
      // Allow requests with no origin (like mobile apps, curl, or server-to-server)
      if (!origin) return callback(null, true);
      const allowedOrigins = [
        config.frontendUrl,
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://ctf.fossclub.tech',
      ];
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global authentication extractor (attaches req.user if token present)
app.use(authenticate);

// API v1 routes
app.use('/api/v1', apiRoutes);

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
  console.error('[Unhandled Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_SERVER_ERROR',
    },
  });
});
