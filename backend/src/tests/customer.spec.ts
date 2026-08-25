jest.mock('../db/prisma', () => ({
  prisma: {
    customer: { findMany: jest.fn(), findUnique: jest.fn() },
    interaction: { findMany: jest.fn() }
  }
}));

import request from 'supertest';
import { prisma } from '../db/prisma';
import app from '../app';

const mockedFindMany = prisma.customer.findMany as jest.Mock;
const mockedFindUnique = prisma.customer.findUnique as jest.Mock;
const mockedInteractionFindMany = prisma.interaction.findMany as jest.Mock;

describe('GET /api/customers', () => {
  it('returns 200 with list of customers', async () => {
    const mockData = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() }];
    mockedFindMany.mockResolvedValue(mockData);

    const res = await request(app).get('/api/customers');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, name: 'John', email: 'john@example.com' });
    expect(mockedFindMany).toHaveBeenCalledWith({ orderBy: { name: 'asc' } });
  });
});

describe('GET /api/customers/:id/timeline', () => {
  it('returns 200 with interactions when customer exists', async () => {
    const customer = { id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() };
    const mockInteractions = [
      { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: new Date(), createdAt: new Date() }
    ];
    mockedFindUnique.mockResolvedValue(customer);
    mockedInteractionFindMany.mockResolvedValue(mockInteractions);

    const res = await request(app).get('/api/customers/1/timeline');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: 1, channel: 'EMAIL', direction: 'INBOUND', body: 'hi', customerId: 1 });
    expect(mockedFindUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockedInteractionFindMany).toHaveBeenCalledWith({ where: { customerId: 1 }, orderBy: { occurredAt: 'asc' } });
  });

  it('returns 404 when customer does not exist', async () => {
    mockedFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/customers/999/timeline');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
