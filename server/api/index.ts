import type { Request, Response } from 'express';
import { app } from '../src/app';
import { validateProductionConfig } from '../src/config/index';

let startupConfigError: string | null = null;
try {
  validateProductionConfig();
} catch (err: any) {
  startupConfigError = err.message || String(err);
  console.error('❌ [Vercel Serverless] Startup configuration validation failed:\n', startupConfigError);
}

/**
 * Vercel Serverless Function entry point for server project.
 * Exports the Express application directly as a request listener.
 * If critical environment configuration is missing, returns an explicit JSON error response
 * instead of causing an unhandled FUNCTION_INVOCATION_FAILED crash.
 */
export default function handler(req: Request, res: Response) {
  if (startupConfigError) {
    return res.status(500).json({
      success: false,
      error: {
        code: 'MISSING_ENVIRONMENT_VARIABLES',
        message: 'The serverless backend is missing required environment variables in Vercel.',
        details: startupConfigError,
      },
    });
  }
  return app(req, res);
}
