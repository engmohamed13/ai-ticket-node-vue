import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { NOTIFICATION_POLL_INTERVAL_MS, useNotificationsStore } from '../stores/notifications';
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

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('load', () => {
  it('populates the inbox and the unread count', async () => {
    mockedFetch.mockResolvedValue(inbox([notification(), notification({ id: 2, isRead: true })]));

    const store = useNotificationsStore();
    await store.load();

    expect(store.items).toHaveLength(2);
    expect(store.unreadCount).toBe(1);
    expect(store.hasUnread).toBe(true);
    expect(store.unreadItems).toHaveLength(1);
  });

  it('raises no toast on the very first load', async () => {
    mockedFetch.mockResolvedValue(inbox([notification(), notification({ id: 2 })]));

    const store = useNotificationsStore();
    await store.load();

    expect(store.toasts).toHaveLength(0);
  });

  it('toasts a notification that arrives on a later poll', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(inbox([notification({ id: 2 }), notification({ id: 1 })]));
    await store.load({ silent: true });

    expect(store.toasts).toHaveLength(1);
    expect(store.toasts[0].id).toBe(2);
  });

  it('never toasts something that arrives already read', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(inbox([notification({ id: 2, isRead: true }), notification({ id: 1 })]));
    await store.load({ silent: true });

    expect(store.toasts).toHaveLength(0);
  });

  it('shows at most three toasts at once', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(
      inbox([2, 3, 4, 5].map((id) => notification({ id })).concat(notification({ id: 1 })))
    );
    await store.load({ silent: true });

    expect(store.toasts).toHaveLength(3);
  });

  it('keeps the inbox when a background poll fails', async () => {
    mockedFetch.mockResolvedValue(inbox([notification()]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockRejectedValue(new Error('network down'));
    await store.load({ silent: true });

    expect(store.items).toHaveLength(1);
    expect(store.error).toBe('network down');
  });
});

describe('markRead', () => {
  it('updates the badge immediately, before the request settles', async () => {
    mockedFetch.mockResolvedValue(inbox([notification()]));
    mockedMarkRead.mockResolvedValue(notification({ isRead: true }));

    const store = useNotificationsStore();
    await store.load();
    await store.markRead(1);

    expect(store.unreadCount).toBe(0);
    expect(store.items[0].isRead).toBe(true);
    expect(mockedMarkRead).toHaveBeenCalledWith(1);
  });

  it('does nothing for a notification that is already read', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ isRead: true })]));

    const store = useNotificationsStore();
    await store.load();
    await store.markRead(1);

    expect(mockedMarkRead).not.toHaveBeenCalled();
  });

  it('re-syncs from the server when the request fails', async () => {
    mockedFetch.mockResolvedValue(inbox([notification()]));
    mockedMarkRead.mockRejectedValue(new Error('Notification 1 not found'));

    const store = useNotificationsStore();
    await store.load();
    await store.markRead(1);

    expect(store.error).toBe('Notification 1 not found');
    // One initial load plus the re-sync.
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });
});

describe('markAllRead', () => {
  it('clears the badge and marks every row read', async () => {
    mockedFetch.mockResolvedValue(inbox([notification(), notification({ id: 2 })]));
    mockedMarkAll.mockResolvedValue(2);

    const store = useNotificationsStore();
    await store.load();
    await store.markAllRead();

    expect(store.unreadCount).toBe(0);
    expect(store.items.every((entry) => entry.isRead)).toBe(true);
  });
});

describe('dismiss', () => {
  it('removes the notification and decrements the badge', async () => {
    mockedFetch.mockResolvedValue(inbox([notification(), notification({ id: 2 })]));

    const store = useNotificationsStore();
    await store.load();
    await store.dismiss(1);

    expect(store.items).toHaveLength(1);
    expect(store.unreadCount).toBe(1);
    expect(mockedDismiss).toHaveBeenCalledWith(1);
  });

  it('does not decrement the badge for an already-read notification', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ isRead: true }), notification({ id: 2 })]));

    const store = useNotificationsStore();
    await store.load();
    await store.dismiss(1);

    expect(store.unreadCount).toBe(1);
  });
});

describe('dismissToast', () => {
  it('hides the toast but keeps the notification unread in the centre', async () => {
    mockedFetch.mockResolvedValue(inbox([notification({ id: 1 })]));
    const store = useNotificationsStore();
    await store.load();

    mockedFetch.mockResolvedValue(inbox([notification({ id: 2 }), notification({ id: 1 })]));
    await store.load({ silent: true });

    store.dismissToast(2);

    expect(store.toasts).toHaveLength(0);
    expect(store.items.find((entry) => entry.id === 2)?.isRead).toBe(false);
    expect(mockedDismiss).not.toHaveBeenCalled();
  });
});

describe('polling', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads once immediately and then on the interval', async () => {
    mockedFetch.mockResolvedValue(inbox([]));

    const store = useNotificationsStore();
    await store.startPolling();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS);
    expect(mockedFetch).toHaveBeenCalledTimes(2);

    store.stopPolling();
    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 2);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
  });

  it('never starts a second timer', async () => {
    mockedFetch.mockResolvedValue(inbox([]));

    const store = useNotificationsStore();
    await store.startPolling();
    await store.startPolling();

    expect(mockedFetch).toHaveBeenCalledTimes(1);

    store.stopPolling();
  });

  it('clear stops polling and empties the inbox', async () => {
    mockedFetch.mockResolvedValue(inbox([notification()]));

    const store = useNotificationsStore();
    await store.startPolling();
    store.clear();

    expect(store.items).toHaveLength(0);
    expect(store.unreadCount).toBe(0);
    expect(store.polling).toBe(false);

    await vi.advanceTimersByTimeAsync(NOTIFICATION_POLL_INTERVAL_MS * 2);
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
