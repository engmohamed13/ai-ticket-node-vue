import { describe, it, expect } from 'vitest';
import { PERMISSIONS, ROLES } from '../types';

describe('auth contract (must mirror backend/src/auth)', () => {
  it('PERMISSIONS has exactly 13 entries matching the backend tuple', () => {
    expect(PERMISSIONS).toHaveLength(13);
    expect([...PERMISSIONS]).toEqual([
      'users:read',
      'users:manage',
      'roles:read',
      'roles:manage',
      'orgunits:read',
      'orgunits:manage',
      'customers:read',
      'tickets:read',
      'tickets:manage',
      'interactions:read',
      'interactions:create',
      'interactions:associate',
      'reports:read'
    ]);
  });

  it('ROLES has exactly 6 entries matching the backend tuple', () => {
    expect(ROLES).toHaveLength(6);
    expect([...ROLES]).toEqual([
      'SYSTEM_ADMINISTRATOR',
      'CRM_MANAGER',
      'SUPPORT_SUPERVISOR',
      'SUPPORT_AGENT',
      'CUSTOMER',
      'REPORTING_USER'
    ]);
  });
});
