jest.mock('../db/prisma', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn()
    },
    ticket: { findMany: jest.fn() }
  }
}));

import { prisma } from '../db/prisma';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  materialiseOverdueNotifications,
  notifyOtherThan,
  notifySafely
} from '../services/notification.service';

const mockedFindMany = prisma.notification.findMany as jest.Mock;
const mockedFindFirst = prisma.notification.findFirst as jest.Mock;
const mockedFindUnique = prisma.notification.findUnique as jest.Mock;
const mockedCreate = prisma.notification.create as jest.Mock;
const mockedUpdate = prisma.notification.update as jest.Mock;
const mockedUpdateMany = prisma.notification.updateMany as jest.Mock;
const mockedDelete = prisma.notification.delete as jest.Mock;
const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;

const NOW = new Date('2026-08-26T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

const openTicket = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  subject: 'Cannot log in',
  status: 'Open',
  customerId: 10,
  createdAt: new Date(NOW.getTime() - 4 * HOUR_MS),
  respondedAt: null,
  resolvedAt: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedTicketFindMany.mockResolvedValue([]);
  mockedFindMany.mockResolvedValue([]);
});

describe('notifySafely', () => {
  it('writes the notification with null defaults for the unset relations', async () => {
    mockedCreate.mockResolvedValue({ id: 1 });

    await notifySafely(7, { type: 'ticket_assigned', title: 'T', message: 'M', relatedTicketId: 3 });

    expect(mockedCreate.mock.calls[0][0].data).toEqual({
      userId: 7,
      type: 'ticket_assigned',
      title: 'T',
      message: 'M',
      relatedTicketId: 3,
      relatedCustomerId: null,
      relatedFeedbackId: null
    });
  });

  it('is a no-op when there is nobody to notify', async () => {
    await notifySafely(null, { type: 'ticket_assigned', title: 'T', message: 'M' });

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('never lets a write failure escape to the caller', async () => {
    mockedCreate.mockRejectedValue(new Error('db down'));

    await expect(
      notifySafely(7, { type: 'ticket_assigned', title: 'T', message: 'M' })
    ).resolves.toBeUndefined();
  });
});

describe('notifyOtherThan', () => {
  it('does not notify the actor about their own action', async () => {
    await notifyOtherThan(7, 7, { type: 'ticket_comment', title: 'T', message: 'M' });

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('notifies a different recipient', async () => {
    mockedCreate.mockResolvedValue({ id: 1 });

    await notifyOtherThan(7, 9, { type: 'ticket_comment', title: 'T', message: 'M' });

    expect(mockedCreate).toHaveBeenCalled();
  });
});

describe('materialiseOverdueNotifications', () => {
  it('raises one notification for a ticket past its response target', async () => {
    mockedTicketFindMany.mockResolvedValue([openTicket()]);
    mockedFindFirst.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: 1 });

    await materialiseOverdueNotifications(7, NOW);

    expect(mockedCreate.mock.calls[0][0].data).toMatchObject({
      userId: 7,
      type: 'ticket_overdue',
      relatedTicketId: 1
    });
  });

  it('raises nothing for a ticket still inside its targets', async () => {
    mockedTicketFindMany.mockResolvedValue([
      openTicket({ createdAt: new Date(NOW.getTime() - 5 * 60 * 1000) })
    ]);

    await materialiseOverdueNotifications(7, NOW);

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('does not duplicate an unread overdue notification on the next poll', async () => {
    mockedTicketFindMany.mockResolvedValue([openTicket()]);
    mockedFindFirst.mockResolvedValue({ id: 99 });

    await materialiseOverdueNotifications(7, NOW);

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('ignores a ticket whose response landed inside the target', async () => {
    mockedTicketFindMany.mockResolvedValue([
      openTicket({ respondedAt: new Date(NOW.getTime() - 3 * HOUR_MS) })
    ]);

    await materialiseOverdueNotifications(7, NOW);

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('flags a ticket that blew only its resolution target', async () => {
    mockedTicketFindMany.mockResolvedValue([
      openTicket({
        respondedAt: new Date(NOW.getTime() - 20 * HOUR_MS),
        createdAt: new Date(NOW.getTime() - 21 * HOUR_MS)
      })
    ]);
    mockedFindFirst.mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: 1 });

    await materialiseOverdueNotifications(7, NOW);

    expect(mockedCreate).toHaveBeenCalled();
  });

  it('only ever looks at the caller own open, assigned tickets', async () => {
    await materialiseOverdueNotifications(7, NOW);

    expect(mockedTicketFindMany.mock.calls[0][0].where).toEqual({
      assignedToUserId: 7,
      status: { notIn: ['Resolved', 'Closed'] }
    });
  });
});

describe('listNotifications', () => {
  it('returns the caller own notifications, newest first', async () => {
    await listNotifications(7);

    expect(mockedFindMany.mock.calls[0][0].where).toEqual({ userId: 7 });
    expect(mockedFindMany.mock.calls[0][0].orderBy).toEqual({ createdAt: 'desc' });
  });

  it('narrows to unread when asked', async () => {
    await listNotifications(7, { unreadOnly: true });

    expect(mockedFindMany.mock.calls[0][0].where).toEqual({ userId: 7, isRead: false });
  });
});

describe('markNotificationRead', () => {
  it('marks the caller own notification as read', async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 7 });
    mockedUpdate.mockResolvedValue({ id: 5, isRead: true });

    await markNotificationRead(5, 7);

    expect(mockedUpdate.mock.calls[0][0]).toEqual({ where: { id: 5 }, data: { isRead: true } });
  });

  it("404s another user's notification rather than revealing it exists", async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 9 });

    await expect(markNotificationRead(5, 7)).rejects.toMatchObject({ status: 404 });
    expect(mockedUpdate).not.toHaveBeenCalled();
  });
});

describe('markAllNotificationsRead', () => {
  it('updates only the caller unread rows and returns the count', async () => {
    mockedUpdateMany.mockResolvedValue({ count: 3 });

    await expect(markAllNotificationsRead(7)).resolves.toBe(3);
    expect(mockedUpdateMany.mock.calls[0][0].where).toEqual({ userId: 7, isRead: false });
  });
});

describe('deleteNotification', () => {
  it('deletes the caller own notification', async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 7 });

    await deleteNotification(5, 7);

    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("refuses to delete another user's notification", async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 9 });

    await expect(deleteNotification(5, 7)).rejects.toMatchObject({ status: 404 });
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});
