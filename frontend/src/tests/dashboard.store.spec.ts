import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { TREND_WEEKS, useDashboardStore } from '../stores/dashboard';
import {
  fetchAgentWorkload,
  fetchCustomerSatisfaction,
  fetchTicketTrends,
  fetchTicketsSummary,
  fetchTopKbArticles
} from '../services/dashboard.service';
import type { CustomerSatisfaction, TicketsSummary } from '../types';

vi.mock('../services/dashboard.service', () => ({
  fetchTicketsSummary: vi.fn(),
  fetchCustomerSatisfaction: vi.fn(),
  fetchTicketTrends: vi.fn(),
  fetchAgentWorkload: vi.fn(),
  fetchTopKbArticles: vi.fn()
}));

const mockedSummary = fetchTicketsSummary as unknown as ReturnType<typeof vi.fn>;
const mockedSatisfaction = fetchCustomerSatisfaction as unknown as ReturnType<typeof vi.fn>;
const mockedTrends = fetchTicketTrends as unknown as ReturnType<typeof vi.fn>;
const mockedWorkload = fetchAgentWorkload as unknown as ReturnType<typeof vi.fn>;
const mockedArticles = fetchTopKbArticles as unknown as ReturnType<typeof vi.fn>;

const summary: TicketsSummary = {
  totalTickets: 10,
  openTickets: 4,
  pendingTickets: 2,
  resolvedTickets: 4,
  overdueTickets: 1,
  unassignedTickets: 3,
  byStatus: [
    { status: 'New', count: 2 },
    { status: 'Open', count: 6 }
  ],
  byPriority: [
    { priority: 'Low', count: 1 },
    { priority: 'Urgent', count: 3 }
  ]
};

const satisfaction: CustomerSatisfaction = {
  averageRating: 4.5,
  totalFeedback: 2,
  ratingBreakdown: [{ rating: 5, count: 1 }]
};

const seedAllOk = (): void => {
  mockedSummary.mockResolvedValue(summary);
  mockedSatisfaction.mockResolvedValue(satisfaction);
  mockedTrends.mockResolvedValue([{ week: '2026-W35', created: 3, resolved: 1 }]);
  mockedWorkload.mockResolvedValue([
    { agentId: 7, agentName: 'Ada', totalAssigned: 3, open: 2, pending: 0, resolved: 1, overdue: 1 }
  ]);
  mockedArticles.mockResolvedValue([{ id: 1, title: 'Cannot sign in', viewCount: 12 }]);
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('load', () => {
  it('populates all five panels', async () => {
    seedAllOk();

    const store = useDashboardStore();
    await store.load();

    expect(store.summary).toEqual(summary);
    expect(store.satisfaction).toEqual(satisfaction);
    expect(store.trends).toHaveLength(1);
    expect(store.workload).toHaveLength(1);
    expect(store.topArticles).toHaveLength(1);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it('requests the configured trend window', async () => {
    seedAllOk();

    const store = useDashboardStore();
    await store.load();

    expect(mockedTrends.mock.calls[0][0]).toBe(TREND_WEEKS);
  });

  it('keeps the other panels when one endpoint fails', async () => {
    seedAllOk();
    mockedWorkload.mockRejectedValue(new Error('Forbidden: insufficient permissions'));

    const store = useDashboardStore();
    await store.load();

    expect(store.summary).toEqual(summary);
    expect(store.trends).toHaveLength(1);
    expect(store.error).toBe('Forbidden: insufficient permissions');
  });

  it('sends no filter params when nothing is filtered', async () => {
    seedAllOk();

    const store = useDashboardStore();
    await store.load();

    expect(mockedSummary).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: undefined,
      status: undefined,
      priority: undefined,
      assignedToUserId: undefined
    });
  });

  it('passes every filter through to each panel', async () => {
    seedAllOk();

    const store = useDashboardStore();
    store.startDate = '2026-08-01';
    store.endDate = '2026-08-31';
    store.statusFilter = 'Pending';
    store.priorityFilter = 'Urgent';
    store.agentFilter = 7;
    await store.load();

    expect(mockedSummary).toHaveBeenCalledWith({
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      status: 'Pending',
      priority: 'Urgent',
      assignedToUserId: 7
    });
  });

  it('refuses an inverted date range without calling the API', async () => {
    seedAllOk();

    const store = useDashboardStore();
    store.startDate = '2026-08-31';
    store.endDate = '2026-08-01';
    await store.load();

    expect(store.rangeIsInvalid).toBe(true);
    expect(store.error).toContain('on or before');
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it('accepts an open-ended range', async () => {
    seedAllOk();

    const store = useDashboardStore();
    store.startDate = '2026-08-01';
    await store.load();

    expect(store.rangeIsInvalid).toBe(false);
    expect(mockedSummary.mock.calls[0][0].endDate).toBeUndefined();
  });
});

describe('clearFilters', () => {
  it('resets every filter and reloads', async () => {
    seedAllOk();

    const store = useDashboardStore();
    store.startDate = '2026-08-01';
    store.statusFilter = 'Pending';
    store.agentFilter = 7;
    await store.clearFilters();

    expect(store.hasFilters).toBe(false);
    expect(mockedSummary.mock.calls[0][0]).toEqual({
      startDate: undefined,
      endDate: undefined,
      status: undefined,
      priority: undefined,
      assignedToUserId: undefined
    });
  });
});

describe('chart scaling', () => {
  it('scales bars against the largest value in each series', async () => {
    seedAllOk();

    const store = useDashboardStore();
    await store.load();

    expect(store.statusPeak).toBe(6);
    expect(store.priorityPeak).toBe(3);
    expect(store.trendPeak).toBe(3);
  });

  it('never divides by zero on an empty dashboard', async () => {
    mockedSummary.mockResolvedValue({ ...summary, byStatus: [], byPriority: [] });
    mockedSatisfaction.mockResolvedValue(satisfaction);
    mockedTrends.mockResolvedValue([]);
    mockedWorkload.mockResolvedValue([]);
    mockedArticles.mockResolvedValue([]);

    const store = useDashboardStore();
    await store.load();

    expect(store.statusPeak).toBe(1);
    expect(store.priorityPeak).toBe(1);
    expect(store.trendPeak).toBe(1);
  });
});
