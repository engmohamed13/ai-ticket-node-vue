import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchHealth } from '../services/health.service';
import type { HealthPayload } from '../types';

export const useHealthStore = defineStore('health', () => {
  const payload = ref<HealthPayload | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastCheckedAt = ref<string | null>(null);

  const isHealthy = computed(() => payload.value?.status === 'ok');
  const isDegraded = computed(() => payload.value?.status === 'degraded');

  const load = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      payload.value = await fetchHealth();
      lastCheckedAt.value = new Date().toISOString();
    } catch (cause) {
      payload.value = null;
      error.value = cause instanceof Error ? cause.message : 'Unable to reach the API';
    } finally {
      loading.value = false;
    }
  };

  return { payload, loading, error, lastCheckedAt, isHealthy, isDegraded, load };
});
