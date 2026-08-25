import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listBranches = () => prisma.branch.findMany({ orderBy: { name: 'asc' } });

export const createBranch = async (input: { name: string; code: string }) => {
  const existing = await prisma.branch.findFirst({
    where: { OR: [{ name: input.name }, { code: input.code }] }
  });
  if (existing) throw new AppError(409, 'A branch with that name or code already exists');
  return prisma.branch.create({ data: input });
};

export const listDepartments = (branchId?: number) =>
  prisma.department.findMany({
    where: branchId === undefined ? undefined : { branchId },
    include: { branch: true },
    orderBy: [{ branchId: 'asc' }, { name: 'asc' }]
  });

export const createDepartment = async (input: { name: string; branchId: number }) => {
  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch) throw new AppError(400, `Branch ${input.branchId} does not exist`);

  const existing = await prisma.department.findUnique({
    where: { branchId_name: { branchId: input.branchId, name: input.name } }
  });
  if (existing) throw new AppError(409, `${branch.name} already has a "${input.name}" department`);

  return prisma.department.create({ data: input, include: { branch: true } });
};
