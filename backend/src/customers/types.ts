export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
