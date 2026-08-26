import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useTicketsStore } from '../stores/tickets';
import { useNotificationsStore } from '../stores/notifications';
import { useAuthStore } from '../stores/auth';
import { fetchTicketCategories, fetchTickets } from '../services/tickets.service';
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

const mockedFetchTickets = fetchTickets as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCategories = fetchTicketCategories as unknown as ReturnType<typeof vi.fn>;

const CREATED = '2026-08-26T10:00:00.000Z';

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
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
  createdAt: CREATED,
  updatedAt: CREATED,
  ...overrides
});

const signInAs = (id: number): void => {
  const auth = useAuthStore();
  auth.token = 'jwt';
  auth.user = {
    id,
    name: 'Me',
    email: 'me@crm.local',
    isActive: true,
    roleKey: 'SUPPORT_AGENT',
    roleName: 'Support Agent',
    permissions: ['tickets:read', 'tickets:manage'] as never,
    customerId: null,
    department: null,
    branch: null
  };
};

describe('tickets store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockedFetchCategories.mockResolvedValue([]);
  });

  it('requests assignedToMe for the My Tickets scope', async () => {
    signInAs(7);
    mockedFetchTickets.mockResolvedValue([]);
    const store = useTicketsStore();

    await store.setScope('mine');

    expect(mockedFetchTickets).toHaveBeenCalledWith({ assignedToMe: true });
  });

  it('requests unassigned for the Unassigned scope', async () => {
    mockedFetchTickets.mockResolvedValue([]);
    const store = useTicketsStore();

    await store.setScope('unassigned');

    expect(mockedFetchTickets).toHaveBeenCalledWith({ unassigned: true });
  });

  it('narrows the Open scope to actively worked statuses client-side', async () => {
    mockedFetchTickets.mockResolvedValue([
      ticket({ id: 1, status: 'New' }),
      ticket({ id: 2, status: 'In Progress' }),
      ticket({ id: 3, status: 'Pending' }),
      ticket({ id: 4, status: 'Closed' })
    ]);
    const store = useTicketsStore();

    await store.setScope('open');

    expect(store.visibleTickets.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it('applies the secondary priority filter on top of the scope', async () => {
    mockedFetchTickets.mockResolvedValue([
      ticket({ id: 1, priority: 'Urgent' }),
      ticket({ id: 2, priority: 'Low' })
    ]);
    const store = useTicketsStore();
    await store.loadTickets();

    store.priorityFilter = 'Urgent';

    expect(store.visibleTickets.map((entry) => entry.id)).toEqual([1]);
  });

  it('counts overdue and unassigned tickets', async () => {
    mockedFetchTickets.mockResolvedValue([
      // Created in 2026 with a 30-minute response target and never answered.
      ticket({ id: 1, assignedToUserId: null }),
      ticket({ id: 2, assignedToUserId: 7, status: 'Closed' })
    ]);
    const store = useTicketsStore();
    await store.loadTickets();

    expect(store.counts.total).toBe(2);
    expect(store.counts.overdue).toBe(1);
    expect(store.counts.unassigned).toBe(1);
  });

  it('raises no notification on the first, non-silent load', async () => {
    signInAs(7);
    mockedFetchTickets.mockResolvedValue([ticket({ id: 1, assignedToUserId: 7 })]);
    const store = useTicketsStore();
    const notifications = useNotificationsStore();

    await store.loadTickets();

    expect(notifications.items).toHaveLength(0);
  });

  it('notifies when a background poll shows a ticket newly assigned to me', async () => {
    signInAs(7);
    const store = useTicketsStore();
    const notifications = useNotificationsStore();

    mockedFetchTickets.mockResolvedValue([ticket({ id: 1, assignedToUserId: null })]);
    await store.loadTickets();

    mockedFetchTickets.mockResolvedValue([ticket({ id: 1, assignedToUserId: 7 })]);
    await store.loadTickets({ silent: true });

    expect(notifications.items).toHaveLength(1);
    expect(notifications.items[0]).toMatchObject({ kind: 'assignment', ticketId: 1 });
    expect(notifications.items[0].message).toContain('assigned to you');
  });

  it('notifies when a background poll shows a status change', async () => {
    signInAs(7);
    const store = useTicketsStore();
    const notifications = useNotificationsStore();

    mockedFetchTickets.mockResolvedValue([ticket({ id: 1, status: 'Open' })]);
    await store.loadTickets();

    mockedFetchTickets.mockResolvedValue([ticket({ id: 1, status: 'Resolved' })]);
    await store.loadTickets({ silent: true });

    expect(notifications.items).toHaveLength(1);
    expect(notifications.items[0]).toMatchObject({ kind: 'status' });
    expect(notifications.items[0].message).toContain('Resolved');
  });

  it('does not announce a ticket it is seeing for the first time on a poll', async () => {
    signInAs(7);
    const store = useTicketsStore();
    const notifications = useNotificationsStore();

    mockedFetchTickets.mockResolvedValue([ticket({ id: 1 })]);
    await store.loadTickets();

    mockedFetchTickets.mockResolvedValue([ticket({ id: 1 }), ticket({ id: 2, status: 'Pending' })]);
    await store.loadTickets({ silent: true });

    expect(notifications.items).toHaveLength(0);
  });

  it('keeps the visible list when a background poll fails', async () => {
    mockedFetchTickets.mockResolvedValue([ticket({ id: 1 })]);
    const store = useTicketsStore();
    await store.loadTickets();

    mockedFetchTickets.mockRejectedValue(new Error('network down'));
    await store.loadTickets({ silent: true });

    expect(store.tickets).toHaveLength(1);
    expect(store.error).toBe('network down');
  });

  it('clears the list when a foreground load fails', async () => {
    mockedFetchTickets.mockResolvedValue([ticket({ id: 1 })]);
    const store = useTicketsStore();
    await store.loadTickets();

    mockedFetchTickets.mockRejectedValue(new Error('network down'));
    await store.loadTickets();

    expect(store.tickets).toHaveLength(0);
  });
});
