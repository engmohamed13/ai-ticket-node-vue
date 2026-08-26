import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CustomerPortalView from '../views/CustomerPortalView.vue';
import { fetchPortalSummary, fetchPortalTickets } from '../services/portal.service';
import type { PortalTicket } from '../types';

vi.mock('../services/portal.service', () => ({
  fetchPortalSummary: vi.fn(),
  fetchPortalTickets: vi.fn(),
  fetchTicketFeedback: vi.fn(),
  submitTicketFeedback: vi.fn()
}));

const mockedSummary = fetchPortalSummary as unknown as ReturnType<typeof vi.fn>;
const mockedTickets = fetchPortalTickets as unknown as ReturnType<typeof vi.fn>;

const STAMP = '2026-08-26T10:00:00.000Z';

const portalTicket = (overrides: Partial<PortalTicket> = {}): PortalTicket =>
  ({
    id: 1,
    subject: 'Cannot log in',
    status: 'Open',
    priority: 'High',
    customerId: 10,
    categoryId: null,
    category: null,
    assignedToUserId: null,
    assignedTo: null,
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 480,
    respondedAt: null,
    resolvedAt: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    feedback: null,
    ...overrides
  }) as PortalTicket;

const summary = {
  totalTickets: 3,
  openTickets: 1,
  pendingTickets: 1,
  resolvedTickets: 1,
  awaitingFeedback: 1
};

// A slot-rendering stub: the ticket subject lives inside the link and the default stub
// would swallow it.
const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' };

const mountView = () => mount(CustomerPortalView, { global: { stubs: { RouterLink: RouterLinkStub } } });

describe('CustomerPortalView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockedSummary.mockResolvedValue(summary);
  });

  it('renders the five summary counters', async () => {
    mockedTickets.mockResolvedValue([portalTicket()]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="summary-total"]').text()).toBe('3');
    expect(wrapper.find('[data-testid="summary-open"]').text()).toBe('1');
    expect(wrapper.find('[data-testid="summary-pending"]').text()).toBe('1');
    expect(wrapper.find('[data-testid="summary-resolved"]').text()).toBe('1');
    expect(wrapper.find('[data-testid="summary-awaiting-feedback"]').text()).toBe('1');
  });

  it('renders one row per ticket', async () => {
    mockedTickets.mockResolvedValue([portalTicket(), portalTicket({ id: 2, subject: 'Billing query' })]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="portal-ticket-row"]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Billing query');
  });

  it('shows the empty state when the customer has no tickets', async () => {
    mockedTickets.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-empty"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="portal-tickets-table"]').exists()).toBe(false);
  });

  it('shows the recorded rating on a ticket that has been rated', async () => {
    mockedTickets.mockResolvedValue([
      portalTicket({ status: 'Resolved', feedback: { id: 9, rating: 5, createdAt: STAMP } })
    ]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-ticket-rating"]').text()).toBe('5/5');
    expect(wrapper.find('[data-testid="portal-leave-feedback-link"]').exists()).toBe(false);
  });

  it('invites feedback on a closed ticket that has not been rated', async () => {
    mockedTickets.mockResolvedValue([portalTicket({ status: 'Closed', feedback: null })]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-leave-feedback-link"]').exists()).toBe(true);
  });

  it('offers no feedback link while the ticket is still open', async () => {
    mockedTickets.mockResolvedValue([portalTicket({ status: 'In Progress' })]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-leave-feedback-link"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="portal-ticket-rating"]').exists()).toBe(false);
  });

  it('surfaces a load failure in the error banner', async () => {
    mockedSummary.mockRejectedValue(new Error('Unable to load your tickets'));
    mockedTickets.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-error"]').text()).toContain('Unable to load your tickets');
  });
});
