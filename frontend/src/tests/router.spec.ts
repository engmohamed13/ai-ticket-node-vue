import { describe, it, expect } from 'vitest';
import router from '../router';

describe('router', () => {
  it('resolves / to the dashboard route', () => {
    expect(router.resolve('/').name).toBe('dashboard');
  });

  it('resolves /health to the system-health route', () => {
    expect(router.resolve('/health').name).toBe('system-health');
  });

  it('resolves /communications to the communications route', () => {
    expect(router.resolve('/communications').name).toBe('communications');
  });

  it('resolves an unknown path to the not-found route', () => {
    expect(router.resolve('/no/such/path').name).toBe('not-found');
  });
});
