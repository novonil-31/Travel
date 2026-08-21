/**
 * ACCESS — Central error handler middleware
 * Catches all unhandled errors. Never exposes internal stack traces in production.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../logger.js';
import { sendError, Errors } from './response.js';
import { config } from '../config.js';

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    sendError(res, Errors.VALIDATION_ERROR, 'Request validation failed', 422, err.flatten());
    return;
  }

  // Known HTTP errors with statusCode property
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const e = err as { statusCode: number; message: string; code?: string };
    sendError(res, e.code ?? Errors.INTERNAL_ERROR, e.message, e.statusCode);
    return;
  }

  // Unexpected errors
  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      userId: req.user?.userId,
    },
    'Unhandled error',
  );

  const message = config.isProduction
    ? 'An internal error occurred'
    : err instanceof Error
      ? err.message
      : String(err);

  sendError(res, Errors.INTERNAL_ERROR, message, 500);
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, Errors.NOT_FOUND, `Route ${req.method} ${req.path} not found`, 404);
}
