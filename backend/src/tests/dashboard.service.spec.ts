jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    ticketFeedback: { groupBy: jest.fn() }
  }
}));

import { prisma } from '../db/prisma';
import {
  getAgentWorkload,
  getCustomerSatisfaction,
  getTicketTrends,
  getTicketsSummary,
  isoWeekKey
} from '../services/dashboard.service';

const mockedCount = prisma.ticket.count as jest.Mock;
const mockedGroupBy = prisma.ticket.groupBy as jest.Mock;
const mockedFindMany = prisma.ticket.findMany as jest.Mock;
const mockedFeedbackGroupBy = prisma.ticketFeedback.groupBy as jest.Mock;

const NOW = new Date('2026-08-26T12:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const slaRow = (overrides: Record<string, unknown> = {}) => ({
  status: 'Open',
  createdAt: new Date(NOW.getTime() - 4 * HOUR_MS),
  respondedAt: null,
  resolvedAt: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
  mockedCount.mockResolvedValue(0);
  mockedGroupBy.mockResolvedValue([]);
  mockedFindMany.mockResolvedValue([]);
  mockedFeedbackGroupBy.mockResolvedValue([]);
});

describe('getTicketsSummary', () => {
  it('returns every status and priority, zeros included', async () => {
    const summary = await getTicketsSummary({}, NOW);

    expect(summary.byStatus).toHaveLength(6);
    expect(summary.byPriority).toHaveLength(4);
    expect(summary.byStatus.every((entry) => entry.count === 0)).toBe(true);
  });

  it('rolls the status distribution up into the headline counters', async () => {
    mockedGroupBy.mockImplementation(({ by }: { by: string[] }) =>
      by[0] === 'status'
        ? Promise.resolve([
            { status: 'New', _count: { _all: 2 } },
            { status: 'In Progress', _count: { _all: 1 } },
            { status: 'Pending', _count: { _all: 4 } },
            { status: 'Resolved', _count: { _all: 3 } },
            { status: 'Closed', _count: { _all: 1 } }
          ])
        : Promise.resolve([])
    );

    const summary = await getTicketsSummary({}, NOW);

    expect(summary.openTickets).toBe(3);
    expect(summary.pendingTickets).toBe(4);
    expect(summary.resolvedTickets).toBe(4);
  });

  it('counts an open ticket past its response target as overdue', async () => {
    mockedFindMany.mockResolvedValue([slaRow()]);

    const summary = await getTicketsSummary({}, NOW);

    expect(summary.overdueTickets).toBe(1);
  });

  it('never counts a closed ticket as overdue', async () => {
    mockedFindMany.mockResolvedValue([slaRow({ status: 'Closed', resolvedAt: NOW })]);

    const summary = await getTicketsSummary({}, NOW);

    expect(summary.overdueTickets).toBe(0);
  });

  it('applies a date range to the createdAt column', async () => {
    const startDate = new Date('2026-08-01T00:00:00.000Z');
    const endDate = new Date('2026-08-31T00:00:00.000Z');

    await getTicketsSummary({ startDate, endDate }, NOW);

    expect(mockedCount.mock.calls[0][0].where.createdAt).toEqual({ gte: startDate, lte: endDate });
  });

  it('accepts an open-ended range', async () => {
    const startDate = new Date('2026-08-01T00:00:00.000Z');

    await getTicketsSummary({ startDate }, NOW);

    expect(mockedCount.mock.calls[0][0].where.createdAt).toEqual({ gte: startDate });
  });

  it('adds no createdAt clause when no range is given', async () => {
    await getTicketsSummary({}, NOW);

    expect(mockedCount.mock.calls[0][0].where.createdAt).toBeUndefined();
  });

  it('passes the status, priority, and agent filters through', async () => {
    await getTicketsSummary({ status: 'Pending', priority: 'Urgent', assignedToUserId: 7 }, NOW);

    expect(mockedCount.mock.calls[0][0].where).toMatchObject({
      status: 'Pending',
      priority: 'Urgent',
      assignedToUserId: 7
    });
  });
});

describe('getCustomerSatisfaction', () => {
  it('averages the ratings and returns the full 1-5 breakdown', async () => {
    mockedFeedbackGroupBy.mockResolvedValue([
      { rating: 5, _count: { _all: 3 } },
      { rating: 4, _count: { _all: 1 } }
    ]);

    const satisfaction = await getCustomerSatisfaction();

    expect(satisfaction.totalFeedback).toBe(4);
    expect(satisfaction.averageRating).toBe(4.75);
    expect(satisfaction.ratingBreakdown).toHaveLength(5);
    expect(satisfaction.ratingBreakdown[0]).toEqual({ rating: 1, count: 0 });
  });

  it('reports null, not zero, when nobody has rated anything', async () => {
    const satisfaction = await getCustomerSatisfaction();

    expect(satisfaction.averageRating).toBeNull();
    expect(satisfaction.totalFeedback).toBe(0);
  });

  it('filters feedback by when the rating was left', async () => {
    const startDate = new Date('2026-08-01T00:00:00.000Z');

    await getCustomerSatisfaction({ startDate });

    expect(mockedFeedbackGroupBy.mock.calls[0][0].where.createdAt).toEqual({ gte: startDate });
  });
});

