import { AxiosError } from 'axios';

/** Pulls the backend's `{ success, message, data }` message out of an axios rejection. */
export const toErrorMessage = (cause: unknown, fallback: string): string => {
  if (cause instanceof AxiosError) {
    const payload = cause.response?.data as { message?: string } | undefined;
    if (payload?.message) return payload.message;
  }
  if (cause instanceof Error && cause.message) return cause.message;
  return fallback;
};
