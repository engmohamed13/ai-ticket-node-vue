import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../services/api';
import {
  changeUserPassword,
  createUser,
  deactivateUser,
  fetchBranches,
  fetchDepartments,
  fetchPermissions,
  fetchRoles,
  fetchUsers,
  setRolePermissions
} from '../services/users.service';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

const mockedGet = api.get as unknown as ReturnType<typeof vi.fn>;
const mockedPost = api.post as unknown as ReturnType<typeof vi.fn>;
const mockedPatch = api.patch as unknown as ReturnType<typeof vi.fn>;
const mockedPut = api.put as unknown as ReturnType<typeof vi.fn>;
const mockedDelete = api.delete as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchUsers', () => {
  it('unwraps data.data', async () => {
    const users = [{ id: 1, name: 'Admin' }];
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: users } });

    const result = await fetchUsers();

    expect(result).toEqual(users);
    expect(mockedGet).toHaveBeenCalledWith('/users');
  });

  it('returns [] when data is null', async () => {
    mockedGet.mockResolvedValue({ data: { success: false, message: 'Err', data: null } });

    expect(await fetchUsers()).toEqual([]);
  });
});

describe('fetchRoles', () => {
  it('unwraps data.data and defaults to []', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [{ id: 1 }] } });
    expect(await fetchRoles()).toEqual([{ id: 1 }]);

    mockedGet.mockResolvedValue({ data: { success: false, message: 'Err', data: null } });
    expect(await fetchRoles()).toEqual([]);
  });
});

describe('fetchPermissions', () => {
  it('unwraps data.data and defaults to []', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [{ id: 1 }] } });
    expect(await fetchPermissions()).toEqual([{ id: 1 }]);

    mockedGet.mockResolvedValue({ data: { success: false, message: 'Err', data: null } });
    expect(await fetchPermissions()).toEqual([]);
  });
});

describe('fetchBranches', () => {
  it('unwraps data.data and defaults to []', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [{ id: 1 }] } });
    expect(await fetchBranches()).toEqual([{ id: 1 }]);

    mockedGet.mockResolvedValue({ data: { success: false, message: 'Err', data: null } });
    expect(await fetchBranches()).toEqual([]);
  });
});

describe('fetchDepartments', () => {
  it('passes branchId as a param when provided', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchDepartments(1);

    expect(mockedGet).toHaveBeenCalledWith('/departments', { params: { branchId: 1 } });
  });

  it('passes undefined params when branchId is omitted', async () => {
    mockedGet.mockResolvedValue({ data: { success: true, message: 'OK', data: [] } });

    await fetchDepartments();

    expect(mockedGet).toHaveBeenCalledWith('/departments', { params: undefined });
  });
});

describe('createUser', () => {
  it('posts to /users and returns the created user', async () => {
    const created = { id: 2, name: 'New Agent' };
    mockedPost.mockResolvedValue({ data: { success: true, message: 'User created', data: created } });

    const payload = { name: 'New Agent', email: 'new@crm.local', password: 'Passw0rd!', roleId: 3 };
    const result = await createUser(payload);

    expect(result).toEqual(created);
    expect(mockedPost).toHaveBeenCalledWith('/users', payload);
  });

  it('throws when data is null', async () => {
    mockedPost.mockResolvedValue({ data: { success: false, message: 'A user with email x already exists', data: null } });

    await expect(
      createUser({ name: 'X', email: 'x@y.z', password: 'Passw0rd!', roleId: 1 })
    ).rejects.toThrow('A user with email x already exists');
  });
});

describe('changeUserPassword', () => {
  it('patches /users/:id/password with the password', async () => {
    mockedPatch.mockResolvedValue({ data: { success: true, message: 'Password updated', data: null } });

    await changeUserPassword(3, 'Passw0rd!');

    expect(mockedPatch).toHaveBeenCalledWith('/users/3/password', { password: 'Passw0rd!' });
  });
});

describe('deactivateUser', () => {
  it('deletes /users/:id and returns the updated user', async () => {
    const updated = { id: 3, isActive: false };
    mockedDelete.mockResolvedValue({ data: { success: true, message: 'User deactivated', data: updated } });

    const result = await deactivateUser(3);

    expect(result).toEqual(updated);
    expect(mockedDelete).toHaveBeenCalledWith('/users/3');
  });
});

describe('setRolePermissions', () => {
  it('puts /roles/:id/permissions with the permissions list', async () => {
    const updated = { id: 2, permissions: ['tickets:read'] };
    mockedPut.mockResolvedValue({ data: { success: true, message: 'Role permissions updated', data: updated } });

    const result = await setRolePermissions(2, ['tickets:read']);

    expect(result).toEqual(updated);
    expect(mockedPut).toHaveBeenCalledWith('/roles/2/permissions', { permissions: ['tickets:read'] });
  });
});
