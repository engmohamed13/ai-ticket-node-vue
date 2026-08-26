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
    ticket: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    ticketComment: { create: jest.fn() },
    ticketFeedback: { findUnique: jest.fn(), create: jest.fn() },
    user: { findUnique: jest.fn() }
  }
}));

import request from 'supertest';
import app from '../app';
import { prisma } from '../db/prisma';
import { bearer } from './authTestHelper';

const mockedFindMany = prisma.notification.findMany as jest.Mock;
const mockedFindUnique = prisma.notification.findUnique as jest.Mock;
const mockedCreate = prisma.notification.create as jest.Mock;
const mockedUpdate = prisma.notification.update as jest.Mock;
const mockedUpdateMany = prisma.notification.updateMany as jest.Mock;
const mockedDelete = prisma.notification.delete as jest.Mock;
const mockedCount = prisma.notification.count as jest.Mock;
const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;
const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedTicketUpdate = prisma.ticket.update as jest.Mock;
const mockedCommentCreate = prisma.ticketComment.create as jest.Mock;
const mockedFeedbackFindUnique = prisma.ticketFeedback.findUnique as jest.Mock;
const mockedFeedbackCreate = prisma.ticketFeedback.create as jest.Mock;
const mockedUserFindUnique = prisma.user.findUnique as jest.Mock;

const agentBearer = (userId = 7) =>
  bearer({
    userId,
    roleKey: 'SUPPORT_AGENT',
    customerId: null,
    permissions: ['tickets:read', 'tickets:manage']
  });

const customerBearer = () =>
  bearer({
    userId: 50,
    roleKey: 'CUSTOMER',
    customerId: 10,
    permissions: ['tickets:read', 'feedback:read', 'feedback:write']
  });

const baseTicket = {
  id: 1,
  subject: 'Cannot log in',
  status: 'Open',
  priority: 'High',
  customerId: 10,
  categoryId: null,
  assignedToUserId: 9,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

beforeEach(() => {
  jest.clearAllMocks();
  mockedTicketFindMany.mockResolvedValue([]);
  mockedFindMany.mockResolvedValue([]);
  mockedCount.mockResolvedValue(0);
});

describe('GET /api/notifications', () => {
  it('returns the caller inbox and its unread count', async () => {
    mockedFindMany.mockResolvedValue([{ id: 1, type: 'ticket_assigned', isRead: false }]);
    mockedCount.mockResolvedValue(1);

    const response = await request(app).get('/api/notifications').set('Authorization', agentBearer());

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.unreadCount).toBe(1);
  });

  it('scopes the query to the token user', async () => {
    await request(app).get('/api/notifications').set('Authorization', agentBearer(42));

    expect(mockedFindMany.mock.calls[0][0].where.userId).toBe(42);
  });

  it('counts an overdue notification the same request just materialised', async () => {
    const created = new Date(Date.now() - 4 * 60 * 60 * 1000);
    mockedTicketFindMany.mockResolvedValue([
      {
        id: 1,
        subject: 'Cannot log in',
        customerId: 10,
        status: 'Open',
        createdAt: created,
        respondedAt: null,
        resolvedAt: null,
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 480
      }
    ]);
    // No existing overdue row, so listing raises one...
    (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
    mockedCreate.mockResolvedValue({ id: 9 });
    // ...and the count must run after that write, not alongside it.
    mockedCount.mockImplementation(async () => (mockedCreate.mock.calls.length > 0 ? 1 : 0));

    const response = await request(app).get('/api/notifications').set('Authorization', agentBearer());

    expect(mockedCreate).toHaveBeenCalled();
    expect(response.body.data.unreadCount).toBe(1);
  });

  it('narrows to unread when asked', async () => {
    await request(app)
      .get('/api/notifications?unreadOnly=true')
      .set('Authorization', agentBearer());

    expect(mockedFindMany.mock.calls[0][0].where).toEqual({ userId: 7, isRead: false });
  });

  it('needs no permission beyond being signed in', async () => {
    const response = await request(app)
      .get('/api/notifications')
      .set('Authorization', bearer({ userId: 3, permissions: [] }));

    expect(response.status).toBe(200);
  });

  it('401s without a token', async () => {
    const response = await request(app).get('/api/notifications');

    expect(response.status).toBe(401);
  });

  it('400s an unknown query parameter', async () => {
    const response = await request(app)
      .get('/api/notifications?nope=1')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(400);
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('marks the caller own notification as read', async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 7 });
    mockedUpdate.mockResolvedValue({ id: 5, isRead: true });

    const response = await request(app)
      .patch('/api/notifications/5/read')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(200);
    expect(response.body.data.isRead).toBe(true);
  });

  it("404s another user's notification", async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 9 });

    const response = await request(app)
      .patch('/api/notifications/5/read')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(404);
  });
});

