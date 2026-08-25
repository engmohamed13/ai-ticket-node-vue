import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { AxiosError } from 'axios';
import { useAuthStore } from '../stores/auth';
import { fetchCurrentUser, login, logout } from '../services/auth.service';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../config/storage';
import type { AuthUser } from '../types';

vi.mock('../services/auth.service', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchCurrentUser: vi.fn()
}));

const mockedLogin = login as unknown as ReturnType<typeof vi.fn>;
const mockedLogout = logout as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCurrentUser = fetchCurrentUser as unknown as ReturnType<typeof vi.fn>;

const sampleUser: AuthUser = {
  id: 1,
  name: 'Admin',
  email: 'admin@crm.local',
  isActive: true,
  roleKey: 'SYSTEM_ADMINISTRATOR',
  roleName: 'System Administrator',
  permissions: ['users:read', 'users:manage'],
  customerId: null,
  department: null,
  branch: null
};

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('signIn success sets token, user, and persists both to localStorage', async () => {
    mockedLogin.mockResolvedValue({ token: 'jwt-123', user: sampleUser });

    const store = useAuthStore();
    const result = await store.signIn({ email: 'admin@crm.local', password: 'Passw0rd!' });

    expect(result).toBe(true);
    expect(store.token).toBe('jwt-123');
    expect(store.user).toEqual(sampleUser);
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe('jwt-123');
    expect(JSON.parse(localStorage.getItem(USER_STORAGE_KEY) as string)).toEqual(sampleUser);
  });

  it('signIn failure returns false, sets error, and leaves no session', async () => {
    const axiosError = new AxiosError('Request failed with status code 401', undefined, undefined, undefined, {
      status: 401,
      data: { success: false, message: 'Invalid email or password', data: null },
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never
    });
    mockedLogin.mockRejectedValue(axiosError);

    const store = useAuthStore();
    const result = await store.signIn({ email: 'admin@crm.local', password: 'wrong' });

    expect(result).toBe(false);
    expect(store.error).toBe('Invalid email or password');
    expect(store.isAuthenticated).toBe(false);
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
  });

  it('restore rehydrates token and user when both keys are present', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-123');
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(sampleUser));

    const store = useAuthStore();
    store.restore();

    expect(store.token).toBe('jwt-123');
    expect(store.user).toEqual(sampleUser);
  });

  it('restore clears the session when only the token is present', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-123');

    const store = useAuthStore();
    store.restore();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
  });

  it('restore clears the session when the stored user JSON is malformed', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'jwt-123');
    localStorage.setItem(USER_STORAGE_KEY, '{not-json');

    const store = useAuthStore();
    expect(() => store.restore()).not.toThrow();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
  });

  it('restore called twice does not overwrite state set by signIn', async () => {
    mockedLogin.mockResolvedValue({ token: 'jwt-123', user: sampleUser });

    const store = useAuthStore();
    await store.signIn({ email: 'admin@crm.local', password: 'Passw0rd!' });
    store.restore();

    expect(store.token).toBe('jwt-123');
    expect(store.user).toEqual(sampleUser);
  });

  it('can returns true only when the permission is present', () => {
    const store = useAuthStore();
    store.user = sampleUser;
    store.token = 'jwt-123';

    expect(store.can('users:read')).toBe(true);
    expect(store.can('roles:manage')).toBe(false);
  });

  it('can returns false when user is null', () => {
    const store = useAuthStore();
    expect(store.can('users:read')).toBe(false);
  });

  it('signOut clears state and storage even when logout rejects', async () => {
    mockedLogin.mockResolvedValue({ token: 'jwt-123', user: sampleUser });
    mockedLogout.mockRejectedValue(new Error('network down'));

    const store = useAuthStore();
    await store.signIn({ email: 'admin@crm.local', password: 'Passw0rd!' });
    await store.signOut();

    expect(store.token).toBeNull();
    expect(store.user).toBeNull();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
  });

  it('refreshCurrentUser replaces user and rewrites storage', async () => {
    mockedLogin.mockResolvedValue({ token: 'jwt-123', user: sampleUser });
    const updatedUser = { ...sampleUser, roleName: 'Updated Role' };
    mockedFetchCurrentUser.mockResolvedValue(updatedUser);

    const store = useAuthStore();
    await store.signIn({ email: 'admin@crm.local', password: 'Passw0rd!' });
    await store.refreshCurrentUser();

    expect(store.user).toEqual(updatedUser);
    expect(JSON.parse(localStorage.getItem(USER_STORAGE_KEY) as string)).toEqual(updatedUser);
  });

  it('refreshCurrentUser no-ops when there is no token', async () => {
    const store = useAuthStore();
    await store.refreshCurrentUser();

    expect(mockedFetchCurrentUser).not.toHaveBeenCalled();
  });
});
