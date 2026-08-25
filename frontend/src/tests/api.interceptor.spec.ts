import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import api from '../services/api';
import { onUnauthorized } from '../services/authEvents';
import { TOKEN_STORAGE_KEY } from '../config/storage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const requestHandlers = (api.interceptors.request as any).handlers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const responseHandlers = (api.interceptors.response as any).handlers;

describe('api request interceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('attaches Authorization when a token is stored', () => {
    localStorage.setItem(TOKEN_STORAGE_KEY, 'abc');
    const config = { headers: new AxiosHeaders() };

    const result = requestHandlers[0].fulfilled(config);

    expect(result.headers.Authorization).toBe('Bearer abc');
  });

  it('leaves Authorization undefined when there is no stored token', () => {
    const config = { headers: new AxiosHeaders() };

    const result = requestHandlers[0].fulfilled(config);

    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('api response interceptor', () => {
  it('emits unauthorized for a 401 and still rejects', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);

    const error = new AxiosError('Unauthorized', undefined, undefined, undefined, {
      status: 401,
      data: {},
      statusText: 'Unauthorized',
      headers: {},
      config: {} as never
    });

    await expect(responseHandlers[0].rejected(error)).rejects.toBe(error);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not emit unauthorized for a 403', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);

    const error = new AxiosError('Forbidden', undefined, undefined, undefined, {
      status: 403,
      data: {},
      statusText: 'Forbidden',
      headers: {},
      config: {} as never
    });

    await expect(responseHandlers[0].rejected(error)).rejects.toBe(error);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not emit unauthorized for a 500', async () => {
    const handler = vi.fn();
    onUnauthorized(handler);

    const error = new AxiosError('Server error', undefined, undefined, undefined, {
      status: 500,
      data: {},
      statusText: 'Internal Server Error',
      headers: {},
      config: {} as never
    });

    await expect(responseHandlers[0].rejected(error)).rejects.toBe(error);
    expect(handler).not.toHaveBeenCalled();
  });
});
