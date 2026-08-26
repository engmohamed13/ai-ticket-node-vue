export const PERMISSIONS = [
  'users:read',
  'users:manage',
  'roles:read',
  'roles:manage',
  'orgunits:read',
  'orgunits:manage',
  'customers:read',
  'customers:manage',
  'tickets:read',
  'tickets:manage',
  'interactions:read',
  'interactions:create',
  'interactions:associate',
  'reports:read'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Human-readable copy for the roles/permissions admin screen (Story 09) and the seeded `permissions.description` column. */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'users:read': 'View users, their roles, departments, and branches',
  'users:manage': 'Create, update, deactivate users and reset their passwords',
  'roles:read': 'View roles and the permissions assigned to them',
  'roles:manage': 'Change which permissions a role grants',
  'orgunits:read': 'View departments and branches',
  'orgunits:manage': 'Create and update departments and branches',
  'customers:read': 'View the customer list',
  'customers:manage': 'Create and update customer profiles, notes, and attachments',
  'tickets:read': 'View tickets and their timelines',
  'tickets:manage': 'Change ticket subject and status',
  'interactions:read': 'View customer interactions and unified timelines',
  'interactions:create': 'Create or receive a customer interaction on any channel',
  'interactions:associate': 'Associate an existing interaction with a ticket',
  'reports:read': 'View reporting and analytics data'
};
