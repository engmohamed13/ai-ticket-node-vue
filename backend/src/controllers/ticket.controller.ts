import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';

export class TicketController {
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, priority } = req.body;
      const userId = req.user?.userId;

      if (!title || !priority) {
        res.status(400).json({ success: false, message: 'Title and priority are required' });
        return;
      }

      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const ticket = await ticketService.createTicket({ title, description, priority, createdBy: userId });
      res.status(201).json({ success: true, message: 'Ticket created', data: ticket });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getAllTickets(req: Request, res: Response): Promise<void> {
    try {
      const tickets = await ticketService.getAllTickets();
      res.status(200).json({ success: true, message: 'Tickets retrieved', data: tickets });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getTicketById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
      }

      const ticket = await ticketService.getTicketById(id);
      if (!ticket) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Ticket retrieved', data: ticket });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async updateTicket(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
      }

      const existingTicket = await ticketService.getTicketById(id);
      if (!existingTicket) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      const { title, description, priority, status } = req.body;
      const updatedTicket = await ticketService.updateTicket(id, { title, description, priority, status });
      
      res.status(200).json({ success: true, message: 'Ticket updated', data: updatedTicket });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async deleteTicket(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      if (isNaN(id)) {
        res.status(400).json({ success: false, message: 'Invalid ticket ID' });
        return;
      }

      const existingTicket = await ticketService.getTicketById(id);
      if (!existingTicket) {
        res.status(404).json({ success: false, message: 'Ticket not found' });
        return;
      }

      await ticketService.deleteTicket(id);
      res.status(200).json({ success: true, message: 'Ticket deleted', data: null });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

export const ticketController = new TicketController();
