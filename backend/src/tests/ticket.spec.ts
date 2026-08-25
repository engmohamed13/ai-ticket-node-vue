jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { findMany: jest.fn(), findUnique: jest.fn() },
    interaction: { findMany: jest.fn() }
  }
}));

import request from 'supertest';
import { prisma } from '../db/prisma';
import app from '../app';
import { bearer } from './authTestHelper';

const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;
const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedInteractionFindMany = prisma.interaction.findMany as jest.Mock;

describe('GET /api/tickets', () => {
  it('returns 200 with all tickets', async () => {
    const mockTickets = [{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: new Date(), updatedAt: new Date() }];
    mockedTicketFindMany.mockResolvedValue(mockTickets);

    const res = await request(app).get('/api/tickets').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, subject: 'Test', status: 'Open', customerId: 1 });
    expect(mockedTicketFindMany).toHaveBeenCalledWith({ where: undefined, orderBy: { createdAt: 'desc' } });
  });

  it('filters by customerId when provided', async () => {
    const tickets = [{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: new Date(), updatedAt: new Date() }];
    mockedTicketFindMany.mockResolvedValue(tickets);

    const res = await request(app).get('/api/tickets?customerId=1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(mockedTicketFindMany).toHaveBeenCalledWith({ where: { customerId: 1 }, orderBy: { createdAt: 'desc' } });
  });
});

describe('GET /api/tickets/:id', () => {
  it('returns 200 with ticket when found', async () => {
    const mockTicket = { id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: new Date(), updatedAt: new Date() };
    mockedTicketFindUnique.mockResolvedValue(mockTicket);

    const res = await request(app).get('/api/tickets/1').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, subject: 'Test', status: 'Open', customerId: 1 });
  });

  it('returns 404 when ticket not found', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/tickets/999').set('Authorization', bearer());

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/tickets/:id/timeline', () => {
  it('returns 200 with interactions when ticket exists', async () => {
    const mockTicket = { id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: new Date(), updatedAt: new Date() };
    const mockInteractions = [
      { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: 1, occurredAt: new Date(), createdAt: new Date() }
    ];
    mockedTicketFindUnique.mockResolvedValue(mockTicket);
    mockedInteractionFindMany.mockResolvedValue(mockInteractions);

    const res = await request(app).get('/api/tickets/1/timeline').set('Authorization', bearer());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, channel: 'EMAIL', direction: 'INBOUND', ticketId: 1 });
    expect(mockedInteractionFindMany).toHaveBeenCalledWith({ where: { ticketId: 1 }, orderBy: { occurredAt: 'asc' } });
  });

  it('returns 404 when ticket not found', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/tickets/999/timeline').set('Authorization', bearer());

    expect(res.status).toBe(404);
  });
});
