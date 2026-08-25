import api from './api';
import type { ApiResponse, AuthUser, LoginPayload, LoginResult } from '../types';

export const login = async (payload: LoginPayload): Promise<LoginResult> => {
  const response = await api.post<ApiResponse<LoginResult>>('/auth/login', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Login failed');
  return response.data.data;
};

export const logout = async (): Promise<void> => {
  await api.post<ApiResponse<null>>('/auth/logout');
};

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await api.get<ApiResponse<AuthUser>>('/auth/me');
  if (!response.data.data) throw new Error(response.data.message || 'Unable to load the current user');
  return response.data.data;
};
