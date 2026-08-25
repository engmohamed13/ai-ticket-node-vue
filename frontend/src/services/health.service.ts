import api from './api';
import type { ApiResponse, DatabaseHealth, HealthPayload } from '../types';

export const fetchHealth = async (): Promise<HealthPayload> => {
  const response = await api.get<ApiResponse<HealthPayload>>('/health', {
    // 503 is a valid, meaningful response here, not a transport failure.
    validateStatus: (status) => status === 200 || status === 503
  });
  if (!response.data.data) throw new Error(response.data.message || 'Empty health payload');
  return response.data.data;
};

export const fetchDatabaseHealth = async (): Promise<DatabaseHealth> => {
  const response = await api.get<ApiResponse<{ database: DatabaseHealth }>>('/health/db', {
    validateStatus: (status) => status === 200 || status === 503
  });
  if (!response.data.data) throw new Error(response.data.message || 'Empty database health payload');
  return response.data.data.database;
};
