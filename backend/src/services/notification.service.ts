import { prisma } from '../db/prisma';
import { NOTIFICATION_PAGE_SIZE } from '../notifications/types';
import type { NotificationType } from '../notifications/types';
import { SLA_SELECT, isTicketOverdue } from '../tickets/sla';
import { CLOSED_TICKET_STATUSES } from '../tickets/types';
import { AppError } from '../utils/AppError';

export interface CreateNotificationInput {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedTicketId?: number | null;
  relatedCustomerId?: number | null;
  relatedFeedbackId?: number | null;
}

export const createNotification = (input: CreateNotificationInput) =>
  prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      relatedTicketId: input.relatedTicketId ?? null,
      relatedCustomerId: input.relatedCustomerId ?? null,
      relatedFeedbackId: input.relatedFeedbackId ?? null
    }
  });

/**
 * Emitting a notification must never fail the action that triggered it — an agent's status
 * change succeeds whether or not the recipient's notification row was written. Every emission
 * site in `ticket.service.ts` and `feedback.service.ts` goes through this wrapper.
 *
 * `userId: null` (an unassigned ticket, so nobody to tell) is a no-op rather than an error.
 */
export const notifySafely = async (
  userId: number | null | undefined,
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<void> => {
  if (userId === null || userId === undefined) return;
  try {
    await createNotification({ ...input, userId });
  } catch {
    // Intentionally swallowed: see the doc comment above.
  }
};

/** Never tell a user about something they did to their own ticket. */
export const notifyOtherThan = async (
  userId: number | null | undefined,
  actorId: number,
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<void> => {
  if (userId === actorId) return;
  await notifySafely(userId, input);
};

/**
 * The SLA/overdue notification from work item 6, materialised lazily on read rather than by a
 * background job — this mini-module has no scheduler (see `src/services/ticketSla` equivalent
 * on the frontend, and Story 13's note that nothing server-side marks a ticket overdue).
 *
 * For every still-open ticket assigned to the caller that has blown its response or resolution
 * target, one `ticket_overdue` row is written — guarded by a lookup for an existing unread
 * notification of the same type on the same ticket, so polling every few seconds cannot
 * produce duplicates. Once the agent reads or dismisses it, a ticket that is still overdue can
 * raise it again on a later read, which is the desired nag.
 */
export const materialiseOverdueNotifications = async (userId: number, now: Date): Promise<void> => {
  const assigned = await prisma.ticket.findMany({
    where: { assignedToUserId: userId, status: { notIn: [...CLOSED_TICKET_STATUSES] } },
    select: { id: true, subject: true, customerId: true, ...SLA_SELECT }
  });

  const overdue = assigned.filter((ticket) => isTicketOverdue(ticket, now));

  for (const ticket of overdue) {
    const existing = await prisma.notification.findFirst({
      where: { userId, type: 'ticket_overdue', relatedTicketId: ticket.id, isRead: false }
    });
    if (existing) continue;

    await notifySafely(userId, {
      type: 'ticket_overdue',
      title: `Ticket #${ticket.id} is past its SLA`,
      message: `"${ticket.subject}" has missed its target and is still ${ticket.status}.`,
      relatedTicketId: ticket.id,
      relatedCustomerId: ticket.customerId
    });
  }
};

export const listNotifications = async (
  userId: number,
  options: { unreadOnly?: boolean } = {}
) => {
  // Reading the list is also what raises overdue notifications — see the note above.
  await materialiseOverdueNotifications(userId, new Date());

  return prisma.notification.findMany({
    where: { userId, ...(options.unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: NOTIFICATION_PAGE_SIZE
  });
};

export const countUnread = (userId: number) =>
  prisma.notification.count({ where: { userId, isRead: false } });

/** Scoped by `userId` so one user can never mark or delete another user's notification. */
const getOwnNotificationOrThrow = async (id: number, userId: number) => {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification || notification.userId !== userId) {
    throw new AppError(404, `Notification ${id} not found`);
  }
  return notification;
};

export const markNotificationRead = async (id: number, userId: number) => {
  await getOwnNotificationOrThrow(id, userId);
  return prisma.notification.update({ where: { id }, data: { isRead: true } });
};

export const markAllNotificationsRead = async (userId: number): Promise<number> => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true }
  });
  return result.count;
};

export const deleteNotification = async (id: number, userId: number): Promise<void> => {
  await getOwnNotificationOrThrow(id, userId);
  await prisma.notification.delete({ where: { id } });
};
