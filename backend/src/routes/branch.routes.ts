import { Router } from 'express';
import { z } from 'zod';
import { createBranchHandler, listBranchesHandler } from '../controllers/orgUnit.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const createBranchSchema = z
  .object({ name: z.string().min(1), code: z.string().min(1).max(10) })
  .strict();

const router = Router();

router.get('/', requirePermission('orgunits:read'), listBranchesHandler);
router.post(
  '/',
  requirePermission('orgunits:manage'),
  validate({ body: createBranchSchema }),
  createBranchHandler
);

export default router;
