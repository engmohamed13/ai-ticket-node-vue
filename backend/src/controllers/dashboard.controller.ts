import { Request, Response } from 'express';
import {
  getAgentWorkload,
  getCustomerSatisfaction,
  getTicketTrends,
  getTicketsSummary
} from '../services/dashboard.service';
import type { DashboardFilter } from '../services/dashboard.service';
import { listTopArticles } from '../services/kb.service';
import { ok } from '../utils/apiResponse';
import type { TicketPriority, TicketStatus } from '../tickets/types';

/** The query shape every dashboard route shares, already coerced by the route schema. */
interface DashboardQuery {
  startDate?: Date;
  endDate?: Date;
  status?: TicketStatus;
  priority?: TicketPriority;
  assignedToUserId?: number;
  weeks?: number;
  limit?: number;
}

const toFilter = (req: Request): DashboardFilter => {
  const query = req.query as unknown as DashboardQuery;
  return {
    startDate: query.startDate,
    endDate: query.endDate,
    status: query.status,
    priority: query.priority,
    assignedToUserId: query.assignedToUserId
  };
};

export const getTicketsSummaryHandler = async (req: Request, res: Response): Promise<void> => {
  res.json(ok(await getTicketsSummary(toFilter(req))));
};

export const getCustomerSatisfactionHandler = async (req: Request, res: Response): Promise<void> => {
  res.json(ok(await getCustomerSatisfaction(toFilter(req))));
};

export const getTicketTrendsHandler = async (req: Request, res: Response): Promise<void> => {
  const { weeks } = req.query as unknown as DashboardQuery;
  res.json(ok(await getTicketTrends(weeks ?? 8, toFilter(req))));
};

export const getAgentWorkloadHandler = async (req: Request, res: Response): Promise<void> => {
  res.json(ok(await getAgentWorkload(toFilter(req))));
};

export const getTopKbArticlesHandler = async (req: Request, res: Response): Promise<void> => {
  const { limit } = req.query as unknown as DashboardQuery;
  res.json(ok(await listTopArticles(limit ?? 5)));
};
