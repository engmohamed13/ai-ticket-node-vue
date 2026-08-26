import { PERMISSIONS } from './permissions';
import type { Permission } from './permissions';

export const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'CRM_MANAGER',
  'SUPPORT_SUPERVISOR',
  'SUPPORT_AGENT',
  'CUSTOMER',
  'REPORTING_USER'
] as const;

export type RoleKey = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SYSTEM_ADMINISTRATOR: 'System Administrator',
  CRM_MANAGER: 'CRM Manager',
  SUPPORT_SUPERVISOR: 'Support Supervisor',
  SUPPORT_AGENT: 'Support Agent',
  CUSTOMER: 'Customer',
  REPORTING_USER: 'Reporting User'
};

/**
 * Seed-time default only. `role_permissions` is the runtime source of truth once an
 * administrator edits a role through the API (Story 08) — re-running the seed resets
 * every role back to this map.
 */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  SYSTEM_ADMINISTRATOR: PERMISSIONS,
  CRM_MANAGER: [
    'users:read',
    'roles:read',
    'orgunits:read',
    'customers:read',
    'customers:manage',
    'tickets:read',
    'tickets:manage',
    'interactions:read',
    'interactions:create',
    'interactions:associate',
    'feedback:read',
    'kb:read',
    'kb:manage',
    'reports:read'
  ],
  SUPPORT_SUPERVISOR: [
    'customers:read',
    'customers:manage',
    'tickets:read',
    'tickets:manage',
    'interactions:read',
    'interactions:create',
    'interactions:associate',
    'feedback:read',
    'kb:read',
    'kb:manage',
    'reports:read'
  ],
  SUPPORT_AGENT: [
    'customers:read',
    'customers:manage',
    'tickets:read',
    'tickets:manage',
    'interactions:read',
    'interactions:create',
    'interactions:associate',
    'feedback:read'
  ],
  // `feedback:read` lets a customer see the rating it already left on its own ticket; the
  // route still runs assertCustomerScope, so it can never read another customer's feedback.
  CUSTOMER: [
    'tickets:read',
    'interactions:read',
    'interactions:create',
    'feedback:read',
    'feedback:write',
    'kb:read'
  ],
  REPORTING_USER: [
    'customers:read',
    'tickets:read',
    'interactions:read',
    'feedback:read',
    'kb:read',
    'reports:read'
  ]
};
