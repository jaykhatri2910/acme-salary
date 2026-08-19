import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
}

/**
 * Centralised error handler.
 * All errors passed via next(err) land here.
 * Always returns { error: string } — optionally includes validation details.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Zod validation errors → 400
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    logger.error({ err }, 'Unhandled server error');
  }

  res.status(statusCode).json({
    error: err.message ?? 'Internal server error',
  });
}
