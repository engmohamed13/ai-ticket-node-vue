import { Router } from 'express';
import { getCustomerTimelineHandler, listCustomersHandler } from '../controllers/customer.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const router = Router();

router.get('/', requirePermission('customers:read'), listCustomersHandler);
router.get(
  '/:id/timeline',
  requirePermission('interactions:read'),
  validate({ params: idParamSchema }),
  getCustomerTimelineHandler
);

export default router;
