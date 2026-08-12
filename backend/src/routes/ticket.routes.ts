import { Router } from 'express';
import { ticketController } from '../controllers/ticket.controller';
import { commentController } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Apply authentication middleware to all ticket routes
router.use(authenticate);

router.post('/', ticketController.createTicket);
router.get('/', ticketController.getAllTickets);
router.get('/:id', ticketController.getTicketById);
router.put('/:id', ticketController.updateTicket);
router.patch('/:id/status', ticketController.patchStatus);
router.delete('/:id', ticketController.deleteTicket);

// Comment routes nested under tickets
router.post('/:id/comments', commentController.createComment);
router.get('/:id/comments', commentController.getComments);

export default router;
