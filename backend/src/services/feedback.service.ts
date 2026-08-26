import { prisma } from '../db/prisma';
import { CLOSED_TICKET_STATUSES } from '../tickets/types';
import type { TicketStatus } from '../tickets/types';
import { notifySafely } from './notification.service';
import { AppError } from '../utils/AppError';

export interface SubmitFeedbackInput {
  rating: number;
  comment?: string;
}

export interface CustomerPortalSummary {
  totalTickets: number;
  openTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  awaitingFeedback: number;
}

/** Everything the portal ticket list needs, plus the flag that drives the "leave feedback" CTA. */
const portalTicketInclude = {
  category: true,
  feedback: { select: { id: true, rating: true, createdAt: true } }
} as const;

const getTicketRowOrThrow = async (ticketId: number) => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, `Ticket ${ticketId} not found`);
  return ticket;
};

const isClosed = (status: string): boolean => CLOSED_TICKET_STATUSES.includes(status as TicketStatus);

/**
 * A customer rates its own ticket once, and only after the ticket is finished. Both rules are
 * enforced here rather than at the route layer so the service is safe to call from anywhere:
 * the caller has already been scope-checked, but the ticket state has not.
 */
export const submitTicketFeedback = async (
  ticketId: number,
  customerId: number,
  input: SubmitFeedbackInput
) => {
  const ticket = await getTicketRowOrThrow(ticketId);

  if (ticket.customerId !== customerId) {
    throw new AppError(403, 'You can only leave feedback on your own tickets');
  }
  if (!isClosed(ticket.status)) {
    throw new AppError(400, 'Feedback can only be submitted once the ticket is Resolved or Closed');
  }

  const existing = await prisma.ticketFeedback.findUnique({ where: { ticketId } });
  if (existing) throw new AppError(409, 'Feedback has already been submitted for this ticket');

  const feedback = await prisma.ticketFeedback.create({
    data: {
      ticketId,
      customerId,
      rating: input.rating,
      comment: input.comment?.trim() ? input.comment.trim() : null
    }
  });

  // The agent who handled the ticket is the one who wants to know how it landed.
  await notifySafely(ticket.assignedToUserId, {
    type: 'feedback_received',
    title: `${feedback.rating}-star feedback on ticket #${ticket.id}`,
    message: feedback.comment
      ? `"${ticket.subject}" — ${feedback.comment}`
      : `"${ticket.subject}" was rated ${feedback.rating} out of 5.`,
    relatedTicketId: ticket.id,
    relatedCustomerId: customerId,
    relatedFeedbackId: feedback.id
  });

  return feedback;
};

/** `null` — not an error — when the ticket exists but has not been rated yet. */
export const getTicketFeedback = async (ticketId: number) => {
  await getTicketRowOrThrow(ticketId);
  return prisma.ticketFeedback.findUnique({ where: { ticketId } });
};

export const listPortalTickets = (customerId: number) =>
  prisma.ticket.findMany({
    where: { customerId },
    include: portalTicketInclude,
    orderBy: { createdAt: 'desc' }
  });

/**
 * The five counters the portal dashboard shows. Derived from the same TICKET_STATUSES
 * vocabulary the agent dashboard uses, so "open" here means the same thing there:
 * anything that is not yet Resolved or Closed, minus the Pending sub-state.
 */
export const getPortalSummary = async (customerId: number): Promise<CustomerPortalSummary> => {
  const [totalTickets, openTickets, pendingTickets, resolvedTickets, awaitingFeedback] =
    await Promise.all([
      prisma.ticket.count({ where: { customerId } }),
      prisma.ticket.count({ where: { customerId, status: { in: ['New', 'Open', 'In Progress'] } } }),
      prisma.ticket.count({ where: { customerId, status: 'Pending' } }),
      prisma.ticket.count({ where: { customerId, status: { in: [...CLOSED_TICKET_STATUSES] } } }),
      prisma.ticket.count({
        where: { customerId, status: { in: [...CLOSED_TICKET_STATUSES] }, feedback: { is: null } }
      })
    ]);

  return { totalTickets, openTickets, pendingTickets, resolvedTickets, awaitingFeedback };
};
