import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TicketCommentsView from '../views/TicketCommentsView.vue';
import api from '../services/api';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (key === 'comments.discussion') {
        return `Discussion (${params?.count || 0})`;
      }
      return key;
    },
    locale: { value: 'en' }
  })
}));

const pushMock = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  }),
  useRoute: () => ({
    params: { id: '1' }
  })
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn()
  }
}));

describe('TicketCommentsView.vue Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render ticket details and comments list', async () => {
    const mockTicket = { id: 1, title: 'Comment Ticket', description: 'Desc text', status: 'Open', priority: 'Medium' };
    const mockComments = [
      { id: 101, ticketId: 1, content: 'First Comment', createdBy: 1, createdAt: '2026-08-12T12:00:00Z' }
    ];

    (api.get as any).mockImplementation((url: string) => {
      if (url.includes('/comments')) {
        return Promise.resolve({ data: { success: true, data: mockComments } });
      }
      return Promise.resolve({ data: { success: true, data: mockTicket } });
    });

    const wrapper = mount(TicketCommentsView);
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain('Comment Ticket');
    expect(wrapper.text()).toContain('First Comment');
  });

  it('should show "Start Work" button for Open ticket and trigger patch status api', async () => {
    const mockTicket = { id: 1, title: 'Comment Ticket', description: 'Desc text', status: 'Open', priority: 'Medium' };
    (api.get as any).mockResolvedValue({ data: { success: true, data: mockTicket } });

    const wrapper = mount(TicketCommentsView);
    await new Promise(resolve => setTimeout(resolve, 50));

    const startWorkBtn = wrapper.find('.btn-primary');
    expect(startWorkBtn.exists()).toBe(true);
    expect(startWorkBtn.text()).toContain('comments.startWorkBtn');

    await startWorkBtn.trigger('click');
    expect(api.patch).toHaveBeenCalledWith('/tickets/1/status', { status: 'In Progress' });
  });

  it('should show "Close Ticket" button for In Progress ticket and trigger patch status api', async () => {
    const mockTicket = { id: 1, title: 'Comment Ticket', description: 'Desc text', status: 'In Progress', priority: 'Medium' };
    (api.get as any).mockResolvedValue({ data: { success: true, data: mockTicket } });

    const wrapper = mount(TicketCommentsView);
    await new Promise(resolve => setTimeout(resolve, 50));

    const closeBtn = wrapper.find('.btn-success');
    expect(closeBtn.exists()).toBe(true);
    expect(closeBtn.text()).toContain('comments.closeTicketBtn');

    await closeBtn.trigger('click');
    expect(api.patch).toHaveBeenCalledWith('/tickets/1/status', { status: 'Closed' });
  });

  it('should show no status transition buttons for Closed ticket', async () => {
    const mockTicket = { id: 1, title: 'Comment Ticket', description: 'Desc text', status: 'Closed', priority: 'Medium' };
    (api.get as any).mockResolvedValue({ data: { success: true, data: mockTicket } });

    const wrapper = mount(TicketCommentsView);
    await new Promise(resolve => setTimeout(resolve, 50));

    const transitions = wrapper.find('.status-transitions');
    expect(transitions.exists()).toBe(false);
  });
});
