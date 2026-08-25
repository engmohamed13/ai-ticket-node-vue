import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma } from './db/prisma';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'CustomerSupportCRM API started');
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
