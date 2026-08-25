import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';

export const notFoundMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
