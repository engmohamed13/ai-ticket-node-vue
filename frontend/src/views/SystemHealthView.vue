<script setup lang="ts">
import { onMounted } from 'vue';
import { useHealthStore } from '../stores/health';

const store = useHealthStore();

onMounted(() => {
  void store.load();
});

const formatLatency = (latencyMs: number | null): string => (latencyMs === null ? '—' : `${latencyMs} ms`);
const formatSchemaVersion = (schemaVersion: string | null): string => schemaVersion ?? '—';
const formatCheckedAt = (checkedAt: string | null): string =>
  checkedAt ? new Date(checkedAt).toLocaleTimeString() : '—';
</script>

<template>
  <section>
    <div class="header-row">
      <h2>System Health</h2>
      <button class="btn btn-primary" data-testid="refresh-button" @click="store.load()">Refresh</button>
    </div>

    <p v-if="store.lastCheckedAt" class="checked-at">Last checked: {{ formatCheckedAt(store.lastCheckedAt) }}</p>

    <p v-if="store.loading" data-testid="health-loading">Checking system health…</p>

    <div v-else-if="store.error" class="panel panel-error" data-testid="health-error">
      <strong>Cannot reach the API</strong>
      <p>{{ store.error }}</p>
      <button class="btn btn-primary" @click="store.load()">Retry</button>
    </div>

    <template v-else-if="store.payload">
      <div v-if="store.isDegraded" class="panel panel-degraded" data-testid="health-degraded">
        API is reachable but the database is not.
      </div>

      <div class="cards">
        <div class="card">
          <h3>API</h3>
          <dl>
            <dt>Status</dt>
            <dd data-testid="api-status">{{ store.payload.api.status }}</dd>
            <dt>Environment</dt>
            <dd>{{ store.payload.api.environment }}</dd>
            <dt>Uptime</dt>
            <dd>{{ store.payload.api.uptimeSeconds }}s</dd>
          </dl>
        </div>

        <div class="card">
          <h3>Database</h3>
          <dl>
            <dt>Status</dt>
            <dd data-testid="db-status">{{ store.payload.database.status }}</dd>
            <dt>Latency</dt>
            <dd>{{ formatLatency(store.payload.database.latencyMs) }}</dd>
            <dt>Schema version</dt>
            <dd data-testid="db-schema-version">{{ formatSchemaVersion(store.payload.database.schemaVersion) }}</dd>
            <template v-if="store.payload.database.status === 'down'">
              <dt>Error</dt>
              <dd>{{ store.payload.database.error }}</dd>
            </template>
          </dl>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.checked-at {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0;
}

.panel {
  padding: 1rem 1.25rem;
  border-radius: 8px;
}

.panel-error {
  background-color: var(--color-down-bg);
  color: var(--color-down);
}

.panel-degraded {
  background-color: var(--color-degraded-bg);
  color: var(--color-degraded);
  font-weight: 600;
}

.cards {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  min-width: 220px;
  flex: 1;
}

.card h3 {
  margin-bottom: 0.75rem;
}

dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem 0.75rem;
  margin: 0;
}

dt {
  color: var(--text-muted);
  font-size: 0.85rem;
}

dd {
  margin: 0;
  font-weight: 600;
}
</style>
