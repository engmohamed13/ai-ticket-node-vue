import { Router } from 'express';
import { z } from 'zod';
import { loginHandler, logoutHandler, meHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const loginSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1)
  })
  .strict();

const router = Router();

router.post('/login', validate({ body: loginSchema }), loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, meHandler);

export default router;
