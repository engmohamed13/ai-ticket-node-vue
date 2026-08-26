jest.mock('../db/prisma', () => ({
  prisma: {
    ticket: { count: jest.fn(), groupBy: jest.fn(), findMany: jest.fn() },
    ticketFeedback: { groupBy: jest.fn() },
    kbArticle: { findMany: jest.fn() }
  }
}));

import request from 'supertest';
import app from '../app';
import { prisma } from '../db/prisma';
import { bearer } from './authTestHelper';

const mockedCount = prisma.ticket.count as jest.Mock;
const mockedGroupBy = prisma.ticket.groupBy as jest.Mock;
const mockedFindMany = prisma.ticket.findMany as jest.Mock;
const mockedFeedbackGroupBy = prisma.ticketFeedback.groupBy as jest.Mock;
const mockedArticleFindMany = prisma.kbArticle.findMany as jest.Mock;

const managerBearer = () =>
  bearer({
    userId: 3,
    roleKey: 'CRM_MANAGER',
    customerId: null,
    permissions: ['tickets:read', 'reports:read', 'kb:read']
  });

const agentBearer = () =>
  bearer({
    userId: 7,
    roleKey: 'SUPPORT_AGENT',
    customerId: null,
    permissions: ['tickets:read', 'tickets:manage']
  });

beforeEach(() => {
  jest.clearAllMocks();
  mockedCount.mockResolvedValue(0);
  mockedGroupBy.mockResolvedValue([]);
  mockedFindMany.mockResolvedValue([]);
  mockedFeedbackGroupBy.mockResolvedValue([]);
  mockedArticleFindMany.mockResolvedValue([]);
});

describe('GET /api/dashboard/tickets-summary', () => {
  it('returns the KPI block to a reports:read holder', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      totalTickets: 0,
      openTickets: 0,
      pendingTickets: 0,
      resolvedTickets: 0,
      overdueTickets: 0
    });
    expect(response.body.data.byStatus).toHaveLength(6);
    expect(response.body.data.byPriority).toHaveLength(4);
  });

  it('403s a token without reports:read', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(403);
  });

  it('401s without a token', async () => {
    const response = await request(app).get('/api/dashboard/tickets-summary');

    expect(response.status).toBe(401);
  });

  it('coerces the date range from the query string', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary?startDate=2026-08-01&endDate=2026-08-31')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(200);
    expect(mockedCount.mock.calls[0][0].where.createdAt.gte).toEqual(new Date('2026-08-01'));
  });

  it('400s a range whose end is before its start', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary?startDate=2026-08-31&endDate=2026-08-01')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(400);
  });

  it('400s an unparseable date', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary?startDate=not-a-date')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(400);
  });

  it('400s an unknown status filter', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary?status=Nonsense')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(400);
  });

  it('400s an unknown query parameter', async () => {
    const response = await request(app)
      .get('/api/dashboard/tickets-summary?nope=1')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(400);
  });
});

describe('GET /api/dashboard/customer-satisfaction', () => {
  it('returns the average and the breakdown', async () => {
    mockedFeedbackGroupBy.mockResolvedValue([
      { rating: 5, _count: { _all: 2 } },
      { rating: 3, _count: { _all: 2 } }
    ]);

    const response = await request(app)
      .get('/api/dashboard/customer-satisfaction')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data.averageRating).toBe(4);
    expect(response.body.data.totalFeedback).toBe(4);
  });

  it('403s a token without reports:read', async () => {
    const response = await request(app)
      .get('/api/dashboard/customer-satisfaction')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(403);
  });
});

describe('GET /api/dashboard/ticket-trends', () => {
  it('defaults to an eight-week window', async () => {
    const response = await request(app)
      .get('/api/dashboard/ticket-trends')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(8);
  });

  it('honours an explicit week count', async () => {
    const response = await request(app)
      .get('/api/dashboard/ticket-trends?weeks=4')
      .set('Authorization', managerBearer());

    expect(response.body.data).toHaveLength(4);
  });

  it('400s a week count outside the allowed range', async () => {
    const response = await request(app)
      .get('/api/dashboard/ticket-trends?weeks=100')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(400);
  });
});

describe('GET /api/dashboard/agent-workload', () => {
  it('returns one row per agent holding tickets', async () => {
    mockedFindMany.mockResolvedValue([
      {
        assignedToUserId: 7,
        assignedTo: { id: 7, name: 'Ada' },
        status: 'Open',
        createdAt: new Date(),
        respondedAt: new Date(),
        resolvedAt: null,
        responseTimeMinutes: 30,
        resolutionTimeMinutes: 480
      }
    ]);

    const response = await request(app)
      .get('/api/dashboard/agent-workload')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].agentName).toBe('Ada');
  });

  it('403s a token without reports:read', async () => {
    const response = await request(app)
      .get('/api/dashboard/agent-workload')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(403);
  });
});

describe('GET /api/dashboard/kb-top-articles', () => {
  it('returns the most-read published articles', async () => {
    mockedArticleFindMany.mockResolvedValue([{ id: 1, title: 'Cannot sign in', viewCount: 12 }]);

    const response = await request(app)
      .get('/api/dashboard/kb-top-articles')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(200);
    expect(mockedArticleFindMany.mock.calls[0][0].where).toEqual({ isPublished: true });
    expect(mockedArticleFindMany.mock.calls[0][0].take).toBe(5);
  });

  it('honours an explicit limit', async () => {
    await request(app)
      .get('/api/dashboard/kb-top-articles?limit=3')
      .set('Authorization', managerBearer());

    expect(mockedArticleFindMany.mock.calls[0][0].take).toBe(3);
  });

  it('400s a limit outside the allowed range', async () => {
    const response = await request(app)
      .get('/api/dashboard/kb-top-articles?limit=0')
      .set('Authorization', managerBearer());

    expect(response.status).toBe(400);
  });

  it('403s a token without reports:read', async () => {
    const response = await request(app)
      .get('/api/dashboard/kb-top-articles')
      .set('Authorization', agentBearer());

    expect(response.status).toBe(403);
  });
});
