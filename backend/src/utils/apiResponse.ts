export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export const ok = <T>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, data });
export const fail = (message: string): ApiResponse<never> => ({ success: false, message, data: null });
