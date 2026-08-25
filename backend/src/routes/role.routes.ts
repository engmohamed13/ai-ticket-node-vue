import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions';
import { listRolesHandler, setRolePermissionsHandler } from '../controllers/role.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const setPermissionsSchema = z
  .object({ permissions: z.array(z.enum(PERMISSIONS)).min(1) })
  .strict();

const router = Router();

router.get('/', requirePermission('roles:read'), listRolesHandler);
router.put(
  '/:id/permissions',
  requirePermission('roles:manage'),
  validate({ params: idParamSchema, body: setPermissionsSchema }),
  setRolePermissionsHandler
);

export default router;
