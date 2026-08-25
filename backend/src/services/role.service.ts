import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listRoles = async () => {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { id: 'asc' }
  });

  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((link) => link.permission.key)
  }));
};

export const listPermissions = () =>
  prisma.permission.findMany({ orderBy: { key: 'asc' } });

/** Replaces a role's permission set wholesale — the request body is the new complete list. */
export const setRolePermissions = async (roleId: number, permissionKeys: string[]) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError(404, `Role ${roleId} not found`);

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  const found = new Set(permissions.map((permission) => permission.key));
  const unknown = permissionKeys.filter((key) => !found.has(key));
  if (unknown.length > 0) {
    throw new AppError(400, 'Unknown permission keys', { unknown });
  }

  // The System Administrator role must keep the permissions that let it recover from a
  // bad edit; without this guard an administrator can permanently lock every account out
  // of user and role management, recoverable only by reseeding.
  if (role.key === 'SYSTEM_ADMINISTRATOR') {
    const required = ['users:manage', 'roles:manage'];
    const stripped = required.filter((key) => !found.has(key));
    if (stripped.length > 0) {
      throw new AppError(400, 'The System Administrator role cannot lose these permissions', {
        stripped
      });
    }
  }

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId, permissionId: permission.id }))
  });

  return listRoles().then((roles) => roles.find((entry) => entry.id === roleId));
};
