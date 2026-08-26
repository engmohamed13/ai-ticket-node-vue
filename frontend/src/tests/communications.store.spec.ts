import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useCommunicationsStore } from '../stores/communications';
import { fetchCustomers, fetchTickets, fetchCustomerTimeline, createInteraction, associateInteraction } from '../services/communications.service';
import type { Ticket } from '../types';

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
const mockedAssociateInteraction = associateInteraction as unknown as ReturnType<typeof vi.fn>;

/** Ticket grew workflow/SLA fields in Story 13; this keeps the inline fixtures complete. */
const ticketFixture = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: 1,
  subject: 'Test',
  status: 'Open',
  priority: 'Medium',
  customerId: 1,
  categoryId: null,
  category: null,
  assignedToUserId: null,
  assignedTo: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: null,
  resolvedAt: null,
  createdAt: '2026-08-25T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z',
  ...overrides
});

describe('useCommunicationsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads customers', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    mockedFetchCustomers.mockResolvedValue(customers);

    const store = useCommunicationsStore();
    await store.loadCustomers();

    expect(store.customers).toEqual(customers);
  });

  it('selects customer and loads tickets and timeline', async () => {
    const tickets = [{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }];
    const interactions = [{ id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' }];

    mockedFetchTickets.mockResolvedValue(tickets);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const store = useCommunicationsStore();
    await store.selectCustomer(1);

    expect(store.selectedCustomerId).toBe(1);
    expect(store.tickets).toEqual(tickets);
    expect(store.timeline).toEqual(interactions);
    expect(store.loading).toBe(false);
  });

  it('filters tickets by selected customer', async () => {
    const store = useCommunicationsStore();
    store.tickets = [
      ticketFixture({ id: 1, subject: 'Test 1', customerId: 1 }),
      ticketFixture({ id: 2, subject: 'Test 2', customerId: 2 })
    ];
    store.selectedCustomerId = 1;

    expect(store.ticketsForSelectedCustomer).toHaveLength(1);
    expect(store.ticketsForSelectedCustomer[0].id).toBe(1);
  });

  it('submits interaction and refreshes timeline', async () => {
    const interaction = { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hello', externalRef: 'email-uuid', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' };
    const interactions = [interaction];

    mockedCreateInteraction.mockResolvedValue(interaction);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const store = useCommunicationsStore();
    store.selectedCustomerId = 1;

    await store.submitInteraction({ channel: 'EMAIL', direction: 'INBOUND', customerId: 1, body: 'hello' });

    expect(store.timeline).toEqual(interactions);
    expect(store.error).toBeNull();
  });

  it('sets error when submit fails', async () => {
    mockedCreateInteraction.mockRejectedValue(new Error('Network error'));

    const store = useCommunicationsStore();
    store.selectedCustomerId = 1;

    await store.submitInteraction({ channel: 'EMAIL', direction: 'INBOUND', customerId: 1, body: 'hello' });

    expect(store.error).toBe('Network error');
  });

  it('associates interaction with ticket', async () => {
    const interaction = { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hello', externalRef: 'email-uuid', customerId: 1, ticketId: 1, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' };
    const interactions = [interaction];

    mockedAssociateInteraction.mockResolvedValue(interaction);
    mockedFetchCustomerTimeline.mockResolvedValue(interactions);

    const store = useCommunicationsStore();
    store.selectedCustomerId = 1;

    await store.associate(1, 1);

    expect(store.timeline).toEqual(interactions);
  });
});
