import { Request, Response } from 'express';
import { getTicketById, getTicketTimeline, listTickets } from '../services/ticket.service';
import { ok } from '../utils/apiResponse';

export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.query as unknown as { customerId?: number };
  const tickets = await listTickets(customerId);
  res.json(ok(tickets));
};

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await getTicketById(id);
  res.json(ok(ticket));
};

export const getTicketTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const timeline = await getTicketTimeline(id);
  res.json(ok(timeline));
};
