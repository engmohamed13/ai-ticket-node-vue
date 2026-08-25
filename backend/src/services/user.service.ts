import { hashPassword } from '../auth/password';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { toAuthUser } from './auth.service';
import type { AuthUser } from './auth.service';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId: number;
  departmentId?: number;
  branchId?: number;
  customerId?: number;
}

export interface UpdateUserInput {
  name?: string;
  roleId?: number;
  departmentId?: number | null;
  branchId?: number | null;
  customerId?: number | null;
  isActive?: boolean;
}

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
  department: true,
  branch: true
} as const;

const findUserOrThrow = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!user) throw new AppError(404, `User ${id} not found`);
  return user;
};

const assertReferencesExist = async (input: {
  roleId?: number;
  departmentId?: number | null;
  branchId?: number | null;
  customerId?: number | null;
}): Promise<void> => {
  if (input.roleId !== undefined) {
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new AppError(400, `Role ${input.roleId} does not exist`);
  }
  if (input.departmentId !== undefined && input.departmentId !== null) {
    const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!department) throw new AppError(400, `Department ${input.departmentId} does not exist`);
  }
  if (input.branchId !== undefined && input.branchId !== null) {
    const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new AppError(400, `Branch ${input.branchId} does not exist`);
  }
  if (input.customerId !== undefined && input.customerId !== null) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new AppError(400, `Customer ${input.customerId} does not exist`);
  }
};

export const listUsers = async (): Promise<AuthUser[]> => {
  const users = await prisma.user.findMany({ include: userInclude, orderBy: { name: 'asc' } });
  return users.map(toAuthUser);
};

export const getUserById = async (id: number): Promise<AuthUser> => toAuthUser(await findUserOrThrow(id));

export const createUser = async (input: CreateUserInput): Promise<AuthUser> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, `A user with email ${input.email} already exists`);

  await assertReferencesExist(input);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      roleId: input.roleId,
      departmentId: input.departmentId ?? null,
      branchId: input.branchId ?? null,
      customerId: input.customerId ?? null
    },
    include: userInclude
  });

  return toAuthUser(user);
};

export const updateUser = async (id: number, input: UpdateUserInput): Promise<AuthUser> => {
  await findUserOrThrow(id);
  await assertReferencesExist(input);

  const user = await prisma.user.update({ where: { id }, data: input, include: userInclude });
  return toAuthUser(user);
};

export const changeUserPassword = async (id: number, newPassword: string): Promise<void> => {
  await findUserOrThrow(id);
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword) } });
};

/**
 * Soft delete. Two guards: an administrator cannot lock themselves out, and the last
 * active SYSTEM_ADMINISTRATOR cannot be removed — otherwise no account can ever manage
 * users again and the only recovery is a reseed.
 */
export const deactivateUser = async (id: number, actingUserId: number): Promise<AuthUser> => {
  if (id === actingUserId) throw new AppError(400, 'You cannot deactivate your own account');

  const user = await findUserOrThrow(id);

  if (user.role.key === 'SYSTEM_ADMINISTRATOR') {
    const remainingAdmins = await prisma.user.count({
      where: { isActive: true, role: { key: 'SYSTEM_ADMINISTRATOR' }, id: { not: id } }
    });
    if (remainingAdmins === 0) {
      throw new AppError(400, 'Cannot deactivate the last active System Administrator');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    include: userInclude
  });
  return toAuthUser(updated);
};
