import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import { env, isProduction } from '../config/env';
import { logger } from '../config/logger';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: isProduction ? ['error'] : ['warn', 'error']
});

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
};
