import { Router } from 'express';
import { z } from 'zod';
import {
  createKbArticleHandler,
  getKbArticleHandler,
  listKbArticlesHandler,
  listKbCategoriesHandler,
  updateKbArticleHandler
} from '../controllers/kb.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const booleanFlag = z.enum(['true', 'false']).transform((value) => value === 'true');

const listArticlesQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    /** Authors only — ignored for a caller without `kb:manage` (see the controller). */
    includeDrafts: booleanFlag.optional()
  })
  .strict();

const createArticleSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1),
    categoryId: z.coerce.number().int().positive(),
    summary: z.string().trim().max(500).optional(),
    isPublished: z.boolean().optional()
  })
  .strict();

const updateArticleSchema = z
  .object({
    title: z.string().trim().min(1).max(255).optional(),
    body: z.string().trim().min(1).optional(),
    categoryId: z.coerce.number().int().positive().optional(),
    // Explicit null clears the summary; omitting the key leaves it untouched — the same
    // convention `categoryId` follows on the ticket update schema.
    summary: z.string().trim().max(500).nullable().optional(),
    isPublished: z.boolean().optional()
  })
  .strict()
  .refine((body) => Object.keys(body).length > 0, { message: 'Provide at least one field to update' });

const router = Router();

router.get('/categories', requirePermission('kb:read'), listKbCategoriesHandler);

router.get(
  '/articles',
  requirePermission('kb:read'),
  validate({ query: listArticlesQuerySchema }),
  listKbArticlesHandler
);
router.post(
  '/articles',
  requirePermission('kb:manage'),
  validate({ body: createArticleSchema }),
  createKbArticleHandler
);
router.get(
  '/articles/:id',
  requirePermission('kb:read'),
  validate({ params: idParamSchema }),
  getKbArticleHandler
);
router.patch(
  '/articles/:id',
  requirePermission('kb:manage'),
  validate({ params: idParamSchema, body: updateArticleSchema }),
  updateKbArticleHandler
);

export default router;
