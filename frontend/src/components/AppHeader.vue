<script setup lang="ts">
import { computed } from 'vue';
import { useHealthStore } from '../stores/health';

const healthStore = useHealthStore();

const statusLabel = computed(() => healthStore.payload?.status ?? 'unknown');
const statusClass = computed(() => `pill-${statusLabel.value}`);
</script>

<template>
  <header class="app-header">
    <h1 class="app-title">CustomerSupportCRM</h1>
    <span class="status-pill" :class="statusClass" data-testid="header-status-pill">{{ statusLabel }}</span>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.app-title {
  font-size: 1.1rem;
  margin: 0;
}

.status-pill {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  background-color: #e2e8f0;
  color: #475569;
}

.pill-ok {
  background-color: var(--color-ok-bg);
  color: var(--color-ok);
}

.pill-degraded {
  background-color: var(--color-degraded-bg);
  color: var(--color-degraded);
}
</style>
