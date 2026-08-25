import { Router } from 'express';
import { z } from 'zod';
import {
  createDepartmentHandler,
  listDepartmentsHandler
} from '../controllers/orgUnit.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const listDepartmentSchema = z.object({ branchId: z.coerce.number().int().positive().optional() }).strict();

const createDepartmentSchema = z
  .object({ name: z.string().min(1), branchId: z.coerce.number().int().positive() })
  .strict();

const router = Router();

router.get('/', requirePermission('orgunits:read'), validate({ query: listDepartmentSchema }), listDepartmentsHandler);
router.post(
  '/',
  requirePermission('orgunits:manage'),
  validate({ body: createDepartmentSchema }),
  createDepartmentHandler
);

export default router;
