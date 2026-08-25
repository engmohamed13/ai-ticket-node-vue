import type { AuthTokenPayload } from './jwt';
import { AppError } from '../utils/AppError';

/** True when this token belongs to an external customer rather than a staff user. */
export const isCustomerScoped = (auth: AuthTokenPayload): boolean => auth.roleKey === 'CUSTOMER';

/**
 * Deny a CUSTOMER-role user access to another customer's records. Staff roles pass through.
 * A CUSTOMER-role user with no linked `customerId` is denied outright — the schema allows
 * that combination (Story 07 task 6) but it can never own anything.
 */
export const assertCustomerScope = (auth: AuthTokenPayload, customerId: number): void => {
  if (!isCustomerScoped(auth)) return;
  if (auth.customerId === null) {
    throw new AppError(403, 'This account is not linked to a customer record');
  }
  if (auth.customerId !== customerId) {
    throw new AppError(403, 'You can only access your own records');
  }
};

/** The customerId a list query must be forced to, or `undefined` for staff (no restriction). */
export const scopedCustomerId = (auth: AuthTokenPayload): number | undefined =>
  isCustomerScoped(auth) ? (auth.customerId ?? -1) : undefined;
