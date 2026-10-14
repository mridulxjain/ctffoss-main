import { app } from './app';
import { config, validateProductionConfig } from './config/index';
import { dbService } from './services/db.service';

async function bootstrap() {
  try {
    // 1. Validate environment configuration (strictly enforced in production)
    validateProductionConfig();

    // 2. Initialize database / storage driver (enforces PostgreSQL in production)
    const driver = await dbService.initStorage();

    // 2b. Seed local development testing fixtures (4 fake teams and 16 participants)
    if (config.isDev && config.enableDevAuth) {
      await dbService.seedDevFixtures();
    }

    // 3. Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`\n==========================================`);
      console.log(`🛡️  FOSS CTF API Server is running`);
      console.log(`📡 URL: http://localhost:${config.port}`);
      console.log(`⚡ Environment: ${config.nodeEnv}`);
      console.log(`💾 Storage: ${driver.toUpperCase()}`);
      console.log(`🔑 Dev Auth: ${config.enableDevAuth ? 'ENABLED' : 'DISABLED'}`);
      console.log(`==========================================\n`);
    });

    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received. Closing HTTP server.');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('SIGINT signal received. Closing HTTP server.');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    });
  } catch (err: any) {
    console.error('❌ FATAL: Server startup aborted:', err.message || err);
    process.exit(1);
  }
}

bootstrap();

