jest.mock('../db/prisma', () => ({
  prisma: {
    customer: { findUnique: jest.fn() },
    ticket: { findUnique: jest.fn() },
    interaction: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() }
  }
}));

jest.mock('../channels/registry', () => ({
  getChannelAdapter: jest.fn()
}));

import request from 'supertest';
import { getChannelAdapter } from '../channels/registry';
import { prisma } from '../db/prisma';
import app from '../app';

const mockedGetChannelAdapter = getChannelAdapter as jest.Mock;
const mockedCustomerFindUnique = prisma.customer.findUnique as jest.Mock;
const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedInteractionFindUnique = prisma.interaction.findUnique as jest.Mock;
const mockedInteractionCreate = prisma.interaction.create as jest.Mock;
const mockedInteractionUpdate = prisma.interaction.update as jest.Mock;

describe('POST /api/interactions', () => {
  it('creates an INBOUND interaction via simulateInbound', async () => {
    const mockAdapter = {
      channel: 'EMAIL',
      simulateInbound: jest.fn().mockReturnValue({
        channel: 'EMAIL',
        direction: 'INBOUND',
        subject: 'test',
        body: 'hello',
        externalRef: 'email-uuid-123'
      }),
      deliver: jest.fn()
    };
    mockedGetChannelAdapter.mockReturnValue(mockAdapter);
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    const createdInteraction = {
      id: 1,
      channel: 'EMAIL',
      direction: 'INBOUND',
      subject: 'test',
      body: 'hello',
      externalRef: 'email-uuid-123',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    };
    mockedInteractionCreate.mockResolvedValue(createdInteraction);

    const res = await request(app)
      .post('/api/interactions')
      .send({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 1,
        subject: 'test',
        body: 'hello'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ id: 1, channel: 'EMAIL', direction: 'INBOUND', customerId: 1 });
    expect(mockAdapter.simulateInbound).toHaveBeenCalled();
  });

  it('creates an OUTBOUND interaction via deliver', async () => {
    const mockAdapter = {
      channel: 'EMAIL',
      deliver: jest.fn().mockReturnValue({
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        subject: null,
        body: 'hello',
        externalRef: 'email-uuid-123'
      }),
      simulateInbound: jest.fn()
    };
    mockedGetChannelAdapter.mockReturnValue(mockAdapter);
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    const mockCreatedInteraction = {
      id: 2,
      channel: 'EMAIL',
      direction: 'OUTBOUND',
      subject: null,
      body: 'hello',
      externalRef: 'email-uuid-123',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    };
    mockedInteractionCreate.mockResolvedValue(mockCreatedInteraction);

    const res = await request(app)
      .post('/api/interactions')
      .send({
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        customerId: 1,
        body: 'hello'
      });

    expect(res.status).toBe(201);
    expect(mockAdapter.deliver).toHaveBeenCalled();
  });

  it('returns 404 when customer does not exist', async () => {
    mockedCustomerFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/interactions')
      .send({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 999,
        body: 'hello'
      });

    expect(res.status).toBe(404);
  });

  it('returns 400 when ticket belongs to different customer', async () => {
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    mockedTicketFindUnique.mockResolvedValue({ id: 1, subject: 'Test', status: 'Open', customerId: 2, createdAt: new Date(), updatedAt: new Date() });

    const res = await request(app)
      .post('/api/interactions')
      .send({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 1,
        ticketId: 1,
        body: 'hello'
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .send({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 1,
        body: ''
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 when channel is invalid', async () => {
    const res = await request(app)
      .post('/api/interactions')
      .send({
        channel: 'INVALID',
        direction: 'INBOUND',
        customerId: 1,
        body: 'hello'
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/interactions/:id', () => {
  it('returns 200 with interaction when found', async () => {
    const mockInteraction = {
      id: 1,
      channel: 'EMAIL',
      direction: 'INBOUND',
      subject: null,
      body: 'hello',
      externalRef: 'email-uuid',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    };
    mockedInteractionFindUnique.mockResolvedValue(mockInteraction);

    const res = await request(app).get('/api/interactions/1');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, channel: 'EMAIL', direction: 'INBOUND', customerId: 1 });
  });

  it('returns 404 when interaction not found', async () => {
    mockedInteractionFindUnique.mockResolvedValue(null);

    const res = await request(app).get('/api/interactions/999');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/interactions/:id/associate', () => {
  it('associates interaction with ticket when valid', async () => {
    const mockInteraction = {
      id: 1,
      channel: 'EMAIL',
      direction: 'INBOUND',
      subject: null,
      body: 'hello',
      externalRef: 'email-uuid',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    };
    const mockUpdatedInteraction = { ...mockInteraction, ticketId: 1 };
    mockedInteractionFindUnique.mockResolvedValue(mockInteraction);
    mockedTicketFindUnique.mockResolvedValue({ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: new Date(), updatedAt: new Date() });
    mockedInteractionUpdate.mockResolvedValue(mockUpdatedInteraction);

    const res = await request(app)
      .patch('/api/interactions/1/associate')
      .send({ ticketId: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 1, ticketId: 1 });
  });

  it('returns 400 when ticket belongs to different customer', async () => {
    const interaction = {
      id: 1,
      channel: 'EMAIL',
      direction: 'INBOUND',
      subject: null,
      body: 'hello',
      externalRef: 'email-uuid',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    };
    mockedInteractionFindUnique.mockResolvedValue(interaction);
    mockedTicketFindUnique.mockResolvedValue({ id: 1, subject: 'Test', status: 'Open', customerId: 2, createdAt: new Date(), updatedAt: new Date() });

    const res = await request(app)
      .patch('/api/interactions/1/associate')
      .send({ ticketId: 1 });

    expect(res.status).toBe(400);
  });

  it('returns 404 when interaction not found', async () => {
    mockedInteractionFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/interactions/999/associate')
      .send({ ticketId: 1 });

    expect(res.status).toBe(404);
  });
});
