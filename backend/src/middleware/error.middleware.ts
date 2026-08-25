import { NextFunction, Request, Response } from 'express';
import { logger } from '../config/logger';
import { AppError } from '../utils/AppError';
import { fail } from '../utils/apiResponse';

export const globalErrorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error({ err }, 'Unhandled server error');

  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  const response: ReturnType<typeof fail> & { details?: unknown } = fail(message);
  if (err instanceof AppError && status < 500 && err.details !== undefined) {
    response.details = err.details;
  }

  res.status(status).json(response);
};