describe('isoWeekKey', () => {
  it('formats a padded, lexicographically sortable week key', () => {
    expect(isoWeekKey(new Date('2026-01-05T00:00:00.000Z'))).toBe('2026-W02');
  });

  it('keeps chronological order under plain string sorting', () => {
    const keys = [
      isoWeekKey(new Date('2026-03-01T00:00:00.000Z')),
      isoWeekKey(new Date('2026-01-15T00:00:00.000Z'))
    ].sort();

    expect(keys[0] < keys[1]).toBe(true);
  });
});

describe('getTicketTrends', () => {
  it('returns one bucket per week in the window, chronologically', async () => {
    const trends = await getTicketTrends(4, {}, NOW);

    expect(trends).toHaveLength(4);
    expect([...trends].sort((a, b) => a.week.localeCompare(b.week))).toEqual(trends);
  });

  it('leaves a quiet week in the series as a zero rather than a gap', async () => {
    const trends = await getTicketTrends(4, {}, NOW);

    expect(trends.every((point) => point.created === 0 && point.resolved === 0)).toBe(true);
  });

  it('counts a ticket into its creation week and its resolution week', async () => {
    const createdAt = new Date(NOW.getTime() - 10 * DAY_MS);
    mockedFindMany.mockResolvedValue([{ createdAt, resolvedAt: NOW }]);

    const trends = await getTicketTrends(4, {}, NOW);

    expect(trends.find((point) => point.week === isoWeekKey(createdAt))?.created).toBe(1);
    expect(trends.find((point) => point.week === isoWeekKey(NOW))?.resolved).toBe(1);
  });

  it('ignores a ticket that falls outside the requested window', async () => {
    mockedFindMany.mockResolvedValue([
      { createdAt: new Date(NOW.getTime() - 200 * DAY_MS), resolvedAt: null }
    ]);

    const trends = await getTicketTrends(4, {}, NOW);

    expect(trends.every((point) => point.created === 0)).toBe(true);
  });
});

describe('getAgentWorkload', () => {
  const agentTicket = (agentId: number, name: string, overrides: Record<string, unknown> = {}) => ({
    assignedToUserId: agentId,
    assignedTo: { id: agentId, name },
    ...slaRow(overrides)
  });

  it('groups tickets per agent and counts each state', async () => {
    mockedFindMany.mockResolvedValue([
      agentTicket(7, 'Ada', { status: 'Open', respondedAt: new Date(NOW.getTime() - 3 * HOUR_MS) }),
      agentTicket(7, 'Ada', { status: 'Pending', respondedAt: new Date(NOW.getTime() - 3 * HOUR_MS) }),
      agentTicket(7, 'Ada', { status: 'Resolved', resolvedAt: NOW })
    ]);

    const [row] = await getAgentWorkload({}, NOW);

    expect(row).toMatchObject({
      agentId: 7,
      agentName: 'Ada',
      totalAssigned: 3,
      open: 1,
      pending: 1,
      resolved: 1,
      overdue: 0
    });
  });

  it('counts an overdue ticket in the agent row', async () => {
    mockedFindMany.mockResolvedValue([agentTicket(7, 'Ada')]);

    const [row] = await getAgentWorkload({}, NOW);

    expect(row.overdue).toBe(1);
  });

  it('orders the busiest agent first', async () => {
    mockedFindMany.mockResolvedValue([
      agentTicket(7, 'Ada'),
      agentTicket(9, 'Bo'),
      agentTicket(9, 'Bo'),
      agentTicket(9, 'Bo')
    ]);

    const rows = await getAgentWorkload({}, NOW);

    expect(rows.map((row) => row.agentName)).toEqual(['Bo', 'Ada']);
  });

  it('asks only for assigned tickets', async () => {
    await getAgentWorkload({}, NOW);

    expect(mockedFindMany.mock.calls[0][0].where.assignedToUserId).toEqual({ not: null });
  });

  it('returns an empty list when nobody holds a ticket', async () => {
    await expect(getAgentWorkload({}, NOW)).resolves.toEqual([]);
  });
});
