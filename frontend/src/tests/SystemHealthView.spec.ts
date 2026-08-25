import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SystemHealthView from '../views/SystemHealthView.vue';
import { fetchHealth } from '../services/health.service';

vi.mock('../services/health.service', () => ({
  fetchHealth: vi.fn()
}));

const mockedFetchHealth = fetchHealth as unknown as ReturnType<typeof vi.fn>;

const healthyPayload = {
  status: 'ok',
  api: { status: 'ok', environment: 'test', uptimeSeconds: 5, timestamp: 'now' },
  database: { status: 'up', latencyMs: 3, schemaVersion: '1', error: null }
};

const degradedPayload = {
  status: 'degraded',
  api: { status: 'ok', environment: 'test', uptimeSeconds: 5, timestamp: 'now' },
  database: { status: 'down', latencyMs: null, schemaVersion: null, error: 'P1001' }
};

describe('SystemHealthView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows the loading indicator while the request is pending', async () => {
    mockedFetchHealth.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(SystemHealthView);
    await flushPromises();

    expect(wrapper.find('[data-testid="health-loading"]').exists()).toBe(true);
  });

  it('shows the error panel with the failure message', async () => {
    mockedFetchHealth.mockRejectedValue(new Error('Network error'));

    const wrapper = mount(SystemHealthView);
    await flushPromises();

    const errorPanel = wrapper.find('[data-testid="health-error"]');
    expect(errorPanel.exists()).toBe(true);
    expect(errorPanel.text()).toContain('Network error');
  });

  it('renders api and database status for a healthy payload', async () => {
    mockedFetchHealth.mockResolvedValue(healthyPayload);

    const wrapper = mount(SystemHealthView);
    await flushPromises();

    expect(wrapper.find('[data-testid="api-status"]').text()).toBe('ok');
    expect(wrapper.find('[data-testid="db-status"]').text()).toBe('up');
    expect(wrapper.find('[data-testid="db-schema-version"]').text()).toBe('1');
  });

  it('shows the degraded banner and down status', async () => {
    mockedFetchHealth.mockResolvedValue(degradedPayload);

    const wrapper = mount(SystemHealthView);
    await flushPromises();

    expect(wrapper.find('[data-testid="health-degraded"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="db-status"]').text()).toBe('down');
  });

  it('calls load exactly once when the refresh button is clicked', async () => {
    mockedFetchHealth.mockResolvedValue(healthyPayload);

    const wrapper = mount(SystemHealthView);
    await flushPromises();
    mockedFetchHealth.mockClear();

    await wrapper.find('[data-testid="refresh-button"]').trigger('click');
    await flushPromises();

    expect(mockedFetchHealth).toHaveBeenCalledTimes(1);
  });

  it('renders an em dash instead of "null" for missing latency and schema version', async () => {
    mockedFetchHealth.mockResolvedValue(degradedPayload);

    const wrapper = mount(SystemHealthView);
    await flushPromises();

    expect(wrapper.find('[data-testid="db-schema-version"]').text()).toBe('—');
    expect(wrapper.text()).not.toContain('null');
  });
});
