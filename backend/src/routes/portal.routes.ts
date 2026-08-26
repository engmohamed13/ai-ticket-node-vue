import { Router } from 'express';
import { getPortalSummaryHandler, listPortalTicketsHandler } from '../controllers/feedback.controller';
import { requirePermission } from '../middleware/auth.middleware';

/**
 * The customer-facing portal (Story 16/17). Mounted at `/customers/portal` ahead of the staff
 * `/customers` router in `routes/index.ts`, so the literal `portal` segment is matched before
 * `/customers/:id` can reject it as a non-numeric id — the same registration-order trick
 * `/tickets/categories` uses.
 *
 * `tickets:read` is the gate every CUSTOMER-role token already holds; the handlers then force
 * the query down to the caller's own customerId and turn staff tokens away outright.
 */
const router = Router();

router.get('/tickets', requirePermission('tickets:read'), listPortalTicketsHandler);
router.get('/summary', requirePermission('tickets:read'), getPortalSummaryHandler);

export default router;
