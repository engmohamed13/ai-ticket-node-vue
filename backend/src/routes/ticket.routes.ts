import { Router } from 'express';
import { z } from 'zod';
import { getTicketHandler, getTicketTimelineHandler, listTicketsHandler } from '../controllers/ticket.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const listTicketsQuerySchema = z.object({ customerId: z.coerce.number().int().positive().optional() }).strict();

const router = Router();

router.get('/', validate({ query: listTicketsQuerySchema }), listTicketsHandler);
router.get('/:id', validate({ params: idParamSchema }), getTicketHandler);
router.get('/:id/timeline', validate({ params: idParamSchema }), getTicketTimelineHandler);

export default router;
