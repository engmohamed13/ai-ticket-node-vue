import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notifications.service';

vi.mock('../services/api', () => ({
  default: { get: vi.fn(), patch: vi.fn(), delete: vi.fn() }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = api.patch as unknown as ReturnType<typeof vi.fn>;
const mockedDelete = api.delete as unknown as ReturnType<typeof vi.fn>;

const envelope = <T>(data: T, message = 'OK') => ({ data: { success: true, message, data } });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchNotifications', () => {
  it('reads the inbox without the unreadOnly flag by default', async () => {
    mockedGet.mockResolvedValue(envelope({ items: [], unreadCount: 0 }));

    await fetchNotifications();

    expect(mockedGet).toHaveBeenCalledWith('/notifications', { params: { unreadOnly: undefined } });
  });

  it('sends unreadOnly as the string the API validates', async () => {
    mockedGet.mockResolvedValue(envelope({ items: [], unreadCount: 0 }));

    await fetchNotifications(true);

    expect(mockedGet.mock.calls[0][1].params.unreadOnly).toBe('true');
  });

  it('falls back to an empty inbox rather than throwing', async () => {
    mockedGet.mockResolvedValue(envelope(null));

    await expect(fetchNotifications()).resolves.toEqual({ items: [], unreadCount: 0 });
  });
});

describe('markNotificationRead', () => {
  it('patches the read sub-resource', async () => {
    mockedPatch.mockResolvedValue(envelope({ id: 5, isRead: true }));

    await markNotificationRead(5);

    expect(mockedPatch).toHaveBeenCalledWith('/notifications/5/read');
  });

  it('throws the API message when the notification is gone', async () => {
    mockedPatch.mockResolvedValue({
      data: { success: false, message: 'Notification 5 not found', data: null }
    });

    await expect(markNotificationRead(5)).rejects.toThrow('Notification 5 not found');
  });
});

describe('markAllNotificationsRead', () => {
  it('returns the number the API reports as updated', async () => {
    mockedPatch.mockResolvedValue(envelope({ updated: 3 }));

    await expect(markAllNotificationsRead()).resolves.toBe(3);
    expect(mockedPatch).toHaveBeenCalledWith('/notifications/read-all');
  });

  it('reports zero when the API returns no data', async () => {
    mockedPatch.mockResolvedValue(envelope(null));

    await expect(markAllNotificationsRead()).resolves.toBe(0);
  });
});

describe('dismissNotification', () => {
  it('deletes the notification', async () => {
    mockedDelete.mockResolvedValue(envelope(null));

    await dismissNotification(5);

    expect(mockedDelete).toHaveBeenCalledWith('/notifications/5');
  });
});
