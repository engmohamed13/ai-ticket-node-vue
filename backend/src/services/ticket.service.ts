import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TicketService {
  async createTicket(data: { title: string; description?: string; priority: string; createdBy: number }) {
    return prisma.ticket.create({ data });
  }

  async getAllTickets(search?: string) {
    return prisma.ticket.findMany({
      where: search ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      } : undefined,
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTicketById(id: number) {
    return prisma.ticket.findUnique({
      where: { id }
    });
  }

  async updateTicket(id: number, data: { title?: string; description?: string; priority?: string; status?: string }) {
    return prisma.ticket.update({
      where: { id },
      data
    });
  }

  async updateTicketStatus(id: number, status: string) {
    return prisma.ticket.update({
      where: { id },
      data: { status }
    });
  }

  async deleteTicket(id: number) {
    return prisma.ticket.delete({
      where: { id }
    });
  }
}

export const ticketService = new TicketService();
