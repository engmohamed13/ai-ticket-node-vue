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

import { getChannelAdapter } from '../channels/registry';
import { prisma } from '../db/prisma';
import { createInteraction, associateInteractionWithTicket, getInteractionById } from '../services/interaction.service';

const mockedGetChannelAdapter = getChannelAdapter as jest.Mock;
const mockedCustomerFindUnique = prisma.customer.findUnique as jest.Mock;
const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedInteractionFindUnique = prisma.interaction.findUnique as jest.Mock;
const mockedInteractionCreate = prisma.interaction.create as jest.Mock;
const mockedInteractionUpdate = prisma.interaction.update as jest.Mock;

describe('createInteraction', () => {
  it('creates an INBOUND interaction with simulateInbound', async () => {
    const mockAdapter = {
      channel: 'EMAIL',
      simulateInbound: jest.fn().mockReturnValue({
        channel: 'EMAIL',
        direction: 'INBOUND',
        subject: 'test',
        body: 'hello',
        externalRef: 'email-uuid'
      }),
      deliver: jest.fn()
    };
    mockedGetChannelAdapter.mockReturnValue(mockAdapter);
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    mockedInteractionCreate.mockResolvedValue({
      id: 1,
      channel: 'EMAIL',
      direction: 'INBOUND',
      subject: 'test',
      body: 'hello',
      externalRef: 'email-uuid',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    });

    await createInteraction({
      channel: 'EMAIL',
      direction: 'INBOUND',
      customerId: 1,
      subject: 'test',
      body: 'hello'
    });

    expect(mockAdapter.simulateInbound).toHaveBeenCalledWith({ subject: 'test', body: 'hello' });
    expect(mockedInteractionCreate).toHaveBeenCalled();
  });

  it('creates an OUTBOUND interaction with deliver', async () => {
    const mockAdapter = {
      channel: 'EMAIL',
      deliver: jest.fn().mockReturnValue({
        channel: 'EMAIL',
        direction: 'OUTBOUND',
        subject: 'test',
        body: 'hello',
        externalRef: 'email-uuid'
      }),
      simulateInbound: jest.fn()
    };
    mockedGetChannelAdapter.mockReturnValue(mockAdapter);
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    mockedInteractionCreate.mockResolvedValue({
      id: 1,
      channel: 'EMAIL',
      direction: 'OUTBOUND',
      subject: 'test',
      body: 'hello',
      externalRef: 'email-uuid',
      customerId: 1,
      ticketId: null,
      occurredAt: new Date(),
      createdAt: new Date()
    });

    await createInteraction({
      channel: 'EMAIL',
      direction: 'OUTBOUND',
      customerId: 1,
      subject: 'test',
      body: 'hello'
    });

    expect(mockAdapter.deliver).toHaveBeenCalledWith({ subject: 'test', body: 'hello' });
  });

  it('throws 404 when customer does not exist', async () => {
    mockedCustomerFindUnique.mockResolvedValue(null);

    await expect(
      createInteraction({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 999,
        body: 'hello'
      })
    ).rejects.toThrow('Customer 999 not found');
  });

  it('throws 404 when ticket does not exist', async () => {
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    mockedTicketFindUnique.mockResolvedValue(null);

    await expect(
      createInteraction({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 1,
        ticketId: 999,
        body: 'hello'
      })
    ).rejects.toThrow('Ticket 999 not found');
  });

  it('throws 400 when ticket belongs to different customer', async () => {
    mockedCustomerFindUnique.mockResolvedValue({ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: new Date() });
    mockedTicketFindUnique.mockResolvedValue({ id: 1, subject: 'Test', status: 'Open', customerId: 2, createdAt: new Date(), updatedAt: new Date() });

    await expect(
      createInteraction({
        channel: 'EMAIL',
        direction: 'INBOUND',
        customerId: 1,
        ticketId: 1,
        body: 'hello'
      })
    ).rejects.toThrow('Ticket 1 does not belong to customer 1');
  });
});

describe('getInteractionById', () => {
  it('returns interaction when found', async () => {
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

    const result = await getInteractionById(1);

    expect(result).toEqual(interaction);
  });

  it('throws 404 when interaction not found', async () => {
    mockedInteractionFindUnique.mockResolvedValue(null);

    await expect(getInteractionById(999)).rejects.toThrow('Interaction 999 not found');
  });
});

describe('associateInteractionWithTicket', () => {
  it('associates interaction with ticket when both exist and match customer', async () => {
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
    const updatedInteraction = { ...interaction, ticketId: 1 };
    mockedInteractionFindUnique.mockResolvedValue(interaction);
    mockedTicketFindUnique.mockResolvedValue({ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: new Date(), updatedAt: new Date() });
    mockedInteractionUpdate.mockResolvedValue(updatedInteraction);

    const result = await associateInteractionWithTicket(1, 1);

    expect(result).toEqual(updatedInteraction);
    expect(mockedInteractionUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { ticketId: 1 } });
  });

  it('throws 400 when ticket belongs to different customer', async () => {
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

    await expect(associateInteractionWithTicket(1, 1)).rejects.toThrow('Ticket 1 does not belong to customer 1');
  });
});
