import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import {
  fetchPortalSummary,
  fetchPortalTickets,
  fetchTicketFeedback,
  submitTicketFeedback
} from '../services/portal.service';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;

const envelope = <T>(data: T, message = 'OK') => ({ data: { success: true, message, data } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchPortalSummary', () => {
  it('reads the portal summary endpoint', async () => {
    const summary = {
      totalTickets: 2,
      openTickets: 1,
      pendingTickets: 0,
      resolvedTickets: 1,
      awaitingFeedback: 1
    };
    mockedGet.mockResolvedValue(envelope(summary));

    await expect(fetchPortalSummary()).resolves.toEqual(summary);
    expect(mockedGet).toHaveBeenCalledWith('/customers/portal/summary');
  });

  it('throws the API message when the envelope carries no data', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Not a customer', data: null } });

    await expect(fetchPortalSummary()).rejects.toThrow('Not a customer');
  });
});

describe('fetchPortalTickets', () => {
  it('reads the portal ticket list', async () => {
    mockedGet.mockResolvedValue(envelope([{ id: 1 }]));

    await expect(fetchPortalTickets()).resolves.toEqual([{ id: 1 }]);
    expect(mockedGet).toHaveBeenCalledWith('/customers/portal/tickets');
  });

  it('falls back to an empty list when data is null', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchPortalTickets()).resolves.toEqual([]);
  });
});

describe('fetchTicketFeedback', () => {
  it('reads the feedback sub-resource of a ticket', async () => {
    mockedGet.mockResolvedValue(envelope({ id: 3, rating: 5 }));

    await expect(fetchTicketFeedback(7)).resolves.toEqual({ id: 3, rating: 5 });
    expect(mockedGet).toHaveBeenCalledWith('/tickets/7/feedback');
  });

  it('returns null rather than throwing when the ticket has not been rated', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchTicketFeedback(7)).resolves.toBeNull();
  });
});

describe('submitTicketFeedback', () => {
  it('posts the rating and comment', async () => {
    mockedPost.mockResolvedValue(envelope({ id: 3, rating: 4, comment: 'Great' }));

    await submitTicketFeedback(7, { rating: 4, comment: 'Great' });

    expect(mockedPost).toHaveBeenCalledWith('/tickets/7/feedback', { rating: 4, comment: 'Great' });
  });

  it('throws the API message when the submission returns no data', async () => {
    mockedPost.mockResolvedValue({
      data: { success: false, message: 'Feedback has already been submitted for this ticket', data: null }
    });

    await expect(submitTicketFeedback(7, { rating: 4 })).rejects.toThrow(
      'Feedback has already been submitted for this ticket'
    );
  });
});
