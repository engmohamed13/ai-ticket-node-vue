import { Router } from 'express';
import { z } from 'zod';
import {
  deleteNotificationHandler,
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler
} from '../controllers/notification.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

const listQuerySchema = z.object({ unreadOnly: booleanFlag.optional() }).strict();

/**
 * Notifications are addressed to a user, not to a role, so there is no permission gate here:
 * every authenticated caller reads its own inbox and nobody else's. The service scopes every
 * query by the token's `userId`.
 */
const router = Router();

router.get('/', validate({ query: listQuerySchema }), listNotificationsHandler);
router.patch('/read-all', markAllNotificationsReadHandler);
router.patch('/:id/read', validate({ params: idParamSchema }), markNotificationReadHandler);
router.delete('/:id', validate({ params: idParamSchema }), deleteNotificationHandler);

export default router;
