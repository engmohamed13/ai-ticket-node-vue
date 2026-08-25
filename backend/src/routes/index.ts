import { Router } from 'express';
import authRoutes from './auth.routes';
import branchRoutes from './branch.routes';
import customerRoutes from './customer.routes';
import departmentRoutes from './department.routes';
import healthRoutes from './health.routes';
import interactionRoutes from './interaction.routes';
import permissionRoutes from './permission.routes';
import roleRoutes from './role.routes';
import ticketRoutes from './ticket.routes';
import userRoutes from './user.routes';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// --- Public: liveness probes and the login endpoint itself. ---
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// --- Everything below this line requires a valid access token. ---
router.use(authenticate);

router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/branches', branchRoutes);
router.use('/departments', departmentRoutes);
router.use('/customers', customerRoutes);
router.use('/tickets', ticketRoutes);
router.use('/interactions', interactionRoutes);

export default router;
