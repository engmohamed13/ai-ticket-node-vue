import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import {
  fetchAgentWorkload,
  fetchCustomerSatisfaction,
  fetchTicketTrends,
  fetchTicketsSummary,
  fetchTopKbArticles
} from '../services/dashboard.service';

vi.mock('../services/api', () => ({ default: { get: vi.fn() } }));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

const envelope = <T>(data: T, message = 'OK') => ({ data: { success: true, message, data } });

const NO_FILTERS = {
  startDate: undefined,
  endDate: undefined,
  status: undefined,
  priority: undefined,
  assignedToUserId: undefined
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchTicketsSummary', () => {
  it('reads the summary endpoint with no params when nothing is filtered', async () => {
    mockedGet.mockResolvedValue(envelope({ totalTickets: 3 }));

    await fetchTicketsSummary();

    expect(mockedGet).toHaveBeenCalledWith('/dashboard/tickets-summary', { params: NO_FILTERS });
  });

  it('drops a blank date string rather than sending it as a param', async () => {
    mockedGet.mockResolvedValue(envelope({ totalTickets: 0 }));

    await fetchTicketsSummary({ startDate: '', endDate: '2026-08-31' });

    expect(mockedGet.mock.calls[0][1].params.startDate).toBeUndefined();
    expect(mockedGet.mock.calls[0][1].params.endDate).toBe('2026-08-31');
  });

  it('falls back to a zeroed summary rather than throwing', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchTicketsSummary()).resolves.toMatchObject({
      totalTickets: 0,
      byStatus: [],
      byPriority: []
    });
  });
});

describe('fetchCustomerSatisfaction', () => {
  it('reads the satisfaction endpoint', async () => {
    mockedGet.mockResolvedValue(envelope({ averageRating: 4.5, totalFeedback: 2, ratingBreakdown: [] }));

    await expect(fetchCustomerSatisfaction()).resolves.toMatchObject({ averageRating: 4.5 });
    expect(mockedGet).toHaveBeenCalledWith('/dashboard/customer-satisfaction', { params: NO_FILTERS });
  });

  it('falls back to a null average, never a zero', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchCustomerSatisfaction()).resolves.toEqual({
      averageRating: null,
      totalFeedback: 0,
      ratingBreakdown: []
    });
  });
});

describe('fetchTicketTrends', () => {
  it('sends the week count alongside the filters', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchTicketTrends(8, { status: 'Pending' });

    expect(mockedGet.mock.calls[0][1].params).toMatchObject({ weeks: 8, status: 'Pending' });
  });

  it('falls back to an empty series', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchTicketTrends(8)).resolves.toEqual([]);
  });
});

describe('fetchAgentWorkload', () => {
  it('reads the workload endpoint', async () => {
    mockedGet.mockResolvedValue(envelope([{ agentId: 7 }]));

    await expect(fetchAgentWorkload()).resolves.toHaveLength(1);
    expect(mockedGet).toHaveBeenCalledWith('/dashboard/agent-workload', { params: NO_FILTERS });
  });
});

describe('fetchTopKbArticles', () => {
  it('defaults to a limit of five', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchTopKbArticles();

    expect(mockedGet).toHaveBeenCalledWith('/dashboard/kb-top-articles', { params: { limit: 5 } });
  });

  it('honours an explicit limit', async () => {
    mockedGet.mockResolvedValue(envelope([]));

    await fetchTopKbArticles(3);

    expect(mockedGet.mock.calls[0][1].params.limit).toBe(3);
  });
});
