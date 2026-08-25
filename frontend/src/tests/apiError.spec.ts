import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { toErrorMessage } from '../services/apiError';

describe('toErrorMessage', () => {
  it('returns the backend message from an AxiosError response', () => {
    const error = new AxiosError('Request failed with status code 403', undefined, undefined, undefined, {
      status: 403,
      data: { success: false, message: 'Forbidden: insufficient permissions', data: null },
      statusText: 'Forbidden',
      headers: {},
      config: {} as never
    });

    expect(toErrorMessage(error, 'fallback')).toBe('Forbidden: insufficient permissions');
  });

  it('falls back to a plain Error message', () => {
    expect(toErrorMessage(new Error('Something broke'), 'fallback')).toBe('Something broke');
  });

  it('returns the fallback for null, undefined, and a string', () => {
    expect(toErrorMessage(null, 'fallback')).toBe('fallback');
    expect(toErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(toErrorMessage('oops', 'fallback')).toBe('fallback');
  });

  it('falls back to the AxiosError own message when there is no response payload', () => {
    const error = new AxiosError('Network Error');
    expect(toErrorMessage(error, 'fallback')).toBe('Network Error');
  });
});
