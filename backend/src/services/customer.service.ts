import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listCustomers = () => prisma.customer.findMany({ orderBy: { name: 'asc' } });

export const getCustomerTimeline = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(404, `Customer ${customerId} not found`);

  return prisma.interaction.findMany({ where: { customerId }, orderBy: { occurredAt: 'asc' } });
};
