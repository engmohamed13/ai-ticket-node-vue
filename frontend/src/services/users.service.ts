import api from './api';
import type {
  ApiResponse,
  AuthUser,
  Branch,
  CreateUserPayload,
  Department,
  Permission,
  PermissionRecord,
  Role
} from '../types';

export const fetchUsers = async (): Promise<AuthUser[]> => {
  const response = await api.get<ApiResponse<AuthUser[]>>('/users');
  return response.data.data ?? [];
};

export const createUser = async (payload: CreateUserPayload): Promise<AuthUser> => {
  const response = await api.post<ApiResponse<AuthUser>>('/users', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to create the user');
  return response.data.data;
};

export const changeUserPassword = async (userId: number, password: string): Promise<void> => {
  await api.patch<ApiResponse<null>>(`/users/${userId}/password`, { password });
};

export const deactivateUser = async (userId: number): Promise<AuthUser> => {
  const response = await api.delete<ApiResponse<AuthUser>>(`/users/${userId}`);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to deactivate the user');
  return response.data.data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const response = await api.get<ApiResponse<Role[]>>('/roles');
  return response.data.data ?? [];
};

export const fetchPermissions = async (): Promise<PermissionRecord[]> => {
  const response = await api.get<ApiResponse<PermissionRecord[]>>('/permissions');
  return response.data.data ?? [];
};

export const setRolePermissions = async (roleId: number, permissions: Permission[]): Promise<Role> => {
  const response = await api.put<ApiResponse<Role>>(`/roles/${roleId}/permissions`, { permissions });
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update role permissions');
  return response.data.data;
};

export const fetchBranches = async (): Promise<Branch[]> => {
  const response = await api.get<ApiResponse<Branch[]>>('/branches');
  return response.data.data ?? [];
};

export const fetchDepartments = async (branchId?: number): Promise<Department[]> => {
  const response = await api.get<ApiResponse<Department[]>>('/departments', {
    params: branchId === undefined ? undefined : { branchId }
  });
  return response.data.data ?? [];
};
