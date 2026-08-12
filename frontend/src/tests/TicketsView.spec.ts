import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import TicketsView from '../views/TicketsView.vue';
import api from '../services/api';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (key === 'tickets.showingFilter') {
        return `Showing: ${params?.filter || ''}`;
      }
      return key;
    },
    locale: { value: 'en' }
  })
}));

const pushMock = vi.fn();
let queryMock = {};
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock
  }),
  useRoute: () => ({
    query: queryMock
  })
}));

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn()
  }
}));

describe('TicketsView.vue Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryMock = {};
  });

  it('should render loading state initially', async () => {
    (api.get as any).mockReturnValue(new Promise(() => {}));
    const wrapper = mount(TicketsView);
    expect(wrapper.text()).toContain('tickets.loadingTickets');
  });

  it('should render empty state when no tickets are returned', async () => {
    (api.get as any).mockResolvedValue({ data: { success: true, data: [] } });
    const wrapper = mount(TicketsView);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(wrapper.text()).toContain('tickets.noTicketsTitle');
  });

  it('should render ticket list when tickets are returned', async () => {
    const mockTickets = [
      { id: 1, title: 'First Ticket', description: 'Description 1', status: 'Open', priority: 'Medium', createdAt: '2026-08-12T12:00:00Z' },
      { id: 2, title: 'Second Ticket', description: 'Description 2', status: 'Closed', priority: 'High', createdAt: '2026-08-12T13:00:00Z' }
    ];
    (api.get as any).mockResolvedValue({ data: { success: true, data: mockTickets } });
    const wrapper = mount(TicketsView);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(wrapper.text()).toContain('First Ticket');
    expect(wrapper.text()).toContain('Second Ticket');
  });

  it('should trigger search api call on typing search query', async () => {
    (api.get as any).mockResolvedValue({ data: { success: true, data: [] } });
    const wrapper = mount(TicketsView);
    await new Promise(resolve => setTimeout(resolve, 50));

    const searchInput = wrapper.find('#search-input');
    await searchInput.setValue('test search');
    await searchInput.trigger('input');

    await new Promise(resolve => setTimeout(resolve, 350));

    expect(api.get).toHaveBeenCalledWith('/tickets', { params: { search: 'test search' } });
  });

  it('should render error state when api fails', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    const wrapper = mount(TicketsView);
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(wrapper.text()).toContain('tickets.failedTickets');
  });
});
