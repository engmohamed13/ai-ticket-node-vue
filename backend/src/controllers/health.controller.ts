import { Request, Response } from 'express';
import { getApiHealth, getDatabaseHealth } from '../services/health.service';
import { ok } from '../utils/apiResponse';

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  const verbose = req.query.verbose === 'true';
  const [api, database] = await Promise.all([getApiHealth(verbose), getDatabaseHealth()]);
  const status = database.status === 'up' ? 'ok' : 'degraded';

  res.status(status === 'ok' ? 200 : 503).json(ok({ status, api, database }, 'API is healthy'));
};

export const getDatabaseReadiness = async (_req: Request, res: Response): Promise<void> => {
  const database = await getDatabaseHealth();
  const status = database.status === 'up' ? 200 : 503;

  res.status(status).json(ok({ database }, 'Database readiness'));
};
