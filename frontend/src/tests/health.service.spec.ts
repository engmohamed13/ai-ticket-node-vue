import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import { fetchHealth, fetchDatabaseHealth } from '../services/health.service';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn()
  }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe('fetchHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves to the envelope data on a 200 response', async () => {
    const payload = {
      status: 'ok',
      api: { status: 'ok', environment: 'test', uptimeSeconds: 1, timestamp: 'now' },
      database: { status: 'up', latencyMs: 1, schemaVersion: '1', error: null }
    };
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: payload } });

    const result = await fetchHealth();

    expect(result).toEqual(payload);
  });

  it('resolves normally (does not throw) for a 503 degraded envelope', async () => {
    const payload = {
      status: 'degraded',
      api: { status: 'ok', environment: 'test', uptimeSeconds: 1, timestamp: 'now' },
      database: { status: 'down', latencyMs: null, schemaVersion: null, error: 'P1001' }
    };
    mockedGet.mockResolvedValue({ data: { success: true, message: 'API is healthy', data: payload } });

    const result = await fetchHealth();

    expect(result).toEqual(payload);
  });

  it('throws with the envelope message when data is null', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Empty health payload', data: null } });

    await expect(fetchHealth()).rejects.toThrow('Empty health payload');
  });
});

describe('fetchDatabaseHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('unwraps the nested database field', async () => {
    const database = { status: 'up', latencyMs: 2, schemaVersion: '1', error: null };
    mockedGet.mockResolvedValue({ data: { success: true, message: 'Database readiness', data: { database } } });

    const result = await fetchDatabaseHealth();

    expect(result).toEqual(database);
  });
});
