import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TicketDetailView from '../views/TicketDetailView.vue';
import { useAuthStore } from '../stores/auth';
import {
  addTicketComment,
  assignTicket,
  fetchTicket,
  fetchTicketCategories,
  fetchTicketTimeline,
  updateTicket,
  uploadTicketAttachment
} from '../services/tickets.service';
import { fetchUsers } from '../services/users.service';
import type { TicketDetail } from '../types';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRoute: () => ({ params: { id: '1' } }) };
});

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

vi.mock('../services/users.service', () => ({
  fetchUsers: vi.fn(),
  fetchUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  changeUserPassword: vi.fn()
}));

const mockedFetchTicket = fetchTicket as unknown as ReturnType<typeof vi.fn>;
const mockedFetchTimeline = fetchTicketTimeline as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCategories = fetchTicketCategories as unknown as ReturnType<typeof vi.fn>;
const mockedUpdateTicket = updateTicket as unknown as ReturnType<typeof vi.fn>;
const mockedAssignTicket = assignTicket as unknown as ReturnType<typeof vi.fn>;
const mockedAddComment = addTicketComment as unknown as ReturnType<typeof vi.fn>;
const mockedUploadAttachment = uploadTicketAttachment as unknown as ReturnType<typeof vi.fn>;
const mockedFetchUsers = fetchUsers as unknown as ReturnType<typeof vi.fn>;

const CREATED = '2026-08-26T10:00:00.000Z';

