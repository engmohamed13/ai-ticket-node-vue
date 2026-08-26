<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '../stores/notifications';
import { NOTIFICATION_ICONS, NOTIFICATION_LABELS } from './notificationIcons';
import EmptyState from './ui/EmptyState.vue';
import LoadingState from './ui/LoadingState.vue';

/**
 * The notification centre: a bell in the header with an unread badge, opening a panel of every
 * notification the signed-in user has, filterable to unread only. Each row that points at a
 * ticket opens it.
 *
 * Polling lives in the store, started by the app shell — this component only renders what is
 * already there, so opening and closing the panel never triggers a fetch storm.
 */
const notifications = useNotificationsStore();
const router = useRouter();

const open = ref(false);
const unreadOnly = ref(false);

const visible = computed(() => (unreadOnly.value ? notifications.unreadItems : notifications.items));

const formatWhen = (value: string): string => new Date(value).toLocaleString();

const onToggle = (): void => {
  open.value = !open.value;
};

const onOpenNotification = async (id: number, ticketId: number | null): Promise<void> => {
  await notifications.markRead(id);
  if (ticketId !== null) {
    open.value = false;
    await router.push({ name: 'ticket-detail', params: { id: ticketId } });
  }
};

// Clicking anywhere outside closes the panel — the same behaviour a native menu has.
const onDocumentClick = (event: MouseEvent): void => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('[data-notification-center]')) return;
  open.value = false;
};

if (typeof document !== 'undefined') {
  document.addEventListener('click', onDocumentClick);
  onUnmounted(() => document.removeEventListener('click', onDocumentClick));
}
</script>

<template>
  <div class="notification-center" data-notification-center>
    <button
      class="btn btn-ghost btn-icon bell"
      type="button"
      :aria-label="
        notifications.unreadCount > 0
          ? `Notifications, ${notifications.unreadCount} unread`
          : 'Notifications'
      "
      :aria-expanded="open"
      data-testid="notification-bell"
      @click="onToggle"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <span v-if="notifications.unreadCount > 0" class="badge-count" data-testid="notification-badge">
        {{ notifications.unreadCount > 9 ? '9+' : notifications.unreadCount }}
      </span>
    </button>

    <div v-if="open" class="panel" data-testid="notification-panel">
      <header class="panel-header">
        <h3 class="panel-title">Notifications</h3>
        <button
          v-if="notifications.hasUnread"
          class="btn btn-ghost btn-sm"
          type="button"
          data-testid="mark-all-read-button"
          @click="notifications.markAllRead()"
        >
          Mark all read
        </button>
      </header>

      <div class="panel-filter">
        <label class="filter-toggle">
          <input v-model="unreadOnly" type="checkbox" data-testid="notification-unread-filter" />
          <span>Unread only</span>
        </label>
      </div>

      <LoadingState v-if="notifications.loading" data-testid="notification-loading">Loading…</LoadingState>

      <EmptyState
        v-else-if="visible.length === 0"
        :title="unreadOnly ? 'Nothing unread' : 'No notifications yet'"
        description="Assignments, status changes, comments, SLA breaches, and customer feedback show up here."
        data-testid="notification-empty"
      />

      <ul v-else class="notification-list" data-testid="notification-list">
        <li
          v-for="entry in visible"
          :key="entry.id"
          class="notification-item"
          :class="{ 'is-unread': !entry.isRead }"
          data-testid="notification-item"
        >
          <svg class="item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              :d="NOTIFICATION_ICONS[entry.type]"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <div class="item-body">
            <p class="item-title">{{ entry.title }}</p>
            <p class="item-message">{{ entry.message }}</p>
            <p class="item-meta">
              <span class="item-type">{{ NOTIFICATION_LABELS[entry.type] }}</span>
              <span>{{ formatWhen(entry.createdAt) }}</span>
            </p>
            <div class="item-actions">
              <button
                v-if="entry.relatedTicketId !== null"
                class="item-action"
                type="button"
                data-testid="notification-open-button"
                @click="onOpenNotification(entry.id, entry.relatedTicketId)"
              >
                Open ticket #{{ entry.relatedTicketId }}
              </button>
              <button
                v-if="!entry.isRead"
                class="item-action"
                type="button"
                data-testid="notification-mark-read-button"
                @click="notifications.markRead(entry.id)"
              >
                Mark read
              </button>
              <button
                class="item-action is-muted"
                type="button"
                data-testid="notification-delete-button"
                @click="notifications.dismiss(entry.id)"
              >
                Dismiss
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.notification-center {
  position: relative;
  flex-shrink: 0;
}

.bell {
  position: relative;
}

.badge-count {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  border-radius: 8px;
  background-color: var(--color-danger, #dc2626);
  color: #ffffff;
  font-size: 0.6rem;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

.panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 50;
  width: min(380px, calc(100vw - 2rem));
  max-height: 70vh;
  overflow-y: auto;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.panel-title {
  margin: 0;
  font-size: var(--font-md);
}

.panel-filter {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: var(--font-sm);
  color: var(--text-muted);
}

.filter-toggle input {
  width: auto;
}

.notification-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.notification-item {
  display: flex;
  gap: 0.6rem;
  padding: var(--space-3);
  border-bottom: 1px solid var(--border-color);
}

.notification-item:last-child {
  border-bottom: 0;
}

.notification-item.is-unread {
  background-color: var(--color-primary-bg);
}

.item-icon {
  flex-shrink: 0;
  margin-top: 0.15rem;
  color: var(--color-primary);
}

.item-body {
  min-width: 0;
  flex: 1;
}

.item-title {
  margin: 0;
  font-size: var(--font-sm);
  font-weight: 600;
}

.item-message {
  margin: 0.2rem 0 0;
  font-size: var(--font-sm);
  color: var(--text-muted);
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.item-meta {
  display: flex;
  gap: 0.5rem;
  margin: 0.35rem 0 0;
  font-size: var(--font-xs);
  color: var(--text-subtle);
}

.item-type {
  font-weight: 600;
}

.item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.4rem;
}

.item-action {
  padding: 0;
  background: none;
  border: 0;
  color: var(--color-primary);
  font-size: var(--font-xs);
  font-weight: 600;
  cursor: pointer;
}

.item-action.is-muted {
  color: var(--text-subtle);
}

.item-action:hover {
  text-decoration: underline;
}
</style>
