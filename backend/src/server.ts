import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { pool } from './config/db';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
});

// Graceful shutdown — drain the DB pool and close the HTTP server cleanly.
const teardown = async () => {
  await pool.end();
  logger.info('Server and DB pool closed. Exiting.');
  process.exit(0);
};

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutdown signal received, closing server...');
  server.close(() => {
    void teardown();
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default server;
