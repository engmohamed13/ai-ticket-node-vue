import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import router from '../router';
import { useAuthStore } from '../stores/auth';
import type { AuthUser, RoleKey } from '../types';
import { ROLES } from '../types';

/**
 * Sets the auth store's session directly. `beforeEach` already consumes the store's
 * one-time `restore()` pass (against an empty localStorage), so this direct mutation
 * is what the guard reads on the next navigation — no localStorage round-trip needed.
 */
const seedSession = (permissions: string[] = [], roleKey: RoleKey = 'SYSTEM_ADMINISTRATOR'): void => {
  const auth = useAuthStore();
  const user: AuthUser = {
    id: 1,
    name: 'Test User',
    email: 'test@crm.local',
    isActive: true,
    roleKey,
    roleName: roleKey,
    permissions: permissions as AuthUser['permissions'],
    customerId: null,
    department: null,
    branch: null
  };
  auth.token = 'jwt-test-token';
  auth.user = user;
};

const clearSession = (): void => {
  useAuthStore().clear();
};

/**
 * Vue Router silently no-ops a `push` to the exact location it is already at, which
 * would skip the guard under test and make these assertions order-dependent on
 * whatever the previous test left `currentRoute` as. Bouncing through an unregistered
 * path (which always resolves to the catch-all `not-found` route) first guarantees the
 * real target push below is a genuine transition, so the guard always runs.
 */
const goto = async (path: string): Promise<void> => {
  await router.push('/__reset__').catch(() => {});
  await router.push(path);
};

describe('router navigation guard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    // Consumes the store's one-time `restore()` pass against an empty localStorage,
    // so the `seedSession`/`clearSession` calls below are the source of truth the
    // guard reads on every subsequent navigation in this test.
    useAuthStore().restore();
  });

  it('redirects an anonymous user to login with a redirect query param', async () => {
    clearSession();

    await goto('/users');

    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.redirect).toBe('/users');
  });

  it('allows a session with users:read to reach /users', async () => {
    seedSession(['users:read']);

    await goto('/users');

    expect(router.currentRoute.value.name).toBe('users');
  });

  it('sends a session lacking users:read to /forbidden', async () => {
    seedSession(['tickets:read']);

    await goto('/users');

    expect(router.currentRoute.value.name).toBe('forbidden');
  });

  it('bounces a signed-in user away from /login to /dashboard', async () => {
    seedSession(['users:read']);

    await goto('/login');

    expect(router.currentRoute.value.name).toBe('dashboard');
  });

  it('lets every session reach / and /health with no permission required', async () => {
    for (const roleKey of ROLES) {
      seedSession([], roleKey);

      await goto('/');
      expect(router.currentRoute.value.name).toBe('dashboard');

      await goto('/health');
      expect(router.currentRoute.value.name).toBe('system-health');
    }
  });

  it('resolves an unknown path to not-found even with a session', async () => {
    seedSession(['users:read']);

    await goto('/no/such/path');

    expect(router.currentRoute.value.name).toBe('not-found');
  });
});
