import { CLOSED_TICKET_STATUSES } from './types';
import type { TicketStatus } from './types';

/**
 * Server-side SLA evaluation. Nothing in this module marks a ticket overdue on a schedule —
 * there is no background job (Story 13) — so "overdue" is always derived on read, from the
 * targets stored on the ticket. Both callers that need it go through here rather than
 * re-deriving the rule: the notification service (which raises the SLA alert) and the
 * management dashboard (which counts overdue tickets).
 *
 * This mirrors `frontend/src/services/ticketSla.ts`, which computes the same thing for the
 * badges in the agent queue.
 */

const MINUTE_MS = 60 * 1000;

/** The subset of a ticket the SLA rule actually reads. */
export interface SlaTicketFields {
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
  resolvedAt: Date | null;
  responseTimeMinutes: number | null;
  resolutionTimeMinutes: number | null;
}

const isClosed = (status: string): boolean => CLOSED_TICKET_STATUSES.includes(status as TicketStatus);

/**
 * A ticket is overdue when it is still open and has blown either target: no first response
 * inside `responseTimeMinutes`, or no resolution inside `resolutionTimeMinutes`.
 *
 * A Resolved/Closed ticket is never counted as overdue even if it was answered late — its
 * history stays on the ticket itself. A null target means "no SLA on this leg", not "instantly
 * overdue".
 */
export const isTicketOverdue = (ticket: SlaTicketFields, now: Date): boolean => {
  if (isClosed(ticket.status)) return false;

  const created = ticket.createdAt.getTime();
  const responseLate =
    ticket.respondedAt === null &&
    ticket.responseTimeMinutes !== null &&
    now.getTime() > created + ticket.responseTimeMinutes * MINUTE_MS;
  const resolutionLate =
    ticket.resolvedAt === null &&
    ticket.resolutionTimeMinutes !== null &&
    now.getTime() > created + ticket.resolutionTimeMinutes * MINUTE_MS;

  return responseLate || resolutionLate;
};

/** The columns `isTicketOverdue` needs, as a Prisma `select`. */
export const SLA_SELECT = {
  status: true,
  createdAt: true,
  respondedAt: true,
  resolvedAt: true,
  responseTimeMinutes: true,
  resolutionTimeMinutes: true
} as const;
