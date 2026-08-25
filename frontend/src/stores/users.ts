import { defineStore } from 'pinia';
import { ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
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
import type {
  AuthUser,
  Branch,
  CreateUserPayload,
  Department,
  Permission,
  PermissionRecord,
  Role
} from '../types';

export const useUsersStore = defineStore('users', () => {
  const users = ref<AuthUser[]>([]);
  const roles = ref<Role[]>([]);
  const permissions = ref<PermissionRecord[]>([]);
  const branches = ref<Branch[]>([]);
  const departments = ref<Department[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const loadDirectory = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const [loadedUsers, loadedRoles, loadedBranches, loadedDepartments] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchBranches(),
        fetchDepartments()
      ]);
      users.value = loadedUsers;
      roles.value = loadedRoles;
      branches.value = loadedBranches;
      departments.value = loadedDepartments;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load users');
    } finally {
      loading.value = false;
    }
  };

  const loadRoleMatrix = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const [loadedRoles, loadedPermissions] = await Promise.all([fetchRoles(), fetchPermissions()]);
      roles.value = loadedRoles;
      permissions.value = loadedPermissions;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load roles');
    } finally {
      loading.value = false;
    }
  };

  const submitUser = async (payload: CreateUserPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const created = await createUser(payload);
      users.value = [...users.value, created].sort((a, b) => a.name.localeCompare(b.name));
      notice.value = `User ${created.email} created`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to create the user');
      return false;
    }
  };

  const resetPassword = async (userId: number, password: string): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      await changeUserPassword(userId, password);
      notice.value = 'Password updated';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update the password');
      return false;
    }
  };

  const deactivate = async (userId: number): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const updated = await deactivateUser(userId);
      users.value = users.value.map((entry) => (entry.id === updated.id ? updated : entry));
      notice.value = `User ${updated.email} deactivated`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to deactivate the user');
      return false;
    }
  };

  const saveRolePermissions = async (roleId: number, keys: Permission[]): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const updated = await setRolePermissions(roleId, keys);
      roles.value = roles.value.map((role) => (role.id === updated.id ? updated : role));
      notice.value = `Permissions updated for ${updated.name}`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update role permissions');
      return false;
    }
  };

  return {
    users,
    roles,
    permissions,
    branches,
    departments,
    loading,
    error,
    notice,
    loadDirectory,
    loadRoleMatrix,
    submitUser,
    resetPassword,
    deactivate,
    saveRolePermissions
  };
});
