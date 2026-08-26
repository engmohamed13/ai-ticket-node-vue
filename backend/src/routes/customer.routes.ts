import { Router } from 'express';
import { z } from 'zod';
import { CUSTOMER_STATUSES } from '../customers/types';
import {
  addCustomerNoteHandler,
  createCustomerAttachmentHandler,
  createCustomerHandler,
  deleteCustomerAttachmentHandler,
  downloadCustomerAttachmentHandler,
  getCustomerHandler,
  getCustomerTimelineHandler,
  listCustomerAttachmentsHandler,
  listCustomerNotesHandler,
  listCustomersHandler,
  updateCustomerHandler
} from '../controllers/customer.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { uploadCustomerAttachment } from '../middleware/upload.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const listCustomersQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    status: z.enum(CUSTOMER_STATUSES).optional()
  })
  .strict();

const customerFieldsSchema = {
  name: z.string().min(1),
  email: z.string().email().toLowerCase(),
  phone: z.string().min(1).optional(),
  company: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  status: z.enum(CUSTOMER_STATUSES).optional()
};

const createCustomerSchema = z.object(customerFieldsSchema).strict();

const updateCustomerSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().toLowerCase().optional(),
    phone: z.string().min(1).optional(),
    company: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    city: z.string().min(1).optional(),
    country: z.string().min(1).optional(),
    status: z.enum(CUSTOMER_STATUSES).optional()
  })
  .strict();

const addNoteSchema = z.object({ body: z.string().min(1) }).strict();

const attachmentParamsSchema = z
  .object({
    id: z.coerce.number().int().positive(),
    attachmentId: z.coerce.number().int().positive()
  })
  .strict();

const router = Router();

router.get(
  '/',
  requirePermission('customers:read'),
  validate({ query: listCustomersQuerySchema }),
  listCustomersHandler
);
router.get(
  '/:id',
  requirePermission('customers:read'),
  validate({ params: idParamSchema }),
  getCustomerHandler
);
router.post(
  '/',
  requirePermission('customers:manage'),
  validate({ body: createCustomerSchema }),
  createCustomerHandler
);
router.patch(
  '/:id',
  requirePermission('customers:manage'),
  validate({ params: idParamSchema, body: updateCustomerSchema }),
  updateCustomerHandler
);
router.get(
  '/:id/timeline',
  requirePermission('interactions:read'),
  validate({ params: idParamSchema }),
  getCustomerTimelineHandler
);
router.get(
  '/:id/notes',
  requirePermission('customers:read'),
  validate({ params: idParamSchema }),
  listCustomerNotesHandler
);
router.post(
  '/:id/notes',
  requirePermission('customers:manage'),
  validate({ params: idParamSchema, body: addNoteSchema }),
  addCustomerNoteHandler
);
router.get(
  '/:id/attachments',
  requirePermission('customers:read'),
  validate({ params: idParamSchema }),
  listCustomerAttachmentsHandler
);
router.post(
  '/:id/attachments',
  requirePermission('customers:manage'),
  validate({ params: idParamSchema }),
  uploadCustomerAttachment,
  createCustomerAttachmentHandler
);
router.get(
  '/:id/attachments/:attachmentId/download',
  requirePermission('customers:read'),
  validate({ params: attachmentParamsSchema }),
  downloadCustomerAttachmentHandler
);
router.delete(
  '/:id/attachments/:attachmentId',
  requirePermission('customers:manage'),
  validate({ params: attachmentParamsSchema }),
  deleteCustomerAttachmentHandler
);

export default router;
