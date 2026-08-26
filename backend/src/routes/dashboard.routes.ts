import { Router } from 'express';
import { z } from 'zod';
import {
  getAgentWorkloadHandler,
  getCustomerSatisfactionHandler,
  getTicketTrendsHandler,
  getTicketsSummaryHandler,
  getTopKbArticlesHandler
} from '../controllers/dashboard.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../tickets/types';

/** The filter set every panel shares. An open-ended range is allowed on either side. */
const filterShape = {
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  assignedToUserId: z.coerce.number().int().positive().optional()
};

const rangeIsOrdered = (query: { startDate?: Date; endDate?: Date }): boolean =>
  query.startDate === undefined || query.endDate === undefined || query.startDate <= query.endDate;

const RANGE_MESSAGE = { message: 'startDate must be on or before endDate' };

const filterQuerySchema = z.object(filterShape).strict().refine(rangeIsOrdered, RANGE_MESSAGE);

const trendsQuerySchema = z
  .object({ ...filterShape, weeks: z.coerce.number().int().min(1).max(52).optional() })
  .strict()
  .refine(rangeIsOrdered, RANGE_MESSAGE);

const topArticlesQuerySchema = z
  .object({ limit: z.coerce.number().int().min(1).max(25).optional() })
  .strict();

/**
 * Reporting for managers and supervisors. Gated on the `reports:read` permission that already
 * existed for exactly this purpose (Story 07) — no new permission is introduced.
 */
const router = Router();

router.get(
  '/tickets-summary',
  requirePermission('reports:read'),
  validate({ query: filterQuerySchema }),
  getTicketsSummaryHandler
);
router.get(
  '/customer-satisfaction',
  requirePermission('reports:read'),
  validate({ query: filterQuerySchema }),
  getCustomerSatisfactionHandler
);
router.get(
  '/ticket-trends',
  requirePermission('reports:read'),
  validate({ query: trendsQuerySchema }),
  getTicketTrendsHandler
);
router.get(
  '/agent-workload',
  requirePermission('reports:read'),
  validate({ query: filterQuerySchema }),
  getAgentWorkloadHandler
);
router.get(
  '/kb-top-articles',
  requirePermission('reports:read'),
  validate({ query: topArticlesQuerySchema }),
  getTopKbArticlesHandler
);

export default router;