const detail = (overrides: Partial<TicketDetail> = {}): TicketDetail => ({
  id: 1,
  subject: 'Cannot log in',
  status: 'Open',
  priority: 'High',
  customerId: 4,
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
  customer: { id: 4, name: 'Acme', email: 'acme@example.com' },
  comments: [],
  attachments: [],
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

const mountView = () => mount(TicketDetailView, { global: { stubs: { RouterLink: true } } });

describe('TicketDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedFetchCategories.mockResolvedValue([{ id: 2, name: 'Billing', color: null, createdAt: CREATED }]);
    mockedFetchTimeline.mockResolvedValue([]);
    mockedFetchUsers.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the ticket once loaded', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail());

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Cannot log in');
    expect(wrapper.find('[data-testid="sla-indicator"]').exists()).toBe(true);
  });

  it('shows the not-found state when the ticket is missing', async () => {
    signInAs(['tickets:read']);
    mockedFetchTicket.mockRejectedValue(new Error('Ticket not found'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="ticket-not-found"]').exists()).toBe(true);
  });

  it('exposes the workflow selects with tickets:manage', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail());

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="ticket-workflow-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ticket-status-select"]').exists()).toBe(true);
  });

  it('renders the workflow read-only without tickets:manage', async () => {
    signInAs(['tickets:read']);
    mockedFetchTicket.mockResolvedValue(detail());

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="ticket-workflow-readonly"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="ticket-status-select"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="add-comment-form"]').exists()).toBe(false);
  });

  it('patches the status when the select changes', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail());
    mockedUpdateTicket.mockResolvedValue(detail({ status: 'Resolved' }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="ticket-status-select"]').setValue('Resolved');
    await flushPromises();

    expect(mockedUpdateTicket).toHaveBeenCalledWith(1, { status: 'Resolved' });
  });

  it('sends null when the category is cleared', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail({ categoryId: 2 }));
    mockedUpdateTicket.mockResolvedValue(detail({ categoryId: null }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="ticket-category-select"]').setValue('');
    await flushPromises();

    expect(mockedUpdateTicket).toHaveBeenCalledWith(1, { categoryId: null });
  });

  it('assigns the ticket to the signed-in agent via Assign to me', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail({ assignedToUserId: null }));
    mockedAssignTicket.mockResolvedValue(detail({ assignedToUserId: 7 }));

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="claim-ticket-button"]').trigger('click');
    await flushPromises();

    expect(mockedAssignTicket).toHaveBeenCalledWith(1, 7);
  });

  it('hides Assign to me on an already assigned ticket', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(
      detail({ assignedToUserId: 9, assignedTo: { id: 9, name: 'Sam', email: 's@crm.local' } })
    );

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="claim-ticket-button"]').exists()).toBe(false);
  });

  it('adds a comment and clears the textarea', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail());
    mockedAddComment.mockResolvedValue({
      id: 5,
      body: 'Reproduced on staging',
      ticketId: 1,
      authorId: 7,
      author: { id: 7, name: 'Me' },
      createdAt: '2026-08-26T11:00:00.000Z'
    });

    const wrapper = mountView();
    await flushPromises();

    const textarea = wrapper.find('[data-testid="comment-body-input"]');
    await textarea.setValue('Reproduced on staging');
    await wrapper.find('[data-testid="add-comment-form"]').trigger('submit');
    await flushPromises();

    expect(mockedAddComment).toHaveBeenCalledWith(1, 'Reproduced on staging');
    expect((textarea.element as HTMLTextAreaElement).value).toBe('');
    expect(wrapper.findAll('[data-testid="timeline-comment"]')).toHaveLength(1);
  });

  it('does not post a blank comment', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail());

    const wrapper = mountView();
    await flushPromises();

    await wrapper.find('[data-testid="comment-body-input"]').setValue('   ');
    await wrapper.find('[data-testid="add-comment-form"]').trigger('submit');
    await flushPromises();

    expect(mockedAddComment).not.toHaveBeenCalled();
  });

  it('merges comments and interactions into one chronological timeline', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(
      detail({
        comments: [
          {
            id: 1,
            body: 'Internal note',
            ticketId: 1,
            authorId: 7,
            author: { id: 7, name: 'Me' },
            createdAt: '2026-08-26T12:00:00.000Z'
          }
        ]
      })
    );
    mockedFetchTimeline.mockResolvedValue([
      {
        id: 1,
        channel: 'EMAIL',
        direction: 'INBOUND',
        subject: 'Help',
        body: 'I cannot log in',
        externalRef: 'email-1',
        customerId: 4,
        ticketId: 1,
        occurredAt: '2026-08-26T11:00:00.000Z',
        createdAt: '2026-08-26T11:00:00.000Z'
      }
    ]);

    const wrapper = mountView();
    await flushPromises();

    const entries = wrapper.findAll('[data-testid="unified-timeline"] > li');
    expect(entries).toHaveLength(2);
    // The 11:00 interaction must sort ahead of the 12:00 comment.
    expect(entries[0].attributes('data-testid')).toBe('timeline-interaction');
    expect(entries[1].attributes('data-testid')).toBe('timeline-comment');
  });

  it('uploads an attachment and lists it', async () => {
    signInAs(['tickets:read', 'tickets:manage']);
    mockedFetchTicket.mockResolvedValue(detail());
    mockedUploadAttachment.mockResolvedValue({
      id: 3,
      fileName: 'log.txt',
      mimeType: 'text/plain',
      sizeBytes: 2048,
      ticketId: 1,
      uploadedById: 7,
      uploadedBy: { id: 7, name: 'Me' },
      createdAt: CREATED
    });

    const wrapper = mountView();
    await flushPromises();

    const input = wrapper.find('[data-testid="attachment-file-input"]');
    const file = new File(['log content'], 'log.txt', { type: 'text/plain' });
    Object.defineProperty(input.element, 'files', { value: [file], configurable: true });

    await wrapper.find('[data-testid="upload-attachment-button"]').trigger('click');
    await flushPromises();

    expect(mockedUploadAttachment).toHaveBeenCalledWith(1, file);
    expect(wrapper.findAll('[data-testid="attachment-item"]')).toHaveLength(1);
  });

  it('only offers assignable agents — no customers, no deactivated users', async () => {
    signInAs(['tickets:read', 'tickets:manage', 'users:read']);
    mockedFetchTicket.mockResolvedValue(detail());
    mockedFetchUsers.mockResolvedValue([
      { id: 7, name: 'Agent', isActive: true, roleKey: 'SUPPORT_AGENT' },
      { id: 8, name: 'Gone', isActive: false, roleKey: 'SUPPORT_AGENT' },
      { id: 9, name: 'Buyer', isActive: true, roleKey: 'CUSTOMER' }
    ]);

    const wrapper = mountView();
    await flushPromises();

    const options = wrapper.find('[data-testid="ticket-assignee-select"]').findAll('option');
    // "Unassigned" plus the one eligible agent.
    expect(options).toHaveLength(2);
    expect(options[1].text()).toBe('Agent');
  });
});
