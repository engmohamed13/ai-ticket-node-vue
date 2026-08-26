import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export type NotificationKind = 'assignment' | 'status' | 'comment';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
  ticketId: number | null;
  createdAt: string;
  read: boolean;
}

/** How many notifications are kept in memory. Older entries fall off the end. */
const MAX_NOTIFICATIONS = 30;

/**
 * In-app notifications for the three events work item 5 lists: ticket assignment, status
 * changes, and new comments.
 *
 * These are produced client-side by the tickets store diffing successive poll results — there
 * is no server push (no WebSocket, no SSE) and nothing is persisted, so the list resets on
 * reload. That is the documented limit of this mini-module, not an oversight.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const nextId = ref(1);

  const unreadCount = computed(() => items.value.filter((entry) => !entry.read).length);
  const hasUnread = computed(() => unreadCount.value > 0);

  const push = (kind: NotificationKind, message: string, ticketId: number | null = null): void => {
    items.value = [
      {
        id: nextId.value++,
        kind,
        message,
        ticketId,
        createdAt: new Date().toISOString(),
        read: false
      },
      ...items.value
    ].slice(0, MAX_NOTIFICATIONS);
  };

  const markAllRead = (): void => {
    items.value = items.value.map((entry) => ({ ...entry, read: true }));
  };

  const dismiss = (id: number): void => {
    items.value = items.value.filter((entry) => entry.id !== id);
  };

  const clear = (): void => {
    items.value = [];
  };

  return { items, unreadCount, hasUnread, push, markAllRead, dismiss, clear };
});
