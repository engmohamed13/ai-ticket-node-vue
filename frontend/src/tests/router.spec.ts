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

  it('resolves /login to the login route', () => {
    expect(router.resolve('/login').name).toBe('login');
  });

  it('resolves /users to the users route', () => {
    expect(router.resolve('/users').name).toBe('users');
  });

  it('resolves /roles to the roles route', () => {
    expect(router.resolve('/roles').name).toBe('roles');
  });

  it('resolves /forbidden to the forbidden route', () => {
    expect(router.resolve('/forbidden').name).toBe('forbidden');
  });
});
