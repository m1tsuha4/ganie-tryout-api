import { ApiSuccessResponse, ApiErrorResponse } from '../types/api-response';

export function ok<T = any>(
  data: T,
  message = 'OK',
  meta?: Record<string, any>,
): ApiSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  };
}

export function fail(
  message: string,
  code = 'ERROR',
  details?: any,
): ApiErrorResponse {
  return {
    success: false,
    message,
    data: null,
    error: {
      code,
      ...(details ? { details } : {}),
    },
  };
}
