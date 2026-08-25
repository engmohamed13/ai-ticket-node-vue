import { prisma } from '../db/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';

export interface ApiHealth {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface VerboseApiHealth extends ApiHealth {
  nodeVersion: string;
  memoryRssBytes: number;
}

export const getApiHealth = (verbose: boolean): ApiHealth | VerboseApiHealth => {
  const base: ApiHealth = {
    status: 'ok',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  };
  if (!verbose) return base;
  return { ...base, nodeVersion: process.version, memoryRssBytes: process.memoryUsage().rss };
};

export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number | null;
  schemaVersion: string | null;
  error: string | null;
}

export const getDatabaseHealth = async (): Promise<DatabaseHealth> => {
  const startedAt = process.hrtime.bigint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const row = await prisma.systemInfo.findUnique({ where: { key: 'schemaVersion' } });
    const latencyMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    return { status: 'up', latencyMs, schemaVersion: row?.value ?? null, error: null };
  } catch (error) {
    logger.error({ err: error }, 'Database health probe failed');
    return {
      status: 'down',
      latencyMs: null,
      schemaVersion: null,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
};
