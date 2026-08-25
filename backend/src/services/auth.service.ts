import { signAuthToken } from '../auth/jwt';
import type { AuthTokenPayload } from '../auth/jwt';
import type { Permission } from '../auth/permissions';
import { verifyPassword } from '../auth/password';
import type { RoleKey } from '../auth/roles';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

/** Everything the frontend needs about the signed-in user. Never includes `passwordHash`. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roleKey: RoleKey;
  roleName: string;
  permissions: Permission[];
  customerId: number | null;
  department: { id: number; name: string } | null;
  branch: { id: number; name: string; code: string } | null;
}

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
  department: true,
  branch: true
} as const;

type UserWithRelations = {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  roleId: number;
  departmentId: number | null;
  branchId: number | null;
  customerId: number | null;
  createdAt: Date;
  updatedAt: Date;
  role: {
    id: number;
    key: string;
    name: string;
    description: string | null;
    createdAt: Date;
    permissions: Array<{
      roleId: number;
      permissionId: number;
      permission: {
        id: number;
        key: string;
        description: string;
        createdAt: Date;
      };
    }>;
  };
  department: { id: number; name: string; branchId: number; createdAt: Date } | null;
  branch: { id: number; name: string; code: string; createdAt: Date } | null;
};

export const toAuthUser = (user: UserWithRelations): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isActive: user.isActive,
  roleKey: user.role.key as RoleKey,
  roleName: user.role.name,
  permissions: user.role.permissions.map((link) => link.permission.key as Permission),
  customerId: user.customerId,
  department: user.department ? { id: user.department.id, name: user.department.name } : null,
  branch: user.branch
    ? { id: user.branch.id, name: user.branch.name, code: user.branch.code }
    : null
});

export const login = async (
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: userInclude
  });

  // Same message and same code path for "no such user" and "wrong password" so the
  // response cannot be used to enumerate valid e-mail addresses.
  if (!user) throw new AppError(401, 'Invalid email or password');

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) throw new AppError(401, 'Invalid email or password');

  if (!user.isActive) throw new AppError(403, 'This account has been deactivated');

  const authUser = toAuthUser(user);
  const payload: AuthTokenPayload = {
    userId: authUser.id,
    email: authUser.email,
    roleKey: authUser.roleKey,
    customerId: authUser.customerId,
    permissions: authUser.permissions
  };

  return { token: signAuthToken(payload), user: authUser };
};

export const getAuthUserById = async (userId: number): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw new AppError(404, `User ${userId} not found`);
  return toAuthUser(user);
};
