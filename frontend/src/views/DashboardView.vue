<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useHealthStore } from '../stores/health';
import PageHeader from '../components/ui/PageHeader.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const auth = useAuthStore();
const healthStore = useHealthStore();
const router = useRouter();
const { t, te } = useI18n();

onMounted(() => {
  if (!healthStore.payload) {
    void healthStore.load();
  }
});

const statusVariant = computed(() => {
  if (healthStore.payload?.status === 'ok') return 'success';
  if (healthStore.payload?.status === 'degraded') return 'warning';
  return 'neutral';
});

const statusLabel = computed(() => healthStore.payload?.status ?? t('dashboard.unknownStatus'));

/**
 * Decorative icon per module, keyed by route name. The matching one-line description
 * lives in the locale files under `dashboard.modules.<route name>` so it translates.
 */
const MODULE_ICONS: Record<string, string> = {
  'system-health': 'M22 12h-4l-3 9-6-18-3 9H2',
  communications: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  users:
    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  roles: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z'
};

const moduleDescription = (name: string): string =>
  te(`dashboard.modules.${name}`) ? t(`dashboard.modules.${name}`) : '';

const navLabel = (name: string, fallback: string): string =>
  te(`nav.${name}`) ? t(`nav.${name}`) : fallback;

/** Every navigable route this user can reach, excluding the dashboard itself. */
const quickLinks = computed(() =>
  router
    .getRoutes()
    .filter((route) => route.meta.navLabel && route.name !== 'dashboard')
    .filter((route) => !route.meta.permission || auth.can(route.meta.permission))
);
</script>

<template>
  <section class="view">
    <PageHeader
      :title="t('dashboard.title')"
      :subtitle="t('dashboard.welcome', { name: auth.user?.name ?? t('dashboard.welcomeFallbackName') })"
    />

    <div class="kpi-grid">
      <div class="card card-padded kpi-card">
        <span class="kpi-label">{{ t('dashboard.systemStatus') }}</span>
        <StatusBadge :variant="statusVariant" class="kpi-status">{{ statusLabel }}</StatusBadge>
      </div>
      <div class="card card-padded kpi-card">
        <span class="kpi-label">{{ t('dashboard.signedInAs') }}</span>
        <span class="kpi-value">{{ auth.user?.name }}</span>
        <span class="kpi-sub">{{ auth.user?.email }}</span>
      </div>
      <div class="card card-padded kpi-card">
        <span class="kpi-label">{{ t('dashboard.role') }}</span>
        <span class="kpi-value">{{ auth.user?.roleName }}</span>
      </div>
      <div class="card card-padded kpi-card">
        <span class="kpi-label">{{ t('dashboard.permissionsGranted') }}</span>
        <span class="kpi-value">{{ auth.permissions.length }}</span>
      </div>
    </div>

    <div class="quick-links-section">
      <h3>{{ t('dashboard.quickAccess') }}</h3>
      <div class="quick-links-grid">
        <RouterLink v-for="item in quickLinks" :key="item.name as string" :to="{ name: item.name }" class="card quick-link">
          <svg
            v-if="MODULE_ICONS[item.name as string]"
            class="quick-link-icon"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              :d="MODULE_ICONS[item.name as string]"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="quick-link-title">{{ navLabel(item.name as string, item.meta.navLabel as string) }}</span>
          <span class="quick-link-description">{{ moduleDescription(item.name as string) }}</span>
        </RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.kpi-label {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.kpi-status {
  align-self: flex-start;
  font-size: var(--font-sm);
  padding: 0.3rem 0.85rem;
}

.kpi-value {
  font-size: var(--font-xl);
  font-weight: 700;
}

.kpi-sub {
  font-size: var(--font-xs);
  color: var(--text-muted);
}

.quick-links-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.quick-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-4);
}

.quick-link {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: var(--space-5);
  text-decoration: none;
  color: var(--text-main);
  transition:
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}

.quick-link:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-border);
}

.quick-link-icon {
  color: var(--color-primary);
}

.quick-link-title {
  font-weight: 700;
  font-size: var(--font-base);
}

.quick-link-description {
  font-size: var(--font-sm);
  color: var(--text-muted);
}
</style>
