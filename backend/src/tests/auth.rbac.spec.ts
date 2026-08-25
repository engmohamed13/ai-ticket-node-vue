import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../auth/permissions';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '../auth/roles';

describe('RBAC vocabulary', () => {
  describe('ROLES', () => {
    it('has exactly six entries', () => {
      expect(ROLES.length).toBe(6);
    });

    it('contains each main role', () => {
      const roleSet = new Set(ROLES);
      expect(roleSet.has('SYSTEM_ADMINISTRATOR')).toBe(true);
      expect(roleSet.has('CRM_MANAGER')).toBe(true);
      expect(roleSet.has('SUPPORT_SUPERVISOR')).toBe(true);
      expect(roleSet.has('SUPPORT_AGENT')).toBe(true);
      expect(roleSet.has('CUSTOMER')).toBe(true);
      expect(roleSet.has('REPORTING_USER')).toBe(true);
    });
  });

  describe('ROLE_LABELS and ROLE_PERMISSIONS', () => {
    it('ROLE_LABELS has a key for every role', () => {
      const labelKeys = Object.keys(ROLE_LABELS).sort();
      const roleKeys = [...ROLES].sort();
      expect(labelKeys).toEqual(roleKeys);
    });

    it('ROLE_PERMISSIONS has a key for every role', () => {
      const permissionKeys = Object.keys(ROLE_PERMISSIONS).sort();
      const roleKeys = [...ROLES].sort();
      expect(permissionKeys).toEqual(roleKeys);
    });
  });

  describe('PERMISSION_DESCRIPTIONS', () => {
    it('has a key for every permission', () => {
      const descriptionKeys = Object.keys(PERMISSION_DESCRIPTIONS).sort();
      const permissionKeys = [...PERMISSIONS].sort();
      expect(descriptionKeys).toEqual(permissionKeys);
    });

    it('every description is a non-empty string', () => {
      for (const desc of Object.values(PERMISSION_DESCRIPTIONS)) {
        expect(typeof desc).toBe('string');
        expect(desc.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Permission validation', () => {
    it('every permission in ROLE_PERMISSIONS is a member of PERMISSIONS', () => {
      const permissionSet = new Set(PERMISSIONS);
      for (const permissions of Object.values(ROLE_PERMISSIONS)) {
        for (const perm of permissions) {
          expect(permissionSet.has(perm)).toBe(true);
        }
      }
    });
  });

  describe('SYSTEM_ADMINISTRATOR', () => {
    it('has all permissions', () => {
      expect(ROLE_PERMISSIONS.SYSTEM_ADMINISTRATOR.length).toBe(PERMISSIONS.length);
    });
  });

  describe('CUSTOMER', () => {
    it('does not contain customers:read', () => {
      expect(ROLE_PERMISSIONS.CUSTOMER.includes('customers:read')).toBe(false);
    });

    it('does not contain users:read', () => {
      expect(ROLE_PERMISSIONS.CUSTOMER.includes('users:read')).toBe(false);
    });

    it('does not contain any :manage permission', () => {
      for (const perm of ROLE_PERMISSIONS.CUSTOMER) {
        expect(perm.endsWith(':manage')).toBe(false);
      }
    });
  });

  describe('REPORTING_USER', () => {
    it('contains no :create, :associate, or :manage permission', () => {
      for (const perm of ROLE_PERMISSIONS.REPORTING_USER) {
        expect(perm.endsWith(':create')).toBe(false);
        expect(perm.endsWith(':associate')).toBe(false);
        expect(perm.endsWith(':manage')).toBe(false);
      }
    });
  });

  describe('SUPPORT_AGENT', () => {
    it('contains interactions:create', () => {
      expect(ROLE_PERMISSIONS.SUPPORT_AGENT.includes('interactions:create')).toBe(true);
    });

    it('does not contain users:manage', () => {
      expect(ROLE_PERMISSIONS.SUPPORT_AGENT.includes('users:manage')).toBe(false);
    });
  });
});
