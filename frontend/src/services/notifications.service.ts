import api from './api';
import type { ApiResponse, AppNotification, NotificationInbox } from '../types';

const EMPTY_INBOX: NotificationInbox = { items: [], unreadCount: 0 };

/**
 * The notification inbox (Story 20). Every call is implicitly scoped to the signed-in user by
 * the API — none of these takes a userId, and passing one would be ignored.
 */
export const fetchNotifications = async (unreadOnly = false): Promise<NotificationInbox> => {
  const response = await api.get<ApiResponse<NotificationInbox>>('/notifications', {
    // The API validates this as the string 'true' / 'false', so only send it when set.
    params: { unreadOnly: unreadOnly ? 'true' : undefined }
  });
  return response.data.data ?? EMPTY_INBOX;
};

export const markNotificationRead = async (id: number): Promise<AppNotification> => {
  const response = await api.patch<ApiResponse<AppNotification>>(`/notifications/${id}/read`);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update the notification');
  return response.data.data;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  const response = await api.patch<ApiResponse<{ updated: number }>>('/notifications/read-all');
  return response.data.data?.updated ?? 0;
};

export const dismissNotification = async (id: number): Promise<void> => {
  await api.delete<ApiResponse<null>>(`/notifications/${id}`);
};
