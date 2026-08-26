import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  dismissNotification,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../services/notifications.service';
import type { AppNotification } from '../types';

/** How often the shell re-reads the inbox. Also what makes an overdue ticket surface. */
export const NOTIFICATION_POLL_INTERVAL_MS = 15_000;

/** How many unread arrivals are shown as toasts at once. */
export const MAX_VISIBLE_TOASTS = 3;

/**
 * In-app notifications for the five events work item 6 lists: ticket assignment, status
 * changes, new comments, SLA/overdue, and customer feedback.
 *
 * These are **server-persisted** (Story 20), replacing the client-side poll diff Story 15 used:
 * the backend writes a row at the moment the event happens, so an agent who was offline still
 * sees what they missed, and a notification survives a reload. There is still no server push
 * (no WebSocket, no SSE) — the shell polls `GET /api/notifications` on the interval above,
 * which is also what materialises overdue notifications, since this module has no scheduler.
 *
 * Toasts are shown only for notifications that *arrive while this session is open*: the first
 * load seeds the baseline instead of flinging the whole backlog at the user.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const polling = ref(false);

  /** Ids seen on a previous poll — the baseline that decides what counts as an arrival. */
  const knownIds = ref(new Set<number>());
  /** Ids currently being shown as a toast. Dismissing a toast does not delete the notification. */
  const toastIds = ref<number[]>([]);

  let pollTimer: ReturnType<typeof setInterval> | undefined;

  const hasUnread = computed(() => unreadCount.value > 0);
  const unreadItems = computed(() => items.value.filter((entry) => !entry.isRead));
  const toasts = computed(() =>
    toastIds.value
      .map((id) => items.value.find((entry) => entry.id === id))
      .filter((entry): entry is AppNotification => entry !== undefined && !entry.isRead)
      .slice(0, MAX_VISIBLE_TOASTS)
  );

  const load = async (options: { silent?: boolean } = {}): Promise<void> => {
    if (!options.silent) loading.value = true;
    error.value = null;
    try {
      const inbox = await fetchNotifications();
      const isFirstLoad = knownIds.value.size === 0;

      // Anything unread that this session has not seen before is an arrival worth a toast.
      // The very first load only seeds the baseline.
      if (!isFirstLoad) {
        const arrivals = inbox.items.filter((entry) => !entry.isRead && !knownIds.value.has(entry.id));
        if (arrivals.length > 0) {
          toastIds.value = [...arrivals.map((entry) => entry.id), ...toastIds.value];
        }
      }

      knownIds.value = new Set(inbox.items.map((entry) => entry.id));
      items.value = inbox.items;
      unreadCount.value = inbox.unreadCount;
    } catch (cause) {
      // A failed background poll must not wipe the inbox the user is looking at.
      error.value = toErrorMessage(cause, 'Unable to load notifications');
    } finally {
      loading.value = false;
    }
  };

  const startPolling = async (): Promise<void> => {
    if (polling.value) return;
    polling.value = true;
    await load();
    pollTimer = setInterval(() => {
      void load({ silent: true });
    }, NOTIFICATION_POLL_INTERVAL_MS);
  };

  const stopPolling = (): void => {
    if (pollTimer !== undefined) clearInterval(pollTimer);
    pollTimer = undefined;
    polling.value = false;
  };

  const markRead = async (id: number): Promise<void> => {
    // Optimistic: the badge should not lag a click. A failure is reported and re-synced.
    const entry = items.value.find((candidate) => candidate.id === id);
    if (!entry || entry.isRead) return;
    entry.isRead = true;
    unreadCount.value = Math.max(0, unreadCount.value - 1);
    try {
      await markNotificationRead(id);
    } catch (cause) {
      const message = toErrorMessage(cause, 'Unable to update the notification');
      // Re-sync first: `load` clears `error` on entry, so the message is set afterwards.
      await load({ silent: true });
      error.value = message;
    }
  };

  const markAllRead = async (): Promise<void> => {
    items.value = items.value.map((entry) => ({ ...entry, isRead: true }));
    unreadCount.value = 0;
    try {
      await markAllNotificationsRead();
    } catch (cause) {
      const message = toErrorMessage(cause, 'Unable to update your notifications');
      await load({ silent: true });
      error.value = message;
    }
  };

  /** Permanently deletes the notification, unlike `dismissToast`. */
  const dismiss = async (id: number): Promise<void> => {
    const entry = items.value.find((candidate) => candidate.id === id);
    items.value = items.value.filter((candidate) => candidate.id !== id);
    toastIds.value = toastIds.value.filter((candidate) => candidate !== id);
    if (entry && !entry.isRead) unreadCount.value = Math.max(0, unreadCount.value - 1);
    try {
      await dismissNotification(id);
    } catch (cause) {
      const message = toErrorMessage(cause, 'Unable to dismiss the notification');
      await load({ silent: true });
      error.value = message;
    }
  };

  /** Hides the toast only — the notification stays in the centre, still unread. */
  const dismissToast = (id: number): void => {
    toastIds.value = toastIds.value.filter((candidate) => candidate !== id);
  };

  /** Called on sign-out: drops every trace of the previous user's inbox. */
  const clear = (): void => {
    stopPolling();
    items.value = [];
    unreadCount.value = 0;
    knownIds.value = new Set();
    toastIds.value = [];
    error.value = null;
  };

  return {
    items,
    unreadCount,
    loading,
    error,
    polling,
    hasUnread,
    unreadItems,
    toasts,
    load,
    startPolling,
    stopPolling,
    markRead,
    markAllRead,
    dismiss,
    dismissToast,
    clear
  };
});
