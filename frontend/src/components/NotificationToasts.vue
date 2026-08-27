<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { useNotificationsStore } from '../stores/notifications';
import { NOTIFICATION_ICONS } from './notificationIcons';

/**
 * Renders notifications that arrived while this session has been open as dismissible toasts.
 * The store decides what counts as an arrival — the first poll only seeds a baseline, so a
 * returning user is not buried under their backlog. Everything is still in the notification
 * centre in the header; dismissing a toast only hides the toast.
 */
const notifications = useNotificationsStore();
const router = useRouter();
const { t } = useI18n();

const onOpen = async (id: number, ticketId: number | null): Promise<void> => {
  notifications.dismissToast(id);
  await notifications.markRead(id);
  if (ticketId !== null) await router.push({ name: 'ticket-detail', params: { id: ticketId } });
};
</script>

<template>
  <div
    v-if="notifications.toasts.length > 0"
    class="toast-stack"
    role="status"
    aria-live="polite"
    data-testid="notification-toasts"
  >
    <article v-for="entry in notifications.toasts" :key="entry.id" class="toast" data-testid="notification-toast">
      <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          :d="NOTIFICATION_ICONS[entry.type]"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <div class="toast-body">
        <p class="toast-title">{{ entry.title }}</p>
        <p class="toast-message">{{ entry.message }}</p>
        <button
          v-if="entry.relatedTicketId !== null"
          class="toast-link"
          type="button"
          data-testid="open-notification-button"
          @click="onOpen(entry.id, entry.relatedTicketId)"
        >
          {{ t('notifications.openTicket', { id: entry.relatedTicketId }) }}
        </button>
      </div>
      <button
        class="toast-dismiss"
        type="button"
        :aria-label="t('notifications.dismissToast')"
        data-testid="dismiss-notification-button"
        @click="notifications.dismissToast(entry.id)"
      >
        ×
      </button>
    </article>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  inset-inline-end: var(--space-4);
  bottom: var(--space-4);
  z-index: 60;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 340px;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-inline-start: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: var(--color-primary);
}

.toast-body {
  flex: 1;
  min-width: 0;
}

.toast-title {
  margin: 0;
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-main);
}

.toast-message {
  margin: 0.2rem 0 0;
  font-size: var(--font-sm);
  color: var(--text-muted);
  line-height: 1.45;
}

.toast-link {
  margin-top: 0.35rem;
  padding: 0;
  background: none;
  border: 0;
  color: var(--color-primary);
  font-size: var(--font-xs);
  font-weight: 600;
  cursor: pointer;
}

.toast-link:hover {
  text-decoration: underline;
}

.toast-dismiss {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-subtle);
  font-size: var(--font-lg);
  line-height: 1;
  padding: 0 0.15rem;
}

.toast-dismiss:hover {
  color: var(--text-main);
}
</style>
