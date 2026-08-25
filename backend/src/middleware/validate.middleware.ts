import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const key of ['body', 'params', 'query'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: `${key}.${issue.path.join('.')}`,
          message: issue.message
        }));
        return next(new AppError(400, 'Validation failed', details));
      }
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
