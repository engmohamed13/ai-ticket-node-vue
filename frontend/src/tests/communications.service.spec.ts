import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import { fetchCustomers, fetchTickets, fetchCustomerTimeline, createInteraction, associateInteraction } from '../services/communications.service';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = api.patch as unknown as ReturnType<typeof vi.fn>;

describe('fetchCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns customer array on success', async () => {
    const customers = [{ id: 1, name: 'John', email: 'john@example.com', phone: null, createdAt: '2026-08-25T00:00:00Z' }];
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: customers } });

    const result = await fetchCustomers();

    expect(result).toEqual(customers);
    expect(mockedGet).toHaveBeenCalledWith('/customers');
  });

  it('returns empty array when data is null', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Error', data: null } });

    const result = await fetchCustomers();

    expect(result).toEqual([]);
  });
});

describe('fetchTickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ticket array without customerId filter', async () => {
    const tickets = [{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }];
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: tickets } });

    const result = await fetchTickets();

    expect(result).toEqual(tickets);
    expect(mockedGet).toHaveBeenCalledWith('/tickets', { params: undefined });
  });

  it('passes customerId param when provided', async () => {
    const tickets = [{ id: 1, subject: 'Test', status: 'Open', customerId: 1, createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }];
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: tickets } });

    await fetchTickets(1);

    expect(mockedGet).toHaveBeenCalledWith('/tickets', { params: { customerId: 1 } });
  });
});

describe('fetchCustomerTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns interactions for a customer', async () => {
    const interactions = [{ id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hi', externalRef: 'email-123', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' }];
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: interactions } });

    const result = await fetchCustomerTimeline(1);

    expect(result).toEqual(interactions);
    expect(mockedGet).toHaveBeenCalledWith('/customers/1/timeline');
  });
});

describe('createInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an interaction and returns it', async () => {
    const interaction = { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hello', externalRef: 'email-uuid', customerId: 1, ticketId: null, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' };
    mockedPost.mockResolvedValue({ data: { success: true, message: 'OK', data: interaction } });

    const result = await createInteraction({ channel: 'EMAIL', direction: 'INBOUND', customerId: 1, body: 'hello' });

    expect(result).toEqual(interaction);
  });

  it('throws when response data is null', async () => {
    mockedPost.mockResolvedValue({ data: { success: false, message: 'Error', data: null } });

    await expect(createInteraction({ channel: 'EMAIL', direction: 'INBOUND', customerId: 1, body: 'hello' })).rejects.toThrow('Error');
  });
});

describe('associateInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('associates interaction with ticket', async () => {
    const interaction = { id: 1, channel: 'EMAIL', direction: 'INBOUND', subject: null, body: 'hello', externalRef: 'email-uuid', customerId: 1, ticketId: 1, occurredAt: '2026-08-25T00:00:00Z', createdAt: '2026-08-25T00:00:00Z' };
    mockedPatch.mockResolvedValue({ data: { success: true, message: 'OK', data: interaction } });

    const result = await associateInteraction(1, 1);

    expect(result).toEqual(interaction);
    expect(mockedPatch).toHaveBeenCalledWith('/interactions/1/associate', { ticketId: 1 });
  });
});
