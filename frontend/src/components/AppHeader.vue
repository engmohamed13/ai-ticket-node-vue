<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHealthStore } from '../stores/health';
import { useAuthStore } from '../stores/auth';
import NotificationCenter from './NotificationCenter.vue';
import StatusBadge from './ui/StatusBadge.vue';

defineEmits<{ 'toggle-nav': [] }>();

const healthStore = useHealthStore();
const auth = useAuthStore();
const router = useRouter();

const statusLabel = computed(() => healthStore.payload?.status ?? 'unknown');
const statusVariant = computed(() => {
  if (statusLabel.value === 'ok') return 'success';
  if (statusLabel.value === 'degraded') return 'warning';
  return 'neutral';
});

const initials = computed(() => {
  const name = auth.user?.name ?? '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
});

const onLogout = async (): Promise<void> => {
  await auth.signOut();
  await router.push({ name: 'login' });
};
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <button
        type="button"
        class="nav-toggle btn btn-ghost btn-icon"
        aria-label="Toggle navigation menu"
        @click="$emit('toggle-nav')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      </button>
      <RouterLink :to="{ name: 'dashboard' }" class="brand">
        <span class="brand-mark" aria-hidden="true">CS</span>
        <span class="brand-name">CustomerSupportCRM</span>
      </RouterLink>
      <StatusBadge :variant="statusVariant" class="header-status" data-testid="header-status-pill">
        {{ statusLabel }}
      </StatusBadge>
    </div>
    <div v-if="auth.isAuthenticated" class="header-user" data-testid="header-user">
      <NotificationCenter />
      <span class="user-avatar" aria-hidden="true">{{ initials }}</span>
      <span class="user-meta">
        <span class="user-name">{{ auth.user?.name }}</span>
        <span class="user-role" data-testid="header-role">{{ auth.user?.roleName }}</span>
      </span>
      <button class="btn btn-secondary btn-sm" type="button" data-testid="logout-button" @click="onLogout">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M15 17l5-5-5-5M20 12H9M13 21H6a2 2 0 01-2-2V5a2 2 0 012-2h7"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Logout
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  height: var(--header-height);
  padding: 0 var(--space-5);
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 40;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.nav-toggle {
  display: none;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  color: var(--text-main);
  flex-shrink: 0;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: var(--radius-sm);
  background-color: var(--color-primary);
  color: #ffffff;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-name {
  font-size: var(--font-lg);
  font-weight: 700;
}

.header-status {
  flex-shrink: 0;
}

.header-user {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  flex-shrink: 0;
}

.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--slate-200);
  color: var(--slate-700);
  font-size: var(--font-xs);
  font-weight: 700;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  font-weight: 600;
  font-size: var(--font-sm);
}

.user-role {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

@media (max-width: 900px) {
  .nav-toggle {
    display: inline-flex;
  }

  .brand-name {
    display: none;
  }

  .header-status {
    display: none;
  }

  .user-meta {
    display: none;
  }
}

@media (max-width: 480px) {
  .app-header {
    padding: 0 var(--space-3);
  }
}
</style>
