import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import { login, logout, fetchCurrentUser } from '../services/auth.service';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;

describe('login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to /auth/login and returns the result', async () => {
    const result = {
      token: 'jwt-token',
      user: {
        id: 1,
        name: 'Admin',
        email: 'admin@crm.local',
        isActive: true,
        roleKey: 'SYSTEM_ADMINISTRATOR',
        roleName: 'System Administrator',
        permissions: ['users:read'],
        customerId: null,
        department: null,
        branch: null
      }
    };
    mockedPost.mockResolvedValue({ data: { success: true, message: 'OK', data: result } });

    const payload = { email: 'admin@crm.local', password: 'Passw0rd!' };
    const response = await login(payload);

    expect(response).toEqual(result);
    expect(mockedPost).toHaveBeenCalledWith('/auth/login', payload);
  });

  it('throws the backend message when data is null', async () => {
    mockedPost.mockResolvedValue({ data: { success: false, message: 'Invalid email or password', data: null } });

    await expect(login({ email: 'x@y.z', password: 'wrong' })).rejects.toThrow('Invalid email or password');
  });
});

describe('logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts to /auth/logout', async () => {
    mockedPost.mockResolvedValue({ data: { success: true, message: 'Logout successful', data: null } });

    await logout();

    expect(mockedPost).toHaveBeenCalledWith('/auth/logout');
  });
});

describe('fetchCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('gets /auth/me and returns the AuthUser', async () => {
    const user = {
      id: 1,
      name: 'Admin',
      email: 'admin@crm.local',
      isActive: true,
      roleKey: 'SYSTEM_ADMINISTRATOR',
      roleName: 'System Administrator',
      permissions: ['users:read'],
      customerId: null,
      department: null,
      branch: null
    };
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: user } });

    const result = await fetchCurrentUser();

    expect(result).toEqual(user);
    expect(mockedGet).toHaveBeenCalledWith('/auth/me');
  });

  it('throws when data is null', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Not authenticated', data: null } });

    await expect(fetchCurrentUser()).rejects.toThrow('Not authenticated');
  });
});
