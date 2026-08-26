<script setup lang="ts">
import { computed } from 'vue';
import { useNotificationsStore } from '../stores/notifications';
import type { NotificationKind } from '../stores/notifications';

/**
 * Renders the newest few unread in-app notifications as dismissible toasts. The store is
 * populated by the tickets store's poll diff — see stores/notifications.ts for why this is
 * client-side polling rather than a server push.
 */
const MAX_VISIBLE = 3;

const notifications = useNotificationsStore();

const visible = computed(() => notifications.items.filter((entry) => !entry.read).slice(0, MAX_VISIBLE));

const ICONS: Record<NotificationKind, string> = {
  assignment: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM19 8v6M22 11h-6',
  status: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  comment: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z'
};
</script>

<template>
  <div v-if="visible.length > 0" class="toast-stack" role="status" aria-live="polite" data-testid="notification-toasts">
    <article v-for="entry in visible" :key="entry.id" class="toast" data-testid="notification-toast">
      <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path :d="ICONS[entry.kind]" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <p class="toast-message">{{ entry.message }}</p>
      <button
        class="toast-dismiss"
        type="button"
        aria-label="Dismiss notification"
        data-testid="dismiss-notification-button"
        @click="notifications.dismiss(entry.id)"
      >
        ×
      </button>
    </article>
  </div>
</template>

<style scoped>
.toast-stack {
  position: fixed;
  right: var(--space-4);
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
  border-left: 3px solid var(--color-primary);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: var(--color-primary);
}

.toast-message {
  flex: 1;
  margin: 0;
  font-size: var(--font-sm);
  color: var(--text-main);
  line-height: 1.45;
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
