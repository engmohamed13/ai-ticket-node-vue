import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useUsersStore } from '../stores/users';
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

vi.mock('../services/users.service', () => ({
  fetchUsers: vi.fn(),
  fetchRoles: vi.fn(),
  fetchPermissions: vi.fn(),
  fetchBranches: vi.fn(),
  fetchDepartments: vi.fn(),
  createUser: vi.fn(),
  changeUserPassword: vi.fn(),
  deactivateUser: vi.fn(),
  setRolePermissions: vi.fn()
}));

const mockedFetchUsers = fetchUsers as unknown as ReturnType<typeof vi.fn>;
const mockedFetchRoles = fetchRoles as unknown as ReturnType<typeof vi.fn>;
const mockedFetchPermissions = fetchPermissions as unknown as ReturnType<typeof vi.fn>;
const mockedFetchBranches = fetchBranches as unknown as ReturnType<typeof vi.fn>;
const mockedFetchDepartments = fetchDepartments as unknown as ReturnType<typeof vi.fn>;
const mockedCreateUser = createUser as unknown as ReturnType<typeof vi.fn>;
const mockedChangeUserPassword = changeUserPassword as unknown as ReturnType<typeof vi.fn>;
const mockedDeactivateUser = deactivateUser as unknown as ReturnType<typeof vi.fn>;
const mockedSetRolePermissions = setRolePermissions as unknown as ReturnType<typeof vi.fn>;

describe('useUsersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loadDirectory populates users, roles, branches, departments and toggles loading', async () => {
    mockedFetchUsers.mockResolvedValue([{ id: 1, name: 'Zed' }, { id: 2, name: 'Alice' }]);
    mockedFetchRoles.mockResolvedValue([{ id: 1, name: 'Admin' }]);
    mockedFetchBranches.mockResolvedValue([{ id: 1, name: 'HQ' }]);
    mockedFetchDepartments.mockResolvedValue([{ id: 1, name: 'Ops' }]);

    const store = useUsersStore();
    const promise = store.loadDirectory();
    expect(store.loading).toBe(true);
    await promise;

    expect(store.loading).toBe(false);
    expect(store.users).toHaveLength(2);
    expect(store.roles).toHaveLength(1);
    expect(store.branches).toHaveLength(1);
    expect(store.departments).toHaveLength(1);
  });

  it('loadDirectory sets error and stops loading when a fetch rejects', async () => {
    mockedFetchUsers.mockRejectedValue(new Error('boom'));
    mockedFetchRoles.mockResolvedValue([]);
    mockedFetchBranches.mockResolvedValue([]);
    mockedFetchDepartments.mockResolvedValue([]);

    const store = useUsersStore();
    await store.loadDirectory();

    expect(store.error).toBe('boom');
    expect(store.loading).toBe(false);
  });

  it('loadRoleMatrix populates roles and permissions', async () => {
    mockedFetchRoles.mockResolvedValue([{ id: 1, name: 'Admin' }]);
    mockedFetchPermissions.mockResolvedValue([{ id: 1, key: 'users:read' }]);

    const store = useUsersStore();
    await store.loadRoleMatrix();

    expect(store.roles).toHaveLength(1);
    expect(store.permissions).toHaveLength(1);
  });

  it('submitUser appends the created user sorted by name, sets notice, returns true', async () => {
    const created = { id: 3, name: 'Aaron', email: 'aaron@crm.local' };
    mockedCreateUser.mockResolvedValue(created);

    const store = useUsersStore();
    store.users = [{ id: 1, name: 'Zed' } as never];

    const result = await store.submitUser({ name: 'Aaron', email: 'aaron@crm.local', password: 'Passw0rd!', roleId: 1 });

    expect(result).toBe(true);
    expect(store.users.map((u) => u.name)).toEqual(['Aaron', 'Zed']);
    expect(store.notice).toContain('aaron@crm.local');
  });

  it('submitUser sets error and returns false on rejection, leaving users unchanged', async () => {
    mockedCreateUser.mockRejectedValue(new Error('A user with email x already exists'));

    const store = useUsersStore();
    store.users = [{ id: 1, name: 'Zed' } as never];

    const result = await store.submitUser({ name: 'X', email: 'x@y.z', password: 'Passw0rd!', roleId: 1 });

    expect(result).toBe(false);
    expect(store.error).toBe('A user with email x already exists');
    expect(store.users).toHaveLength(1);
  });

  it('resetPassword sets notice and returns true', async () => {
    mockedChangeUserPassword.mockResolvedValue(undefined);

    const store = useUsersStore();
    const result = await store.resetPassword(1, 'NewPassw0rd!');

    expect(result).toBe(true);
    expect(store.notice).toBe('Password updated');
  });

  it('resetPassword returns false on rejection', async () => {
    mockedChangeUserPassword.mockRejectedValue(new Error('boom'));

    const store = useUsersStore();
    const result = await store.resetPassword(1, 'short');

    expect(result).toBe(false);
    expect(store.error).toBe('boom');
  });

  it('deactivate replaces the matching row and returns true', async () => {
    const updated = { id: 1, name: 'Zed', isActive: false };
    mockedDeactivateUser.mockResolvedValue(updated);

    const store = useUsersStore();
    store.users = [{ id: 1, name: 'Zed', isActive: true } as never];

    const result = await store.deactivate(1);

    expect(result).toBe(true);
    expect(store.users[0]).toEqual(updated);
  });

  it('saveRolePermissions replaces the matching role and sets notice', async () => {
    const updated = { id: 2, name: 'Support Agent', permissions: ['tickets:read'] };
    mockedSetRolePermissions.mockResolvedValue(updated);

    const store = useUsersStore();
    store.roles = [{ id: 2, name: 'Support Agent', permissions: [] } as never];

    await store.saveRolePermissions(2, ['tickets:read']);

    expect(store.roles[0]).toEqual(updated);
    expect(store.notice).toContain('Support Agent');
  });
});
