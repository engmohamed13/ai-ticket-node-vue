import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TicketsView from '../views/TicketsView.vue';
import { useAuthStore } from '../stores/auth';
import { createTicket, fetchTicketCategories, fetchTickets } from '../services/tickets.service';
import { fetchCustomers } from '../services/customers.service';
import type { Ticket } from '../types';

vi.mock('../services/tickets.service', () => ({
  fetchTickets: vi.fn(),
  fetchTicket: vi.fn(),
  fetchTicketCategories: vi.fn(),
  createTicket: vi.fn(),
  updateTicket: vi.fn(),
  assignTicket: vi.fn(),
  fetchTicketTimeline: vi.fn(),
  addTicketComment: vi.fn(),
  uploadTicketAttachment: vi.fn(),
  deleteTicketAttachment: vi.fn(),
  downloadTicketAttachment: vi.fn()
}));

vi.mock('../services/customers.service', () => ({
  fetchCustomers: vi.fn(),
  fetchCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  fetchCustomerTickets: vi.fn(),
  fetchCustomerTimeline: vi.fn(),
  fetchCustomerNotes: vi.fn(),
  addCustomerNote: vi.fn(),
  fetchCustomerAttachments: vi.fn(),
  uploadCustomerAttachment: vi.fn(),
  deleteCustomerAttachment: vi.fn(),
  downloadCustomerAttachment: vi.fn()
}));

const mockedFetchTickets = fetchTickets as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCategories = fetchTicketCategories as unknown as ReturnType<typeof vi.fn>;
const mockedCreateTicket = createTicket as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomers = fetchCustomers as unknown as ReturnType<typeof vi.fn>;

const CREATED = '2026-08-26T10:00:00.000Z';

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  subject: 'Cannot log in',
  status: 'Open',
  priority: 'High',
  customerId: 1,
  categoryId: null,
  category: null,
  assignedToUserId: null,
  assignedTo: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: null,
  resolvedAt: null,
  createdAt: CREATED,
  updatedAt: CREATED,
  ...overrides
});

const signInAs = (permissions: string[]): void => {
  const auth = useAuthStore();
  auth.token = 'jwt';
  auth.user = {
    id: 7,
    name: 'Me',
    email: 'me@crm.local',
    isActive: true,
    roleKey: 'SUPPORT_AGENT',
    roleName: 'Support Agent',
    permissions: permissions as never,
    customerId: null,
    department: null,
    branch: null
  };
};

// A slot-rendering RouterLink stub, not `true`: the ticket subject lives inside the link,
// and the default stub would swallow it.
const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' };

const mountView = () => mount(TicketsView, { global: { stubs: { RouterLink: RouterLinkStub } } });

describe('TicketsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedFetchCategories.mockResolvedValue([{ id: 1, name: 'Billing', color: null, createdAt: CREATED }]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the ticket queue after loading', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTickets.mockResolvedValue([ticket()]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="tickets-table"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="ticket-row"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Cannot log in');
  });

  it('shows the empty state when the queue has nothing in it', async () => {
    signInAs(['tickets:read']);
    mockedFetchTickets.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="tickets-empty"]').exists()).toBe(true);
  });

  it('surfaces a load failure in the error banner', async () => {
    signInAs(['tickets:read']);
    mockedFetchTickets.mockRejectedValue(new Error('Unable to load tickets'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="tickets-error"]').text()).toContain('Unable to load tickets');
  });

  it('hides the new-ticket button without tickets:manage', async () => {
    signInAs(['tickets:read']);
    mockedFetchTickets.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="new-ticket-button"]').exists()).toBe(false);
  });

  it('shows the new-ticket button with tickets:manage', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTickets.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="new-ticket-button"]').exists()).toBe(true);
  });

  it('refetches with assignedToMe when the My Tickets tab is selected', async () => {
    signInAs(['tickets:read']);
    mockedFetchTickets.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();
    mockedFetchTickets.mockClear();

    await wrapper.find('[data-testid="scope-tab-mine"]').trigger('click');
    await flushPromises();

    expect(mockedFetchTickets).toHaveBeenCalledWith({ assignedToMe: true });
  });

  it('creates a ticket from the inline form', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTickets.mockResolvedValue([]);
    mockedFetchCustomers.mockResolvedValue([
      { id: 3, name: 'Acme', email: 'acme@example.com', status: 'ACTIVE' }
    ]);
    mockedCreateTicket.mockResolvedValue(ticket({ id: 12, subject: 'Printer offline' }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="new-ticket-button"]').trigger('click');
    await flushPromises();

    await wrapper.find('[data-testid="new-ticket-subject-input"]').setValue('Printer offline');
    await wrapper.find('[data-testid="new-ticket-customer-select"]').setValue(3);
    await wrapper.find('[data-testid="create-ticket-form"]').trigger('submit');
    await flushPromises();

    expect(mockedCreateTicket).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Printer offline', customerId: 3, priority: 'Medium' })
    );
    expect(wrapper.find('[data-testid="tickets-notice"]').text()).toContain('#12');
  });

  it('does not submit the create form without a customer', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTickets.mockResolvedValue([]);
    mockedFetchCustomers.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="new-ticket-button"]').trigger('click');
    await flushPromises();
    await wrapper.find('[data-testid="new-ticket-subject-input"]').setValue('No customer picked');
    await wrapper.find('[data-testid="create-ticket-form"]').trigger('submit');
    await flushPromises();

    expect(mockedCreateTicket).not.toHaveBeenCalled();
  });

  it('offers Claim only on unassigned tickets', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTickets.mockResolvedValue([
      ticket({ id: 1, assignedToUserId: null }),
      ticket({ id: 2, assignedToUserId: 9, assignedTo: { id: 9, name: 'Sam', email: 's@crm.local' } })
    ]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('[data-testid="claim-ticket-button"]')).toHaveLength(1);
  });

  it('filters the visible rows by priority', async () => {
    signInAs(['tickets:read']);
    mockedFetchTickets.mockResolvedValue([
      ticket({ id: 1, priority: 'Urgent' }),
      ticket({ id: 2, priority: 'Low' })
    ]);

    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll('[data-testid="ticket-row"]')).toHaveLength(2);

    await wrapper.find('[data-testid="filter-priority-select"]').setValue('Urgent');
    await flushPromises();

    expect(wrapper.findAll('[data-testid="ticket-row"]')).toHaveLength(1);
  });
});
