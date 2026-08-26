import { CLOSED_TICKET_STATUSES } from '../types';
import type { Ticket } from '../types';

/**
 * SLA is computed client-side, on purpose. The backend stores the targets
 * (`responseTimeMinutes`, `resolutionTimeMinutes`) and stamps `respondedAt` / `resolvedAt`,
 * but nothing server-side marks a ticket overdue — there is no background job in this
 * mini-module. Every "overdue" badge in the UI comes from the helpers below.
 */

const MINUTE_MS = 60 * 1000;

export type SlaState = 'met' | 'due' | 'overdue' | 'none';

const deadline = (createdAt: string, targetMinutes: number | null): number | null =>
  targetMinutes === null ? null : new Date(createdAt).getTime() + targetMinutes * MINUTE_MS;

/** Was the first response inside the target, and if it has not happened yet, is it late? */
export const responseSlaState = (ticket: Ticket, now: number = Date.now()): SlaState => {
  const due = deadline(ticket.createdAt, ticket.responseTimeMinutes);
  if (due === null) return 'none';
  if (ticket.respondedAt !== null) {
    return new Date(ticket.respondedAt).getTime() <= due ? 'met' : 'overdue';
  }
  return now > due ? 'overdue' : 'due';
};

export const resolutionSlaState = (ticket: Ticket, now: number = Date.now()): SlaState => {
  const due = deadline(ticket.createdAt, ticket.resolutionTimeMinutes);
  if (due === null) return 'none';
  if (ticket.resolvedAt !== null) {
    return new Date(ticket.resolvedAt).getTime() <= due ? 'met' : 'overdue';
  }
  return now > due ? 'overdue' : 'due';
};

/**
 * The dashboard's "Overdue" tab. A ticket counts as overdue when it is still open and has
 * blown either target. A Resolved/Closed ticket is never listed as overdue even if it was
 * answered late — its history is visible on the ticket itself instead.
 */
export const isTicketOverdue = (ticket: Ticket, now: number = Date.now()): boolean => {
  if (CLOSED_TICKET_STATUSES.includes(ticket.status)) return false;
  return (
    (ticket.respondedAt === null && responseSlaState(ticket, now) === 'overdue') ||
    resolutionSlaState(ticket, now) === 'overdue'
  );
};

/** "8h 30m" / "45m" — the same shape used for both targets and elapsed time. */
export const formatMinutes = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h ${rest}m`;
};

/** Minutes between ticket creation and `at`, for showing what the actual response time was. */
export const minutesSinceCreated = (ticket: Ticket, at: string): number =>
  Math.max(0, Math.round((new Date(at).getTime() - new Date(ticket.createdAt).getTime()) / MINUTE_MS));
