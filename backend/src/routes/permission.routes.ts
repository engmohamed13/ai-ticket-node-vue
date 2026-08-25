import { Router } from 'express';
import { listPermissionsHandler } from '../controllers/role.controller';
import { requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requirePermission('roles:read'), listPermissionsHandler);

export default router;
