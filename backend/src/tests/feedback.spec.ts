jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    ticketFeedback: { findUnique: jest.fn(), create: jest.fn() }
  }
}));

import request from 'supertest';
import app from '../app';
import { prisma } from '../db/prisma';
import { bearer } from './authTestHelper';

const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;
const mockedTicketCount = prisma.ticket.count as jest.Mock;
const mockedFeedbackFindUnique = prisma.ticketFeedback.findUnique as jest.Mock;
const mockedFeedbackCreate = prisma.ticketFeedback.create as jest.Mock;

/** A CUSTOMER-role token linked to customer 10 — the shape the portal is built for. */
const customerBearer = (customerId: number | null = 10) =>
  bearer({
    userId: 50,
    email: 'demo.customer@example.com',
    roleKey: 'CUSTOMER',
    customerId,
    permissions: ['tickets:read', 'interactions:read', 'feedback:read', 'feedback:write']
  });

const agentBearer = () =>
  bearer({
    userId: 7,
    email: 'agent@crm.local',
    roleKey: 'SUPPORT_AGENT',
    customerId: null,
    permissions: ['tickets:read', 'tickets:manage', 'feedback:read']
  });

const resolvedTicket = { id: 1, customerId: 10, status: 'Resolved' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('POST /api/tickets/:id/feedback', () => {
  it('creates feedback for the owning customer', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue(null);
    mockedFeedbackCreate.mockResolvedValue({ id: 3, rating: 5, comment: null, ticketId: 1 });

    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 5 });

    expect(response.status).toBe(201);
    expect(response.body.data.rating).toBe(5);
  });

  it('rejects a rating outside 1-5 with a 400', async () => {
    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 6 });

    expect(response.status).toBe(400);
    expect(mockedFeedbackCreate).not.toHaveBeenCalled();
  });

  it('rejects a non-integer rating with a 400', async () => {
    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 2.5 });

    expect(response.status).toBe(400);
  });

  it('rejects an unknown body key with a 400', async () => {
    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 5, sneaky: true });

    expect(response.status).toBe(400);
  });

  it('403s a staff token, which has no customer record to rate from', async () => {
    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', bearer())
      .send({ rating: 5 });

    expect(response.status).toBe(403);
    expect(mockedFeedbackCreate).not.toHaveBeenCalled();
  });

  it('403s a customer account with no linked customer record', async () => {
    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer(null))
      .send({ rating: 5 });

    expect(response.status).toBe(403);
  });

  it('403s a token without feedback:write', async () => {
    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', agentBearer())
      .send({ rating: 5 });

    expect(response.status).toBe(403);
  });

  it('409s a second submission on the same ticket', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue({ id: 3 });

    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 5 });

    expect(response.status).toBe(409);
  });

  it('400s while the ticket is still open', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...resolvedTicket, status: 'Open' });

    const response = await request(app)
      .post('/api/tickets/1/feedback')
      .set('Authorization', customerBearer())
      .send({ rating: 5 });

    expect(response.status).toBe(400);
  });
});

describe('GET /api/tickets/:id/feedback', () => {
  it('returns the feedback to a staff token holding feedback:read', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue({ id: 3, rating: 4 });

    const response = await request(app)
      .get('/api/tickets/1/feedback')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(200);
    expect(response.body.data.rating).toBe(4);
  });

  it('returns null data when the ticket has not been rated', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue(null);

    const response = await request(app)
      .get('/api/tickets/1/feedback')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(200);
    expect(response.body.data).toBeNull();
  });

  it('lets the owning customer read its own feedback', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue({ id: 3, rating: 4 });

    const response = await request(app)
      .get('/api/tickets/1/feedback')
      .set('Authorization', customerBearer());

    expect(response.status).toBe(200);
  });

  it('403s a customer reading feedback on a ticket it does not own', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...resolvedTicket, customerId: 99 });

    const response = await request(app)
      .get('/api/tickets/1/feedback')
      .set('Authorization', customerBearer());

    expect(response.status).toBe(403);
  });

  it('403s a token without feedback:read', async () => {
    const response = await request(app)
      .get('/api/tickets/1/feedback')
      .set('Authorization', bearer({ permissions: ['tickets:read'] }));

    expect(response.status).toBe(403);
  });
});

describe('GET /api/customers/portal/tickets', () => {
  it('returns only the tickets belonging to the caller', async () => {
    mockedTicketFindMany.mockResolvedValue([{ id: 1, subject: 'Test' }]);

    const response = await request(app)
      .get('/api/customers/portal/tickets')
      .set('Authorization', customerBearer());

    expect(response.status).toBe(200);
    expect(mockedTicketFindMany.mock.calls[0][0].where).toEqual({ customerId: 10 });
  });

  it('403s a staff token', async () => {
    const response = await request(app)
      .get('/api/customers/portal/tickets')
      .set('Authorization', bearer());

    expect(response.status).toBe(403);
    expect(mockedTicketFindMany).not.toHaveBeenCalled();
  });

  it('is matched by the portal router rather than the staff customers/:id route', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    const response = await request(app)
      .get('/api/customers/portal/tickets')
      .set('Authorization', customerBearer());

    // A fall-through to `/customers/:id` would have failed id validation with a 400.
    expect(response.status).toBe(200);
  });
});

describe('GET /api/customers/portal/summary', () => {
  it('returns the counters for the caller', async () => {
    mockedTicketCount.mockResolvedValue(2);

    const response = await request(app)
      .get('/api/customers/portal/summary')
      .set('Authorization', customerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      totalTickets: 2,
      openTickets: 2,
      pendingTickets: 2,
      resolvedTickets: 2,
      awaitingFeedback: 2
    });
  });

  it('403s a staff token', async () => {
    const response = await request(app)
      .get('/api/customers/portal/summary')
      .set('Authorization', bearer());

    expect(response.status).toBe(403);
  });
});
