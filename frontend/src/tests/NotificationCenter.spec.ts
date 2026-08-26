import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import NotificationCenter from '../components/NotificationCenter.vue';
import NotificationToasts from '../components/NotificationToasts.vue';
import { useNotificationsStore } from '../stores/notifications';
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notifications.service';
import type { AppNotification } from '../types';

vi.mock('../services/notifications.service', () => ({
  fetchNotifications: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
  dismissNotification: vi.fn()
}));

const push = vi.fn();
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

const mockedFetch = fetchNotifications as unknown as ReturnType<typeof vi.fn>;
const mockedMarkRead = markNotificationRead as unknown as ReturnType<typeof vi.fn>;
const mockedMarkAll = markAllNotificationsRead as unknown as ReturnType<typeof vi.fn>;
const mockedDismiss = dismissNotification as unknown as ReturnType<typeof vi.fn>;

const STAMP = '2026-08-26T10:00:00.000Z';

const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: 1,
  userId: 7,
  type: 'ticket_assigned',
  title: 'Ticket #1 was assigned to you',
  message: 'Cannot log in',
  isRead: false,
  relatedTicketId: 1,
  relatedCustomerId: 10,
  relatedFeedbackId: null,
  createdAt: STAMP,
  ...overrides
});

const inbox = (items: AppNotification[]) => ({
  items,
  unreadCount: items.filter((entry) => !entry.isRead).length
});

/** Seeds the store, then opens the panel. */
const openPanel = async (items: AppNotification[]) => {
  mockedFetch.mockResolvedValue(inbox(items));
  const store = useNotificationsStore();
  await store.load();

  const wrapper = mount(NotificationCenter);
  await wrapper.find('[data-testid="notification-bell"]').trigger('click');
  await flushPromises();
  return wrapper;
};

describe('NotificationCenter', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows the unread badge, capped at 9+', async () => {
    mockedFetch.mockResolvedValue(inbox(Array.from({ length: 12 }, (_, i) => notification({ id: i + 1 }))));
    const store = useNotificationsStore();
    await store.load();

    const wrapper = mount(NotificationCenter);

    expect(wrapper.find('[data-testid="notification-badge"]').text()).toBe('9+');
  });

  it('hides the badge when nothing is unread', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ isRead: true })]));
    const store = useNotificationsStore();
    await store.load();

    const wrapper = mount(NotificationCenter);

    expect(wrapper.find('[data-testid="notification-badge"]').exists()).toBe(false);
  });

  it('opens and closes the panel from the bell', async () => {
    mockedFetch.mockResolvedValue(inbox([notification()]));
    const store = useNotificationsStore();
    await store.load();

    const wrapper = mount(NotificationCenter);
    expect(wrapper.find('[data-testid="notification-panel"]').exists()).toBe(false);

    await wrapper.find('[data-testid="notification-bell"]').trigger('click');
    expect(wrapper.find('[data-testid="notification-panel"]').exists()).toBe(true);

    await wrapper.find('[data-testid="notification-bell"]').trigger('click');
    expect(wrapper.find('[data-testid="notification-panel"]').exists()).toBe(false);
  });

  it('lists every notification, read and unread', async () => {
    const wrapper = await openPanel([notification(), notification({ id: 2, isRead: true })]);

    expect(wrapper.findAll('[data-testid="notification-item"]')).toHaveLength(2);
  });

  it('narrows to unread when the filter is ticked', async () => {
    const wrapper = await openPanel([notification(), notification({ id: 2, isRead: true })]);

    await wrapper.find('[data-testid="notification-unread-filter"]').setValue(true);

    expect(wrapper.findAll('[data-testid="notification-item"]')).toHaveLength(1);
  });

  it('shows an empty state when the filter matches nothing', async () => {
    const wrapper = await openPanel([notification({ isRead: true })]);

    await wrapper.find('[data-testid="notification-unread-filter"]').setValue(true);

    expect(wrapper.find('[data-testid="notification-empty"]').exists()).toBe(true);
  });

  it('marks one notification read from the panel', async () => {
    mockedMarkRead.mockResolvedValue(notification({ isRead: true }));
    const wrapper = await openPanel([notification()]);

    await wrapper.find('[data-testid="notification-mark-read-button"]').trigger('click');
    await flushPromises();

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
  });

  it('marks everything read from the header button', async () => {
    mockedMarkAll.mockResolvedValue(1);
    const wrapper = await openPanel([notification()]);

    await wrapper.find('[data-testid="mark-all-read-button"]').trigger('click');
    await flushPromises();

    expect(mockedMarkAll).toHaveBeenCalled();
  });

  it('dismisses a notification permanently', async () => {
    const wrapper = await openPanel([notification()]);

    await wrapper.find('[data-testid="notification-delete-button"]').trigger('click');
    await flushPromises();

    expect(mockedDismiss).toHaveBeenCalledWith(1);
  });

  it('opens the related ticket and marks the notification read', async () => {
    mockedMarkRead.mockResolvedValue(notification({ isRead: true }));
    const wrapper = await openPanel([notification()]);

    await wrapper.find('[data-testid="notification-open-button"]').trigger('click');
    await flushPromises();

    expect(mockedMarkRead).toHaveBeenCalledWith(1);
    expect(push).toHaveBeenCalledWith({ name: 'ticket-detail', params: { id: 1 } });
  });

  it('offers no open button for a notification with no ticket', async () => {
    const wrapper = await openPanel([notification({ relatedTicketId: null })]);

    expect(wrapper.find('[data-testid="notification-open-button"]').exists()).toBe(false);
  });
});

describe('NotificationToasts', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders nothing on the first load, however full the inbox is', async () => {
    mockedFetch.mockResolvedValue(inbox([notification(), notification({ id: 2 })]));
    const store = useNotificationsStore();
    await store.load();

    const wrapper = mount(NotificationToasts);

    expect(wrapper.find('[data-testid="notification-toasts"]').exists()).toBe(false);
  });

  it('renders a toast for a notification that arrives on a later poll', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(inbox([notification({ id: 2 }), notification({ id: 1 })]));
    await store.load({ silent: true });

    const wrapper = mount(NotificationToasts);

    expect(wrapper.findAll('[data-testid="notification-toast"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('Ticket #1 was assigned to you');
  });

  it('hides a dismissed toast without deleting the notification', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(inbox([notification({ id: 2 }), notification({ id: 1 })]));
    await store.load({ silent: true });

    const wrapper = mount(NotificationToasts);
    await wrapper.find('[data-testid="dismiss-notification-button"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="notification-toast"]').exists()).toBe(false);
    expect(mockedDismiss).not.toHaveBeenCalled();
    expect(store.items).toHaveLength(2);
  });

  it('opens the related ticket from a toast', async () => {
    mockedMarkRead.mockResolvedValue(notification({ id: 2, isRead: true }));
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(inbox([notification({ id: 2, relatedTicketId: 5 }), notification({ id: 1 })]));
    await store.load({ silent: true });

    const wrapper = mount(NotificationToasts);
    await wrapper.find('[data-testid="open-notification-button"]').trigger('click');
    await flushPromises();

    expect(push).toHaveBeenCalledWith({ name: 'ticket-detail', params: { id: 5 } });
  });
});
