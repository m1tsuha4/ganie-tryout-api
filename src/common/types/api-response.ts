export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, any>;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  data: null;
  error?: {
    code: string;
    details?: any;
  };
  errors?: Record<string, string>;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;
