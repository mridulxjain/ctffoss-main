import { app } from '../server/src/app';
import { validateProductionConfig } from '../server/src/config/index';

// Validate production secrets and critical environment variables once at module load
validateProductionConfig();

/**
 * Vercel Serverless Function entry point.
 * Exports the Express application directly as a request listener.
 * Does NOT call app.listen() to comply with Vercel's serverless runtime.
 */
export default app;
