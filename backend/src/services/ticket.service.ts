import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listTickets = (customerId?: number) =>
  prisma.ticket.findMany({
    where: customerId === undefined ? undefined : { customerId },
    orderBy: { createdAt: 'desc' }
  });

export const getTicketById = async (id: number) => {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, `Ticket ${id} not found`);
  return ticket;
};

export const getTicketTimeline = async (ticketId: number) => {
  await getTicketById(ticketId);
  return prisma.interaction.findMany({ where: { ticketId }, orderBy: { occurredAt: 'asc' } });
};
