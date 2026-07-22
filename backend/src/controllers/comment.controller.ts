import { Request, Response } from 'express';
import { commentService } from '../services/comment.service';
import { ticketService } from '../services/ticket.service';

export class CommentController {
  async createComment(req: Request, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id as string);
      const { text } = req.body;
      const userId = req.user?.userId;

      if (isNaN(ticketId)) {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
      }

      if (!text || text.trim() === '') {
        res.status(400).json({ success: false, message: 'Comment text is required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const existingTicket = await ticketService.getTicketById(ticketId);
      if (!existingTicket) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      const comment = await commentService.createComment({ content: text, ticketId, createdBy: userId });
      res.status(201).json({ success: true, message: 'Comment created', data: comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getComments(req: Request, res: Response): Promise<void> {
    try {
      const ticketId = parseInt(req.params.id as string);

      if (isNaN(ticketId)) {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
      }

      const existingTicket = await ticketService.getTicketById(ticketId);
      if (!existingTicket) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      const comments = await commentService.getCommentsByTicketId(ticketId);
      res.status(200).json({ success: true, message: 'Comments retrieved', data: comments });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const commentController = new CommentController();
