import { Router } from 'express';
import { z } from 'zod';
import { CHANNELS, INTERACTION_DIRECTIONS } from '../channels/types';
import {
  associateInteractionHandler,
  createInteractionHandler,
  getInteractionHandler
} from '../controllers/interaction.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const createInteractionSchema = z
  .object({
    channel: z.enum(CHANNELS),
    direction: z.enum(INTERACTION_DIRECTIONS),
    customerId: z.coerce.number().int().positive(),
    ticketId: z.coerce.number().int().positive().optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1)
  })
  .strict();

const associateInteractionSchema = z.object({ ticketId: z.coerce.number().int().positive() }).strict();

const router = Router();

router.post('/', validate({ body: createInteractionSchema }), createInteractionHandler);
router.get('/:id', validate({ params: idParamSchema }), getInteractionHandler);
router.patch(
  '/:id/associate',
  validate({ params: idParamSchema, body: associateInteractionSchema }),
  associateInteractionHandler
);

export default router;
