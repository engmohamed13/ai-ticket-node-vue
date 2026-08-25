import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/env';
import { TOKEN_STORAGE_KEY } from '../config/storage';
import { emitUnauthorized } from './authEvents';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      emitUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
