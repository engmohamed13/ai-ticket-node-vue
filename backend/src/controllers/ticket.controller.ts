import { Request, Response } from 'express';
import { ticketService } from '../services/ticket.service';

const ALLOWED_PRIORITIES = ['Low', 'Medium', 'High'];
const ALLOWED_STATUSES = ['Open', 'In Progress', 'Closed'];

const isValidTransition = (oldStatus: string, newStatus: string): boolean => {
  if (oldStatus === newStatus) return true;
  if (oldStatus === 'Open' && newStatus === 'In Progress') return true;
  if (oldStatus === 'In Progress' && newStatus === 'Closed') return true;
  return false;
};

export class TicketController {
  async createTicket(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, priority } = req.body;
      const userId = req.user?.userId;

      if (!title || !priority) {
        res.status(400).json({ success: false, message: 'Title and priority are required' });
        return;
      }

      if (!ALLOWED_PRIORITIES.includes(priority)) {
        res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}` });
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
      const search = req.query.search as string | undefined;
      const tickets = await ticketService.getAllTickets(search);
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

      if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
        res.status(400).json({ success: false, message: `Invalid priority. Must be one of: ${ALLOWED_PRIORITIES.join(', ')}` });
        return;
      }

      if (status) {
        if (!ALLOWED_STATUSES.includes(status)) {
          res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` });
          return;
        }

        if (!isValidTransition(existingTicket.status, status)) {
          res.status(400).json({
            success: false,
            message: `Invalid status transition from '${existingTicket.status}' to '${status}'. Only 'Open' -> 'In Progress' and 'In Progress' -> 'Closed' transitions are allowed.`
          });
          return;
        }
      }

      const updatedTicket = await ticketService.updateTicket(id, { title, description, priority, status });
      
      res.status(200).json({ success: true, message: 'Ticket updated', data: updatedTicket });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async patchStatus(req: Request, res: Response): Promise<void> {
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

      const { status } = req.body;

      if (!status) {
        res.status(400).json({ success: false, message: 'Status is required' });
        return;
      }

      if (!ALLOWED_STATUSES.includes(status)) {
        res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` });
        return;
      }

      if (!isValidTransition(existingTicket.status, status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status transition from '${existingTicket.status}' to '${status}'. Only 'Open' -> 'In Progress' and 'In Progress' -> 'Closed' transitions are allowed.`
        });
        return;
      }

      const updatedTicket = await ticketService.updateTicketStatus(id, status);
      res.status(200).json({ success: true, message: 'Ticket status updated', data: updatedTicket });
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

