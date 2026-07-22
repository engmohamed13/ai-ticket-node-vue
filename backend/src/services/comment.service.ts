import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CommentService {
  async createComment(data: { content: string; ticketId: number; createdBy: number }) {
    return prisma.comment.create({ data });
  }

  async getCommentsByTicketId(ticketId: number) {
    return prisma.comment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' }
    });
  }
}

export const commentService = new CommentService();
