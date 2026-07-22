import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TicketService {
  async createTicket(data: { title: string; description?: string; priority: string; createdBy: number }) {
    return prisma.ticket.create({ data });
  }

  async getAllTickets() {
    return prisma.ticket.findMany({
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

  async deleteTicket(id: number) {
    return prisma.ticket.delete({
      where: { id }
    });
  }
}

export const ticketService = new TicketService();