describe('PATCH /api/notifications/read-all', () => {
  it('marks every unread notification read and reports the count', async () => {
    mockedUpdateMany.mockResolvedValue({ count: 4 });

    const response = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(200);
    expect(response.body.data.updated).toBe(4);
  });

  it('is matched before the numeric-id route', async () => {
    mockedUpdateMany.mockResolvedValue({ count: 0 });

    const response = await request(app)
      .patch('/api/notifications/read-all')
      .set('Authorization', agentBearer());

    // Falling through to `/:id/read` would have failed id validation with a 400.
    expect(response.status).toBe(200);
  });
});

describe('DELETE /api/notifications/:id', () => {
  it('dismisses the caller own notification', async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 7 });

    const response = await request(app)
      .delete('/api/notifications/5')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("404s another user's notification", async () => {
    mockedFindUnique.mockResolvedValue({ id: 5, userId: 9 });

    const response = await request(app)
      .delete('/api/notifications/5')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(404);
    expect(mockedDelete).not.toHaveBeenCalled();
  });
});

describe('notifications raised by ticket activity', () => {
  it('tells the new assignee when a ticket is handed to them', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket, assignedToUserId: null });
    mockedUserFindUnique.mockResolvedValue({ id: 9, isActive: true, role: { key: 'SUPPORT_AGENT' } });
    mockedTicketUpdate.mockResolvedValue({ ...baseTicket, assignedToUserId: 9 });
    mockedCreate.mockResolvedValue({ id: 1 });

    await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', agentBearer(7))
      .send({ assignedToUserId: 9 });

    expect(mockedCreate.mock.calls[0][0].data).toMatchObject({
      userId: 9,
      type: 'ticket_assigned',
      relatedTicketId: 1
    });
  });

  it('stays quiet when an agent claims a ticket for themselves', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket, assignedToUserId: null });
    mockedUserFindUnique.mockResolvedValue({ id: 7, isActive: true, role: { key: 'SUPPORT_AGENT' } });
    mockedTicketUpdate.mockResolvedValue({ ...baseTicket, assignedToUserId: 7 });

    await request(app)
      .patch('/api/tickets/1/assign')
      .set('Authorization', agentBearer(7))
      .send({ assignedToUserId: 7 });

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('tells the assignee when someone else changes the status', async () => {
    mockedTicketFindUnique.mockResolvedValue(baseTicket);
    mockedTicketUpdate.mockResolvedValue({ ...baseTicket, status: 'Pending' });
    mockedCreate.mockResolvedValue({ id: 1 });

    await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', agentBearer(7))
      .send({ status: 'Pending' });

    expect(mockedCreate.mock.calls[0][0].data).toMatchObject({
      userId: 9,
      type: 'ticket_status_changed'
    });
  });

  it('raises nothing when the update does not touch the status', async () => {
    mockedTicketFindUnique.mockResolvedValue(baseTicket);
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await request(app)
      .patch('/api/tickets/1')
      .set('Authorization', agentBearer(7))
      .send({ priority: 'Urgent' });

    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it('tells the assignee about a comment left by somebody else', async () => {
    mockedTicketFindUnique.mockResolvedValue(baseTicket);
    mockedCommentCreate.mockResolvedValue({
      id: 3,
      body: 'Escalating this',
      createdAt: new Date(),
      author: { id: 7, name: 'Agent' }
    });
    mockedTicketUpdate.mockResolvedValue(baseTicket);
    mockedCreate.mockResolvedValue({ id: 1 });

    await request(app)
      .post('/api/tickets/1/comments')
      .set('Authorization', agentBearer(7))
      .send({ body: 'Escalating this' });

    expect(mockedCreate.mock.calls[0][0].data).toMatchObject({
      userId: 9,
      type: 'ticket_comment'
    });
  });

  it('tells the assigned agent when the customer leaves feedback', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket, status: 'Resolved' });
    mockedFeedbackFindUnique.mockResolvedValue(null);
    mockedFeedbackCreate.mockResolvedValue({ id: 4, rating: 5, comment: 'Great', ticketId: 1 });
    mockedCreate.mockResolvedValue({ id: 1 });

    await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 5, comment: 'Great' });

    expect(mockedCreate.mock.calls[0][0].data).toMatchObject({
      userId: 9,
      type: 'feedback_received',
      relatedFeedbackId: 4
    });
  });

  it('still succeeds when writing the notification fails', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket, status: 'Resolved' });
    mockedFeedbackFindUnique.mockResolvedValue(null);
    mockedFeedbackCreate.mockResolvedValue({ id: 4, rating: 5, comment: null, ticketId: 1 });
    mockedCreate.mockRejectedValue(new Error('db down'));

    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 5 });

    expect(response.status).toBe(201);
  });
});
