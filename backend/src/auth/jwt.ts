import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Permission } from './permissions';
import type { RoleKey } from './roles';

/**
 * The JWT payload — also the request-scoped auth context. Permissions are baked into
 * the token at login so `requirePermission` needs no database round-trip per request.
 * The trade-off: a permission change takes effect on the user's next login, not
 * immediately. See `## Edge Cases & Failure Modes`.
 */
export interface AuthTokenPayload {
  userId: number;
  email: string;
  roleKey: RoleKey;
  /** Set only for CUSTOMER-role users; scopes them to their own records. */
  customerId: number | null;
  permissions: Permission[];
}

export const signAuthToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });

export const verifyAuthToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
