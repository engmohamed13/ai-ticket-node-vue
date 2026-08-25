import { Request, Response } from 'express';
import { assertCustomerScope } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import { getCustomerTimeline, listCustomers } from '../services/customer.service';
import { ok } from '../utils/apiResponse';

export const listCustomersHandler = async (_req: Request, res: Response): Promise<void> => {
  const customers = await listCustomers();
  res.json(ok(customers));
};

export const getCustomerTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  assertCustomerScope(getAuth(req), id);
  const timeline = await getCustomerTimeline(id);
  res.json(ok(timeline));
};
