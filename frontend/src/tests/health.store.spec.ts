import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useHealthStore } from '../stores/health';
import { fetchHealth } from '../services/health.service';
import type { HealthPayload } from '../types';

vi.mock('../services/health.service', () => ({
  fetchHealth: vi.fn()
}));

const mockedFetchHealth = fetchHealth as unknown as ReturnType<typeof vi.fn>;

const okPayload: HealthPayload = {
  status: 'ok',
  api: { status: 'ok', environment: 'test', uptimeSeconds: 10, timestamp: '2026-08-25T00:00:00.000Z' },
  database: { status: 'up', latencyMs: 5, schemaVersion: '1', error: null }
};

const degradedPayload: HealthPayload = {
  status: 'degraded',
  api: { status: 'ok', environment: 'test', uptimeSeconds: 10, timestamp: '2026-08-25T00:00:00.000Z' },
  database: { status: 'down', latencyMs: null, schemaVersion: null, error: 'P1001' }
};

describe('useHealthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('sets payload and derived flags on success', async () => {
    mockedFetchHealth.mockResolvedValue(okPayload);
    const store = useHealthStore();

    await store.load();

    expect(store.payload).toEqual(okPayload);
    expect(store.isHealthy).toBe(true);
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
    expect(store.lastCheckedAt).not.toBeNull();
  });

  it('sets error and clears payload when the service rejects', async () => {
    mockedFetchHealth.mockRejectedValue(new Error('Network error'));
    const store = useHealthStore();

    await store.load();

    expect(store.payload).toBeNull();
    expect(store.error).toBe('Network error');
    expect(store.loading).toBe(false);
  });

  it('reports isDegraded true and isHealthy false for a degraded payload', async () => {
    mockedFetchHealth.mockResolvedValue(degradedPayload);
    const store = useHealthStore();

    await store.load();

    expect(store.isDegraded).toBe(true);
    expect(store.isHealthy).toBe(false);
  });
});
