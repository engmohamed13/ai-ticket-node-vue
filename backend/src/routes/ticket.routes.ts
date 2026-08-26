import { Router } from 'express';
import { z } from 'zod';
import {
  addTicketCommentHandler,
  assignTicketHandler,
  createTicketAttachmentHandler,
  createTicketHandler,
  deleteTicketAttachmentHandler,
  downloadTicketAttachmentHandler,
  getTicketHandler,
  getTicketTimelineHandler,
  listTicketAttachmentsHandler,
  listTicketCategoriesHandler,
  listTicketCommentsHandler,
  listTicketsHandler,
  updateTicketHandler
} from '../controllers/ticket.controller';
import {
  getTicketFeedbackHandler,
  submitTicketFeedbackHandler
} from '../controllers/feedback.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { uploadTicketAttachment } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';
import {
  FEEDBACK_RATING_MAX,
  FEEDBACK_RATING_MIN,
  TICKET_PRIORITIES,
  TICKET_STATUSES
} from '../tickets/types';

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

const listTicketsQuerySchema = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    assignedToUserId: z.coerce.number().int().positive().optional(),
    assignedToMe: booleanFlag.optional(),
    unassigned: booleanFlag.optional()
  })
  .strict()
  .refine(
    (query) =>
      [query.assignedToUserId !== undefined, query.assignedToMe === true, query.unassigned === true].filter(
        Boolean
      ).length <= 1,
    { message: 'Use at most one of assignedToUserId, assignedToMe, or unassigned' }
  );

const createTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(255),
    customerId: z.coerce.number().int().positive(),
    categoryId: z.coerce.number().int().positive().optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assignedToUserId: z.coerce.number().int().positive().optional(),
    responseTimeMinutes: z.coerce.number().int().positive().optional(),
    resolutionTimeMinutes: z.coerce.number().int().positive().optional()
  })
  .strict();

const updateTicketSchema = z
  .object({
    subject: z.string().trim().min(1).max(255).optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    // Explicit null clears the category; omitting the key leaves it untouched.
    categoryId: z.coerce.number().int().positive().nullable().optional(),
    responseTimeMinutes: z.coerce.number().int().positive().optional(),
    resolutionTimeMinutes: z.coerce.number().int().positive().optional()
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

// Explicit null is how the UI unassigns a ticket, so the key is required but nullable.
const assignTicketSchema = z
  .object({ assignedToUserId: z.coerce.number().int().positive().nullable() })
  .strict();

const addCommentSchema = z.object({ body: z.string().trim().min(1) }).strict();

const submitFeedbackSchema = z
  .object({
    rating: z.coerce.number().int().min(FEEDBACK_RATING_MIN).max(FEEDBACK_RATING_MAX),
    comment: z.string().trim().max(1000).optional()
  })
  .strict();

const attachmentParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    attachmentId: z.coerce.number().int().positive()
  })
  .strict();

const router = Router();

// `/categories` is declared before `/:id` on purpose: Express matches in registration order,
// so the literal path must win before the numeric-id route rejects "categories" with a 400.
router.get('/categories', requirePermission('tickets:read'), listTicketCategoriesHandler);

router.get(
  '/',
  requirePermission('tickets:read'),
  validate({ query: listTicketsQuerySchema }),
  listTicketsHandler
);
router.post(
  '/',
  requirePermission('tickets:manage'),
  validate({ body: createTicketSchema }),
  createTicketHandler
);
router.get('/:id', requirePermission('tickets:read'), validate({ params: idParamSchema }), getTicketHandler);
router.patch(
  '/:id',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema, body: updateTicketSchema }),
  updateTicketHandler
);
router.patch(
  '/:id/assign',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema, body: assignTicketSchema }),
  assignTicketHandler
);
router.get(
  '/:id/timeline',
  requirePermission('tickets:read'),
  validate({ params: idParamSchema }),
  getTicketTimelineHandler
);
router.get(
  '/:id/comments',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema }),
  listTicketCommentsHandler
);
router.post(
  '/:id/comments',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema, body: addCommentSchema }),
  addTicketCommentHandler
);
// Attachments, like comments, are internal to the support team — `tickets:manage`, not
// `tickets:read`, which every CUSTOMER-role token also holds.
router.get(
  '/:id/attachments',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema }),
  listTicketAttachmentsHandler
);
router.post(
  '/:id/attachments',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema }),
  uploadTicketAttachment,
  createTicketAttachmentHandler
);
router.get(
  '/:id/attachments/:attachmentId/download',
  requirePermission('tickets:manage'),
  validate({ params: attachmentParamsSchema }),
  downloadTicketAttachmentHandler
);
router.delete(
  '/:id/attachments/:attachmentId',
  requirePermission('tickets:manage'),
  validate({ params: attachmentParamsSchema }),
  deleteTicketAttachmentHandler
);

// Feedback is the one ticket sub-resource a customer writes. `feedback:write` is held by the
// CUSTOMER role only; the handler additionally refuses any token with no linked customer.
router.get(
  '/:id/feedback',
  requirePermission('feedback:read'),
  validate({ params: idParamSchema }),
  getTicketFeedbackHandler
);
router.post(
  '/:id/feedback',
  requirePermission('feedback:write'),
  validate({ params: idParamSchema, body: submitFeedbackSchema }),
  submitTicketFeedbackHandler
);

export default router;
