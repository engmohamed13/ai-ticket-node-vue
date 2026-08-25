import { Request, Response } from 'express';
import { assertCustomerScope, scopedCustomerId } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import { getTicketById, getTicketTimeline, listTickets } from '../services/ticket.service';
import { ok } from '../utils/apiResponse';

export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.query as unknown as { customerId?: number };
  const auth = getAuth(req);
  // A customer-scoped token ignores the query param entirely — it can only ever
  // see its own tickets, whatever it asks for.
  const scoped = scopedCustomerId(auth);
  const tickets = await listTickets(scoped ?? customerId);
  res.json(ok(tickets));
};

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await getTicketById(id);
  assertCustomerScope(getAuth(req), ticket.customerId);
  res.json(ok(ticket));
};

export const getTicketTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await getTicketById(id);
  assertCustomerScope(getAuth(req), ticket.customerId);
  const timeline = await getTicketTimeline(id);
  res.json(ok(timeline));
};
