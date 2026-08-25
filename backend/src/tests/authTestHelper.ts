import { signAuthToken } from '../auth/jwt';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthTokenPayload } from '../auth/jwt';

const ADMIN_PAYLOAD: AuthTokenPayload = {
  userId: 1,
  email: 'admin@crm.local',
  roleKey: 'SYSTEM_ADMINISTRATOR',
  customerId: null,
  permissions: [...PERMISSIONS]
};

/** `Authorization` header value for a full-permission staff token, unless overridden. */
export const bearer = (overrides: Partial<AuthTokenPayload> = {}): string =>
  `Bearer ${signAuthToken({ ...ADMIN_PAYLOAD, ...overrides })}`;
