import { Router } from 'express';
import { z } from 'zod';
import {
  changeUserPasswordHandler,
  createUserHandler,
  deactivateUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler
} from '../controllers/user.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const optionalId = z.coerce.number().int().positive();

const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().toLowerCase(),
    password: passwordSchema,
    roleId: optionalId,
    departmentId: optionalId.optional(),
    branchId: optionalId.optional(),
    customerId: optionalId.optional()
  })
  .strict();

const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    roleId: optionalId.optional(),
    departmentId: optionalId.nullable().optional(),
    branchId: optionalId.nullable().optional(),
    customerId: optionalId.nullable().optional(),
    isActive: z.boolean().optional()
  })
  .strict();

const changePasswordSchema = z.object({ password: passwordSchema }).strict();

const router = Router();

router.get('/', requirePermission('users:read'), listUsersHandler);
router.get('/:id', requirePermission('users:read'), validate({ params: idParamSchema }), getUserHandler);
router.post('/', requirePermission('users:manage'), validate({ body: createUserSchema }), createUserHandler);
router.patch(
  '/:id',
  requirePermission('users:manage'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  updateUserHandler
);
router.patch(
  '/:id/password',
  requirePermission('users:manage'),
  validate({ params: idParamSchema, body: changePasswordSchema }),
  changeUserPasswordHandler
);
router.delete(
  '/:id',
  requirePermission('users:manage'),
  validate({ params: idParamSchema }),
  deactivateUserHandler
);

export default router;
