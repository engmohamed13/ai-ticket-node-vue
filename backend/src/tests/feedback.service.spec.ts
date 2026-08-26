jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    ticketFeedback: { findUnique: jest.fn(), create: jest.fn() }
  }
}));

import { prisma } from '../db/prisma';
import {
  getPortalSummary,
  getTicketFeedback,
  listPortalTickets,
  submitTicketFeedback
} from '../services/feedback.service';
import { AppError } from '../utils/AppError';

const mockedTicketFindUnique = prisma.ticket.findUnique as jest.Mock;
const mockedTicketFindMany = prisma.ticket.findMany as jest.Mock;
const mockedTicketCount = prisma.ticket.count as jest.Mock;
const mockedFeedbackFindUnique = prisma.ticketFeedback.findUnique as jest.Mock;
const mockedFeedbackCreate = prisma.ticketFeedback.create as jest.Mock;

const resolvedTicket = { id: 1, customerId: 10, status: 'Resolved' };

beforeEach(() => {
  jest.clearAllMocks();
});

describe('submitTicketFeedback', () => {
  it('stores the rating and trimmed comment for the owning customer', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue(null);
    mockedFeedbackCreate.mockResolvedValue({ id: 5 });

    await submitTicketFeedback(1, 10, { rating: 4, comment: '  Great work  ' });

    expect(mockedFeedbackCreate.mock.calls[0][0].data).toEqual({
      ticketId: 1,
      customerId: 10,
      rating: 4,
      comment: 'Great work'
    });
  });

  it('stores null when the comment is blank', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue(null);
    mockedFeedbackCreate.mockResolvedValue({ id: 5 });

    await submitTicketFeedback(1, 10, { rating: 5, comment: '   ' });

    expect(mockedFeedbackCreate.mock.calls[0][0].data.comment).toBeNull();
  });

  it('404s when the ticket does not exist', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    await expect(submitTicketFeedback(99, 10, { rating: 5 })).rejects.toMatchObject(
      new AppError(404, 'Ticket 99 not found')
    );
  });

  it('403s when the ticket belongs to another customer', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);

    await expect(submitTicketFeedback(1, 11, { rating: 5 })).rejects.toMatchObject({ status: 403 });
    expect(mockedFeedbackCreate).not.toHaveBeenCalled();
  });

  it('400s while the ticket is still open', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...resolvedTicket, status: 'In Progress' });

    await expect(submitTicketFeedback(1, 10, { rating: 5 })).rejects.toMatchObject({ status: 400 });
    expect(mockedFeedbackCreate).not.toHaveBeenCalled();
  });

  it('accepts a Closed ticket as well as a Resolved one', async () => {
    mockedTicketFindUnique.mockResolvedValue({ ...resolvedTicket, status: 'Closed' });
    mockedFeedbackFindUnique.mockResolvedValue(null);
    mockedFeedbackCreate.mockResolvedValue({ id: 5 });

    await expect(submitTicketFeedback(1, 10, { rating: 3 })).resolves.toEqual({ id: 5 });
  });

  it('409s when the ticket has already been rated', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue({ id: 2 });

    await expect(submitTicketFeedback(1, 10, { rating: 5 })).rejects.toMatchObject({ status: 409 });
    expect(mockedFeedbackCreate).not.toHaveBeenCalled();
  });
});

describe('getTicketFeedback', () => {
  it('returns null rather than throwing when the ticket has no feedback', async () => {
    mockedTicketFindUnique.mockResolvedValue(resolvedTicket);
    mockedFeedbackFindUnique.mockResolvedValue(null);

    await expect(getTicketFeedback(1)).resolves.toBeNull();
  });

  it('404s when the ticket does not exist', async () => {
    mockedTicketFindUnique.mockResolvedValue(null);

    await expect(getTicketFeedback(99)).rejects.toMatchObject({ status: 404 });
  });
});

describe('listPortalTickets', () => {
  it('scopes the query to the caller and returns newest first', async () => {
    mockedTicketFindMany.mockResolvedValue([]);

    await listPortalTickets(10);

    const args = mockedTicketFindMany.mock.calls[0][0];
    expect(args.where).toEqual({ customerId: 10 });
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });
});

describe('getPortalSummary', () => {
  it('returns the five counters', async () => {
    mockedTicketCount
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);

    await expect(getPortalSummary(10)).resolves.toEqual({
      totalTickets: 7,
      openTickets: 3,
      pendingTickets: 1,
      resolvedTickets: 3,
      awaitingFeedback: 2
    });
  });

  it('counts only closed tickets with no feedback as awaiting feedback', async () => {
    mockedTicketCount.mockResolvedValue(0);

    await getPortalSummary(10);

    expect(mockedTicketCount.mock.calls[4][0].where).toEqual({
      customerId: 10,
      status: { in: ['Resolved', 'Closed'] },
      feedback: { is: null }
    });
  });
});
