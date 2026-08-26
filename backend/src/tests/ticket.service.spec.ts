jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    ticketCategory: { findMany: jest.fn(), findUnique: jest.fn() },
    ticketComment: { create: jest.fn(), findMany: jest.fn() },
    ticketAttachment: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    customer: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() }
  }
}));

import { prisma } from '../db/prisma';
import {
  addTicketComment,
  assignTicket,
  createTicket,
  listTickets,
  updateTicket
} from '../services/ticket.service';
import { AppError } from '../utils/AppError';

const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;
const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedTicketCreate = prisma.ticket.create as jest.Mock;
const mockedTicketUpdate = prisma.ticket.update as jest.Mock;
const mockedCategoryFindUnique = prisma.ticketCategory.findUnique as jest.Mock;
const mockedCommentCreate = prisma.ticketComment.create as jest.Mock;
const mockedCustomerFindUnique = prisma.customer.findUnique as jest.Mock;
const mockedUserFindUnique = prisma.user.findUnique as jest.Mock;

const baseTicket = {
  id: 1,
  subject: 'Test',
  status: 'New' as const,
  priority: 'Medium' as const,
  customerId: 1,
  categoryId: null,
  assignedToUserId: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: null as Date | null,
  resolvedAt: null as Date | null,
  createdAt: new Date(),
  updatedAt: new Date()
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('listTickets', () => {
  it('omits every clause when no filter is supplied', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    await listTickets();

    expect(mockedTicketFindMany.mock.calls[0][0].where).toEqual({});
  });

  it('treats unassigned as assignedToUserId null', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    await listTickets({ unassigned: true });

    expect(mockedTicketFindMany.mock.calls[0][0].where).toMatchObject({ assignedToUserId: null });
  });

  it('lets an explicit assignedToUserId win over unassigned', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    await listTickets({ unassigned: true, assignedToUserId: 3 });

    expect(mockedTicketFindMany.mock.calls[0][0].where).toMatchObject({ assignedToUserId: 3 });
  });
});

describe('createTicket', () => {
  it('always opens a ticket in the New status', async () => {
    mockedCustomerFindUnique.mockResolvedValue({ id: 1 });
    mockedTicketCreate.mockResolvedValue(baseTicket);

    await createTicket({ subject: 'Broken login', customerId: 1 });

    expect(mockedTicketCreate.mock.calls[0][0].data).toMatchObject({
      subject: 'Broken login',
      status: 'New',
      priority: 'Medium',
      responseTimeMinutes: 30,
      resolutionTimeMinutes: 480
    });
  });

  it('throws 404 when the customer is missing', async () => {
    mockedCustomerFindUnique.mockResolvedValue(null);

    await expect(createTicket({ subject: 'x', customerId: 9 })).rejects.toMatchObject({ status: 404 });
    expect(mockedTicketCreate).not.toHaveBeenCalled();
  });

  it('validates the category before creating', async () => {
    mockedCustomerFindUnique.mockResolvedValue({ id: 1 });
    mockedCategoryFindUnique.mockResolvedValue(null);

    await expect(createTicket({ subject: 'x', customerId: 1, categoryId: 5 })).rejects.toBeInstanceOf(AppError);
    expect(mockedTicketCreate).not.toHaveBeenCalled();
  });
});

describe('updateTicket SLA stamping', () => {
  it('stamps respondedAt when leaving New for the first time', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket });
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await updateTicket(1, { status: 'Open' });

    expect(mockedTicketUpdate.mock.calls[0][0].data.respondedAt).toBeInstanceOf(Date);
  });

  it('does not stamp respondedAt when the status stays New', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket });
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await updateTicket(1, { status: 'New' });

    expect(mockedTicketUpdate.mock.calls[0][0].data).not.toHaveProperty('respondedAt');
  });

  it('stamps both timestamps when a New ticket jumps straight to Closed', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket });
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await updateTicket(1, { status: 'Closed' });

    const { data } = mockedTicketUpdate.mock.calls[0][0];
    expect(data.respondedAt).toBeInstanceOf(Date);
    expect(data.resolvedAt).toBeInstanceOf(Date);
  });

  it('leaves both timestamps alone when only the priority changes', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket });
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await updateTicket(1, { priority: 'Urgent' });

    const { data } = mockedTicketUpdate.mock.calls[0][0];
    expect(data).not.toHaveProperty('respondedAt');
    expect(data).not.toHaveProperty('resolvedAt');
    expect(data).toEqual({ priority: 'Urgent' });
  });
});

describe('assignTicket', () => {
  it('rejects a customer-role assignee', async () => {
    mockedTicketFindUnique.mockResolvedValue(baseTicket);
    mockedUserFindUnique.mockResolvedValue({ id: 2, isActive: true, role: { key: 'CUSTOMER' } });

    await expect(assignTicket(1, 2)).rejects.toMatchObject({ status: 400 });
    expect(mockedTicketUpdate).not.toHaveBeenCalled();
  });

  it('skips assignee validation when unassigning', async () => {
    mockedTicketFindUnique.mockResolvedValue(baseTicket);
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await assignTicket(1, null);

    expect(mockedUserFindUnique).not.toHaveBeenCalled();
  });
});

describe('addTicketComment', () => {
  it('stamps respondedAt with the comment createdAt on the first comment', async () => {
    const createdAt = new Date('2026-03-03T10:00:00.000Z');
    mockedTicketFindUnique.mockResolvedValue({ ...baseTicket, respondedAt: null });
    mockedCommentCreate.mockResolvedValue({ id: 1, body: 'hi', ticketId: 1, authorId: 1, createdAt });
    mockedTicketUpdate.mockResolvedValue(baseTicket);

    await addTicketComment(1, 1, 'hi');

    expect(mockedTicketUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { respondedAt: createdAt } });
  });

  it('throws 404 for a missing ticket before writing anything', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    await expect(addTicketComment(9, 1, 'hi')).rejects.toMatchObject({ status: 404 });
    expect(mockedCommentCreate).not.toHaveBeenCalled();
  });
});
