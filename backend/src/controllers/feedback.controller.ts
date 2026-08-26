import { Request, Response } from 'express';
import { assertCustomerScope, scopedCustomerId } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import {
  getPortalSummary,
  getTicketFeedback,
  listPortalTickets,
  submitTicketFeedback
} from '../services/feedback.service';
import { getTicketRowOrThrow } from '../services/ticket.service';
import { AppError } from '../utils/AppError';
import { ok } from '../utils/apiResponse';

/**
 * The portal is the customer's own view of its own records, so every handler below needs a
 * concrete customerId. A staff token has none — `scopedCustomerId` returns undefined for it —
 * and is turned away rather than silently shown an empty portal.
 */
const requireCustomerId = (req: Request): number => {
  const customerId = scopedCustomerId(getAuth(req));
  if (customerId === undefined) {
    throw new AppError(403, 'The customer portal is only available to customer accounts');
  }
  if (customerId < 0) {
    throw new AppError(403, 'This account is not linked to a customer record');
  }
  return customerId;
};

export const submitTicketFeedbackHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const customerId = requireCustomerId(req);
  const { rating, comment } = req.body as { rating: number; comment?: string };
  const feedback = await submitTicketFeedback(id, customerId, { rating, comment });
  res.status(201).json(ok(feedback, 'Feedback submitted'));
};

export const getTicketFeedbackHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  // A CUSTOMER-role token also holds `feedback:read`, so it reaches this handler for any
  // ticket id — the scope assertion is what keeps it to its own.
  const ticket = await getTicketRowOrThrow(id);
  assertCustomerScope(getAuth(req), ticket.customerId);
  res.json(ok(await getTicketFeedback(id)));
};

export const listPortalTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  res.json(ok(await listPortalTickets(requireCustomerId(req))));
};

export const getPortalSummaryHandler = async (req: Request, res: Response): Promise<void> => {
  res.json(ok(await getPortalSummary(requireCustomerId(req))));
};
