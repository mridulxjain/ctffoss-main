import { app } from './app';
import { config } from './config/index';

const server = app.listen(config.port, () => {
  console.log(`\n==========================================`);
  console.log(`🛡️  FOSS CTF API Server is running`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`⚡ Environment: ${config.nodeEnv}`);
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
