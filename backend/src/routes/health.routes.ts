import { Router } from 'express';
import { z } from 'zod';
import { getDatabaseReadiness, getHealth } from '../controllers/health.controller';
import { validate } from '../middleware/validate.middleware';

export const healthQuerySchema = z.object({ verbose: z.enum(['true', 'false']).optional() }).strict();

const router = Router();

router.get('/', validate({ query: healthQuerySchema }), getHealth);
router.get('/db', getDatabaseReadiness);

export default router;
