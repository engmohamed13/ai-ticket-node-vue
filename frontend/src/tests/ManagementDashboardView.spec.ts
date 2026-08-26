import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import ManagementDashboardView from '../views/ManagementDashboardView.vue';
import {
  fetchAgentWorkload,
  fetchCustomerSatisfaction,
  fetchTicketTrends,
  fetchTicketsSummary,
  fetchTopKbArticles
} from '../services/dashboard.service';
import { fetchUsers } from '../services/users.service';
import type { CustomerSatisfaction, TicketsSummary } from '../types';

vi.mock('../services/dashboard.service', () => ({
  fetchTicketsSummary: vi.fn(),
  fetchCustomerSatisfaction: vi.fn(),
  fetchTicketTrends: vi.fn(),
  fetchAgentWorkload: vi.fn(),
  fetchTopKbArticles: vi.fn()
}));

vi.mock('../services/users.service', () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn()
}));

const mockedSummary = fetchTicketsSummary as unknown as ReturnType<typeof vi.fn>;
const mockedSatisfaction = fetchCustomerSatisfaction as unknown as ReturnType<typeof vi.fn>;
const mockedTrends = fetchTicketTrends as unknown as ReturnType<typeof vi.fn>;
const mockedWorkload = fetchAgentWorkload as unknown as ReturnType<typeof vi.fn>;
const mockedArticles = fetchTopKbArticles as unknown as ReturnType<typeof vi.fn>;
const mockedUsers = fetchUsers as unknown as ReturnType<typeof vi.fn>;

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
  byPriority: [{ priority: 'Urgent', count: 3 }]
};

const satisfaction: CustomerSatisfaction = {
  averageRating: 4.5,
  totalFeedback: 2,
  ratingBreakdown: [{ rating: 5, count: 1 }]
};

const seedAllOk = (): void => {
  mockedSummary.mockResolvedValue(summary);
  mockedSatisfaction.mockResolvedValue(satisfaction);
  mockedTrends.mockResolvedValue([
    { week: '2026-W34', created: 3, resolved: 1 },
    { week: '2026-W35', created: 1, resolved: 2 }
  ]);
  mockedWorkload.mockResolvedValue([
    { agentId: 7, agentName: 'Ada', totalAssigned: 3, open: 2, pending: 0, resolved: 1, overdue: 1 }
  ]);
  mockedArticles.mockResolvedValue([
    {
      id: 1,
      title: 'Cannot sign in',
      viewCount: 12,
      category: { id: 3, name: 'Troubleshooting' }
    }
  ]);
  mockedUsers.mockResolvedValue([
    { id: 7, name: 'Ada', roleKey: 'SUPPORT_AGENT' },
    { id: 50, name: 'Demo Customer', roleKey: 'CUSTOMER' }
  ]);
};

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' };

const mountView = () =>
  mount(ManagementDashboardView, { global: { stubs: { RouterLink: RouterLinkStub } } });

describe('ManagementDashboardView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders the six KPI tiles', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="kpi-total"]').text()).toBe('10');
    expect(wrapper.find('[data-testid="kpi-open"]').text()).toBe('4');
    expect(wrapper.find('[data-testid="kpi-pending"]').text()).toBe('2');
    expect(wrapper.find('[data-testid="kpi-resolved"]').text()).toBe('4');
    expect(wrapper.find('[data-testid="kpi-overdue"]').text()).toBe('1');
    expect(wrapper.find('[data-testid="kpi-satisfaction"]').text()).toContain('4.5');
  });

  it('shows a dash rather than a zero when nothing has been rated', async () => {
    seedAllOk();
    mockedSatisfaction.mockResolvedValue({ averageRating: null, totalFeedback: 0, ratingBreakdown: [] });

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="kpi-satisfaction"]').text()).toBe('—');
    expect(wrapper.find('[data-testid="kpi-satisfaction-count"]').text()).toBe('0 ratings');
  });

  it('renders the status and priority distributions', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="status-distribution"]').text()).toContain('New');
    expect(wrapper.find('[data-testid="priority-distribution"]').text()).toContain('Urgent');
  });

  it('renders one trend column per week', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="trend-column"]')).toHaveLength(2);
    expect(wrapper.find('[data-testid="ticket-trends"]').text()).toContain('W34');
  });

  it('renders one workload row per agent', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="workload-row"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="agent-workload-table"]').text()).toContain('Ada');
  });

  it('shows the workload empty state when nothing is assigned', async () => {
    seedAllOk();
    mockedWorkload.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="workload-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="agent-workload-table"]').exists()).toBe(false);
  });

  it('lists the most-read articles with their view counts', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="top-article-row"]')).toHaveLength(1);
    expect(wrapper.find('[data-testid="top-articles"]').text()).toContain('12 views');
  });

  it('shows the empty state when nothing is published', async () => {
    seedAllOk();
    mockedArticles.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="top-articles-empty"]').exists()).toBe(true);
  });

  it('offers only staff in the agent filter', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    const options = wrapper.find('[data-testid="filter-agent"]').findAll('option');
    expect(options.map((option) => option.text())).toEqual(['All agents', 'Ada']);
  });

  it('still renders when the agent list cannot be loaded', async () => {
    seedAllOk();
    mockedUsers.mockRejectedValue(new Error('Forbidden'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="kpi-total"]').text()).toBe('10');
    expect(wrapper.find('[data-testid="filter-agent"]').findAll('option')).toHaveLength(1);
  });

  it('reloads with the chosen filters on submit', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="filter-start-date"]').setValue('2026-08-01');
    await wrapper.find('[data-testid="filter-status"]').setValue('Pending');
    await wrapper.find('[data-testid="dashboard-filter-form"]').trigger('submit');
    await flushPromises();

    expect(mockedSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ startDate: '2026-08-01', status: 'Pending' })
    );
  });

  it('reports an inverted date range without calling the API again', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();
    mockedSummary.mockClear();

    await wrapper.find('[data-testid="filter-start-date"]').setValue('2026-08-31');
    await wrapper.find('[data-testid="filter-end-date"]').setValue('2026-08-01');
    await wrapper.find('[data-testid="dashboard-filter-form"]').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="dashboard-error"]').text()).toContain('on or before');
    expect(mockedSummary).not.toHaveBeenCalled();
  });

  it('clears the filters and reloads', async () => {
    seedAllOk();

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="filter-status"]').setValue('Pending');
    await wrapper.find('[data-testid="dashboard-filter-form"]').trigger('submit');
    await flushPromises();

    await wrapper.find('[data-testid="clear-filters-button"]').trigger('click');
    await flushPromises();

    expect(mockedSummary).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: undefined, startDate: undefined })
    );
  });

  it('surfaces a failing panel in the error banner', async () => {
    seedAllOk();
    mockedSummary.mockRejectedValue(new Error('Forbidden: insufficient permissions'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="dashboard-error"]').text()).toContain('insufficient permissions');
  });
});
