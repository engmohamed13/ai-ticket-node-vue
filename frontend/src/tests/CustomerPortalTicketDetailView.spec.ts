import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CustomerPortalTicketDetailView from '../views/CustomerPortalTicketDetailView.vue';
import { fetchTicketFeedback, submitTicketFeedback } from '../services/portal.service';
import { fetchTicket } from '../services/tickets.service';
import type { TicketDetail } from '../types';

vi.mock('../services/portal.service', () => ({
  fetchPortalSummary: vi.fn(),
  fetchPortalTickets: vi.fn(),
  fetchTicketFeedback: vi.fn(),
  submitTicketFeedback: vi.fn()
}));

vi.mock('../services/tickets.service', () => ({
  fetchTicket: vi.fn()
}));

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '1' } })
}));

const mockedFetchTicket = fetchTicket as unknown as ReturnType<typeof vi.fn>;
const mockedFeedback = fetchTicketFeedback as unknown as ReturnType<typeof vi.fn>;
const mockedSubmit = submitTicketFeedback as unknown as ReturnType<typeof vi.fn>;

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

const RouterLinkStub = { props: ['to'], template: '<a><slot /></a>' };

const mountView = () =>
  mount(CustomerPortalTicketDetailView, { global: { stubs: { RouterLink: RouterLinkStub } } });

describe('CustomerPortalTicketDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders the ticket details once loaded', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue(null);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-ticket-detail"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="portal-detail-status"]').text()).toBe('Resolved');
    expect(wrapper.text()).toContain('Cannot log in');
  });

  it('shows the not-found state when the ticket cannot be loaded', async () => {
    mockedFetchTicket.mockRejectedValue(new Error('Ticket 1 not found'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-detail-missing"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="portal-detail-error"]').text()).toContain('Ticket 1 not found');
  });

  it('offers the feedback form on a resolved, unrated ticket', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue(null);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-feedback-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="portal-feedback-summary"]').exists()).toBe(false);
  });

  it('locks feedback while the ticket is still open', async () => {
    mockedFetchTicket.mockResolvedValue(detail({ status: 'In Progress', resolvedAt: null }));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-feedback-locked"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="portal-feedback-form"]').exists()).toBe(false);
  });

  it('renders submitted feedback read-only instead of the form', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue({
      id: 9,
      rating: 4,
      comment: 'Quick and helpful',
      ticketId: 1,
      customerId: 10,
      createdAt: STAMP,
      updatedAt: STAMP
    });

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-feedback-rating"]').text()).toBe('4/5');
    expect(wrapper.text()).toContain('Quick and helpful');
    expect(wrapper.find('[data-testid="portal-feedback-form"]').exists()).toBe(false);
  });

  it('keeps the submit button disabled until a rating is picked', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue(null);

    const wrapper = mountView();
    await flushPromises();

    const button = wrapper.find('[data-testid="portal-submit-feedback-button"]');
    expect(button.attributes('disabled')).toBeDefined();

    await wrapper.find('[data-testid="portal-feedback-star-4"]').trigger('click');

    expect(wrapper.find('[data-testid="portal-submit-feedback-button"]').attributes('disabled')).toBeUndefined();
  });

  it('submits the picked rating and trimmed comment, then shows the result', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue(null);
    mockedSubmit.mockResolvedValue({
      id: 9,
      rating: 5,
      comment: 'Excellent',
      ticketId: 1,
      customerId: 10,
      createdAt: STAMP,
      updatedAt: STAMP
    });

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="portal-feedback-star-5"]').trigger('click');
    await wrapper.find('[data-testid="portal-feedback-comment-input"]').setValue('  Excellent  ');
    await wrapper.find('[data-testid="portal-feedback-form"]').trigger('submit');
    await flushPromises();

    expect(mockedSubmit).toHaveBeenCalledWith(1, { rating: 5, comment: 'Excellent' });
    expect(wrapper.find('[data-testid="portal-detail-notice"]').text()).toContain('Thank you');
    expect(wrapper.find('[data-testid="portal-feedback-summary"]').exists()).toBe(true);
  });

  it('omits an empty comment from the payload entirely', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue(null);
    mockedSubmit.mockResolvedValue({
      id: 9,
      rating: 3,
      comment: null,
      ticketId: 1,
      customerId: 10,
      createdAt: STAMP,
      updatedAt: STAMP
    });

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="portal-feedback-star-3"]').trigger('click');
    await wrapper.find('[data-testid="portal-feedback-form"]').trigger('submit');
    await flushPromises();

    expect(mockedSubmit).toHaveBeenCalledWith(1, { rating: 3, comment: undefined });
  });

  it('surfaces a duplicate submission without clearing the form', async () => {
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFeedback.mockResolvedValue(null);
    mockedSubmit.mockRejectedValue(new Error('Feedback has already been submitted for this ticket'));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="portal-feedback-star-2"]').trigger('click');
    await wrapper.find('[data-testid="portal-feedback-form"]').trigger('submit');
    await flushPromises();

    expect(wrapper.find('[data-testid="portal-detail-error"]').text()).toContain('already been submitted');
    expect(wrapper.find('[data-testid="portal-feedback-form"]').exists()).toBe(true);
  });
});
