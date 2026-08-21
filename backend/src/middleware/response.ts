/**
 * ACCESS — Standard API response helpers
 * Every response follows: { success, data, error, meta? }
 */

import type { Response } from 'express';

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  error: null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  success: false;
  data: null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: Record<string, unknown>,
): void {
  const body: ApiSuccess<T> = { success: true, data, error: null };
  if (meta) body.meta = meta;
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: unknown,
): void {
  const body: ApiError = {
    success: false,
    data: null,
    error: { code, message, ...(details !== undefined && { details }) },
  };
  res.status(statusCode).json(body);
}

export const Errors = {
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  CONFLICT: 'CONFLICT',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  DATA_UNAVAILABLE: 'DATA_UNAVAILABLE',
} as const;
