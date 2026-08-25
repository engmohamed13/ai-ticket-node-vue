import { Router } from 'express';
import { getCustomerTimelineHandler, listCustomersHandler } from '../controllers/customer.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const router = Router();

router.get('/', listCustomersHandler);
router.get('/:id/timeline', validate({ params: idParamSchema }), getCustomerTimelineHandler);

export default router;
