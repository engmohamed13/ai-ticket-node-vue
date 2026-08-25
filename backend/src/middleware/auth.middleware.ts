import { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyAuthToken } from '../auth/jwt';
import type { AuthTokenPayload } from '../auth/jwt';
import type { Permission } from '../auth/permissions';
import { AppError } from '../utils/AppError';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('Authorization');
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(new AppError(401, 'Access denied. Missing or invalid Authorization header.'));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (token.length === 0) {
    next(new AppError(401, 'Access denied. Token missing.'));
    return;
  }

  try {
    req.auth = verifyAuthToken(token);
  } catch (error) {
    const expired = error instanceof Error && error.name === 'TokenExpiredError';
    next(new AppError(401, expired ? 'Token expired' : 'Invalid token'));
    return;
  }

  next();
};

export const requirePermission =
  (...required: Permission[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      next(new AppError(401, 'Not authenticated'));
      return;
    }

    const missing = required.filter((permission) => !auth.permissions.includes(permission));
    if (missing.length > 0) {
      next(new AppError(403, 'Forbidden: insufficient permissions', { missing }));
      return;
    }

    next();
  };

/** Narrow `req.auth` for controllers that run behind `authenticate`. */
export const getAuth = (req: Request): AuthTokenPayload => {
  if (!req.auth) throw new AppError(401, 'Not authenticated');
  return req.auth;
};
