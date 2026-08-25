import { Router } from 'express';
import customerRoutes from './customer.routes';
import healthRoutes from './health.routes';
import interactionRoutes from './interaction.routes';
import ticketRoutes from './ticket.routes';

const router = Router();
router.use('/health', healthRoutes);
router.use('/customers', customerRoutes);
router.use('/tickets', ticketRoutes);
router.use('/interactions', interactionRoutes);

export default router;
