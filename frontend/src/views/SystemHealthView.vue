<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHealthStore } from '../stores/health';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';
import LoadingState from '../components/ui/LoadingState.vue';

const store = useHealthStore();
const { t, locale } = useI18n();

onMounted(() => {
  void store.load();
});

const formatLatency = (latencyMs: number | null): string =>
  latencyMs === null ? t('common.states.none') : t('health.latencyValue', { ms: latencyMs });
const formatSchemaVersion = (schemaVersion: string | null): string =>
  schemaVersion ?? t('common.states.none');
// Formatted with the active locale so Arabic gets Arabic time conventions.
const formatCheckedAt = (checkedAt: string | null): string =>
  checkedAt ? new Date(checkedAt).toLocaleTimeString(locale.value) : t('common.states.none');
</script>

<template>
  <section class="view">
    <PageHeader :title="t('health.title')">
      <p v-if="store.lastCheckedAt" class="checked-at">
        {{ t('health.lastChecked', { time: formatCheckedAt(store.lastCheckedAt) }) }}
      </p>
      <template #actions>
        <button class="btn btn-secondary" data-testid="refresh-button" @click="store.load()">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M21 12a9 9 0 11-2.64-6.36M21 4v5h-5"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Refresh
        </button>
      </template>
    </PageHeader>

    <LoadingState v-if="store.loading" data-testid="health-loading">{{ t('health.checking') }}</LoadingState>

    <AlertBanner v-else-if="store.error" variant="error" data-testid="health-error">
      <strong>{{ t('health.unreachableTitle') }}</strong>
      <p>{{ store.error }}</p>
      <button class="btn btn-secondary btn-sm" @click="store.load()">{{ t('common.actions.retry') }}</button>
    </AlertBanner>

    <template v-else-if="store.payload">
      <AlertBanner v-if="store.isDegraded" variant="warning" data-testid="health-degraded">
        {{ t('health.degraded') }}
      </AlertBanner>

      <div class="cards">
        <div class="card card-padded status-card">
          <div class="status-card-header">
            <h3>{{ t('health.api') }}</h3>
            <StatusBadge :variant="store.payload.api.status === 'ok' ? 'success' : 'danger'" data-testid="api-status">
              {{ store.payload.api.status }}
            </StatusBadge>
          </div>
          <dl>
            <dt>{{ t('health.environment') }}</dt>
            <dd>{{ store.payload.api.environment }}</dd>
            <dt>{{ t('health.uptime') }}</dt>
            <dd>{{ t('health.uptimeValue', { seconds: store.payload.api.uptimeSeconds }) }}</dd>
          </dl>
        </div>

        <div class="card card-padded status-card">
          <div class="status-card-header">
            <h3>{{ t('health.database') }}</h3>
            <StatusBadge :variant="store.payload.database.status === 'up' ? 'success' : 'danger'" data-testid="db-status">
              {{ store.payload.database.status }}
            </StatusBadge>
          </div>
          <dl>
            <dt>{{ t('health.latency') }}</dt>
            <dd>{{ formatLatency(store.payload.database.latencyMs) }}</dd>
            <dt>{{ t('health.schemaVersion') }}</dt>
            <dd data-testid="db-schema-version">{{ formatSchemaVersion(store.payload.database.schemaVersion) }}</dd>
            <template v-if="store.payload.database.status === 'down'">
              <dt>{{ t('health.error') }}</dt>
              <dd>{{ store.payload.database.error }}</dd>
            </template>
          </dl>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.checked-at {
  color: var(--text-muted);
  font-size: var(--font-sm);
}

.cards {
  display: flex;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.status-card {
  min-width: 240px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.status-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.5rem var(--space-3);
  margin: 0;
}

dt {
  color: var(--text-muted);
  font-size: var(--font-sm);
}

dd {
  margin: 0;
  font-weight: 600;
  font-size: var(--font-sm);
  text-align: end;
}
</style>
