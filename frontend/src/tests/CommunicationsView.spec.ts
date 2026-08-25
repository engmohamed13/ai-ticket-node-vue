import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CommunicationsView from '../views/CommunicationsView.vue';
import { fetchCustomers, fetchTickets, fetchCustomerTimeline, createInteraction } from '../services/communications.service';

vi.mock('../services/communications.service', () => ({
  fetchCustomers: vi.fn(),
  fetchTickets: vi.fn(),
  fetchCustomerTimeline: vi.fn(),
  createInteraction: vi.fn(),
  associateInteraction: vi.fn()
}));

const mockedFetchCustomers = fetchCustomers as unknown as ReturnType<typeof vi.fn>;
const mockedFetchTickets = fetchTickets as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerTimeline = fetchCustomerTimeline as unknown as ReturnType<typeof vi.fn>;
const mockedCreateInteraction = createInteraction as unknown as ReturnType<typeof vi.fn>;

describe('CommunicationsView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads customers and selects first on mount', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    const tickets = [{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }];
    const interactions = [{ id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' }];

    mockedFetchCustomers.mockResolvedValue(customers);
    mockedFetchTickets.mockResolvedValue(tickets);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const wrapper = mount(CommunicationsView);
    await flushPromises();

    expect(wrapper.find('[data-testid="customer-select"] option').exists()).toBe(true);
  });

  it('renders timeline items with channels', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    const interactions = [
      { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'email msg', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' },
      { id: 2, channel: 'WHATSAPP', direction: 'OUTBOUND', subject: null, body: 'whatsapp msg', externalRef: 'wa-456', customerId: 1, ticketId: null, occurredAt: '2026-08-25T01:00:00Z', createdAt: '2026-08-25T01:00:00Z' }
    ];

    mockedFetchCustomers.mockResolvedValue(customers);
    mockedFetchTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const wrapper = mount(CommunicationsView);
    await flushPromises();

    const items = wrapper.findAll('[data-testid="timeline-item"]');
    expect(items).toHaveLength(2);
    expect(items[0].text()).toContain('EMAIL');
    expect(items[1].text()).toContain('WHATSAPP');
  });

  it('shows associate controls for unassociated interactions', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    const interactions = [{ id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' }];

    mockedFetchCustomers.mockResolvedValue(customers);
    mockedFetchTickets.mockResolvedValue([{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }]);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const wrapper = mount(CommunicationsView);
    await flushPromises();

    expect(wrapper.find('[data-testid="associate-select"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="associate-button"]').exists()).toBe(true);
  });

  it('shows ticket link for associated interactions', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    const interactions = [{ id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: 1, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' }];

    mockedFetchCustomers.mockResolvedValue(customers);
    mockedFetchTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const wrapper = mount(CommunicationsView);
    await flushPromises();

    expect(wrapper.find('[data-testid="timeline-ticket-link"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="timeline-ticket-link"]').text()).toContain('Ticket #1');
  });

  it('creates interaction when form is submitted', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    const newInteraction = { id: 2, channel: 'EMAIL', direction: 'INBOUND', subject: 'test', body: 'new message', externalRef: 'email-new', customerId: 1, ticketId: null, occurredAt: '2026-08-25T02:00:00Z', createdAt: '2026-08-25T02:00:00Z' };

    mockedFetchCustomers.mockResolvedValue(customers);
    mockedFetchTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValueOnce([]);
    mockedCreateInteraction.mockResolvedValue(newInteraction);
    mockedFetchCustomerTimeline.mockResolvedValueOnce([newInteraction]);

    const wrapper = mount(CommunicationsView);
    await flushPromises();

    await wrapper.find('[data-testid="body-input"]').setValue('new message');
    await wrapper.find('[data-testid="interaction-form"]').trigger('submit');
    await flushPromises();

    expect(mockedCreateInteraction).toHaveBeenCalled();
  });

  it('displays error when service fails', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];

    mockedFetchCustomers.mockResolvedValue(customers);
    mockedFetchTickets.mockRejectedValue(new Error('Load failed'));
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const wrapper = mount(CommunicationsView);
    await flushPromises();

    expect(wrapper.find('[data-testid="communications-error"]').exists()).toBe(true);
  });
});
