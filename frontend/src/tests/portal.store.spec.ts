import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePortalStore } from '../stores/portal';
import {
  fetchPortalSummary,
  fetchPortalTickets,
  fetchTicketFeedback,
  submitTicketFeedback
} from '../services/portal.service';
import { fetchTicket } from '../services/tickets.service';
import type { PortalTicket, TicketDetail } from '../types';

vi.mock('../services/portal.service', () => ({
  fetchPortalSummary: vi.fn(),
  fetchPortalTickets: vi.fn(),
  fetchTicketFeedback: vi.fn(),
  submitTicketFeedback: vi.fn()
}));

vi.mock('../services/tickets.service', () => ({
  fetchTicket: vi.fn()
}));

const mockedSummary = fetchPortalSummary as unknown as ReturnType<typeof vi.fn>;
const mockedTickets = fetchPortalTickets as unknown as ReturnType<typeof vi.fn>;
const mockedFeedback = fetchTicketFeedback as unknown as ReturnType<typeof vi.fn>;
const mockedSubmit = submitTicketFeedback as unknown as ReturnType<typeof vi.fn>;
const mockedFetchTicket = fetchTicket as unknown as ReturnType<typeof vi.fn>;

const STAMP = '2026-08-26T10:00:00.000Z';

const detail = (overrides: Partial<TicketDetail> = {}): TicketDetail => ({
  id: 1,
  subject: 'Cannot log in',
  status: 'Resolved',
  priority: 'High',
  customerId: 10,
  categoryId: null,
  category: null,
  assignedToUserId: null,
  assignedTo: null,
  responseTimeMinutes: 30,
  resolutionTimeMinutes: 480,
  respondedAt: STAMP,
  resolvedAt: STAMP,
  createdAt: STAMP,
  updatedAt: STAMP,
  customer: { id: 10, name: 'Demo', email: 'demo@example.com' },
  comments: [],
  attachments: [],
  ...overrides
});

const portalTicket = (overrides: Partial<PortalTicket> = {}): PortalTicket => ({
  ...detail(),
  feedback: null,
  ...overrides
} as PortalTicket);

const summary = {
  totalTickets: 2,
  openTickets: 1,
  pendingTickets: 0,
  resolvedTickets: 1,
  awaitingFeedback: 1
};

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('loadDashboard', () => {
  it('populates the summary and the ticket list', async () => {
    mockedSummary.mockResolvedValue(summary);
    mockedTickets.mockResolvedValue([portalTicket()]);

    const store = usePortalStore();
    await store.loadDashboard();

    expect(store.summary).toEqual(summary);
    expect(store.tickets).toHaveLength(1);
    expect(store.hasTickets).toBe(true);
    expect(store.loading).toBe(false);
  });

  it('surfaces a failure in the error ref', async () => {
    mockedSummary.mockRejectedValue(new Error('Not a customer account'));
    mockedTickets.mockResolvedValue([]);

    const store = usePortalStore();
    await store.loadDashboard();

    expect(store.error).toBe('Not a customer account');
  });
});

describe('loadTicketDetail', () => {
  it('loads the ticket and its feedback for a resolved ticket', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue({ id: 3, rating: 5 });

    const store = usePortalStore();
    await store.loadTicketDetail(1);

    expect(store.selectedTicket?.id).toBe(1);
    expect(store.feedback).toEqual({ id: 3, rating: 5 });
  });

  it('skips the feedback request entirely while the ticket is still open', async () => {
    mockedFetchTicket.mockResolvedValue(detail({ status: 'In Progress' }));

    const store = usePortalStore();
    await store.loadTicketDetail(1);

    expect(mockedFeedback).not.toHaveBeenCalled();
    expect(store.feedback).toBeNull();
    expect(store.canLeaveFeedback).toBe(false);
  });

  it('clears the selection and records the error when the ticket cannot be loaded', async () => {
    mockedFetchTicket.mockRejectedValue(new Error('Ticket 99 not found'));

    const store = usePortalStore();
    await store.loadTicketDetail(99);

    expect(store.selectedTicket).toBeNull();
    expect(store.error).toBe('Ticket 99 not found');
  });

  it('offers feedback only on a closed ticket that has not been rated', async () => {
    mockedFetchTicket.mockResolvedValue(detail({ status: 'Closed' }));
    mockedFeedback.mockResolvedValue(null);

    const store = usePortalStore();
    await store.loadTicketDetail(1);

    expect(store.canLeaveFeedback).toBe(true);
  });
});

describe('submitFeedback', () => {
  it('stores the submitted feedback and decrements the awaiting counter', async () => {
    mockedSummary.mockResolvedValue(summary);
    mockedTickets.mockResolvedValue([portalTicket()]);
    mockedSubmit.mockResolvedValue({ id: 9, rating: 4, comment: 'Great', createdAt: STAMP });

    const store = usePortalStore();
    await store.loadDashboard();

    await expect(store.submitFeedback(1, 4, 'Great')).resolves.toBe(true);

    expect(store.feedback?.rating).toBe(4);
    expect(store.notice).toContain('Thank you');
    expect(store.tickets[0].feedback).toEqual({ id: 9, rating: 4, createdAt: STAMP });
    expect(store.summary?.awaitingFeedback).toBe(0);
  });

  it('returns false and surfaces a conflict without wiping existing state', async () => {
    mockedSubmit.mockRejectedValue(new Error('Feedback has already been submitted for this ticket'));

    const store = usePortalStore();
    await expect(store.submitFeedback(1, 5)).resolves.toBe(false);

    expect(store.error).toBe('Feedback has already been submitted for this ticket');
    expect(store.feedback).toBeNull();
    expect(store.submitting).toBe(false);
  });

  it('never drives the awaiting counter below zero', async () => {
    mockedSummary.mockResolvedValue({ ...summary, awaitingFeedback: 0 });
    mockedTickets.mockResolvedValue([]);
    mockedSubmit.mockResolvedValue({ id: 9, rating: 5, comment: null, createdAt: STAMP });

    const store = usePortalStore();
    await store.loadDashboard();
    await store.submitFeedback(1, 5);

    expect(store.summary?.awaitingFeedback).toBe(0);
  });
});
