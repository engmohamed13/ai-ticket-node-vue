# Story 11 — Customer CRUD, search/filtering, notes, and attachment APIs (Story: 4)

## Prerequisites

- Story 10 completed: [10-story-customer-data-model-4.md](10-story-customer-data-model-4.md). Specifically: `Customer` has `company`/`address`/`city`/`country`/`status`/`updatedAt`; `CustomerNote` and `CustomerAttachment` exist and are migrated into `CustomerCRM`; `backend/src/customers/types.ts` exports `CUSTOMER_STATUSES`; `'customers:manage'` exists in `backend/src/auth/permissions.ts` and is granted to `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, `SUPPORT_AGENT`; `UPLOAD_DIR` and `MAX_ATTACHMENT_SIZE_BYTES` are configured in `backend/src/config/env.ts`; `multer` and `@types/multer` are installed; `npm run db:seed` has been run.
- Story 05 completed: [../communicationchannels/05-story-communication-apis-2.md](../communicationchannels/05-story-communication-apis-2.md). This story **extends** the files it created: `backend/src/services/customer.service.ts`, `backend/src/controllers/customer.controller.ts`, `backend/src/routes/customer.routes.ts`, and **rewrites** `backend/src/tests/customer.spec.ts`.
- Story 08 completed: [../authenticationandusermanagement/08-story-auth-apis-3.md](../authenticationandusermanagement/08-story-auth-apis-3.md). `requirePermission`, `getAuth`, `AppError`, `validate`, `idParamSchema`, and `backend/src/tests/authTestHelper.ts`'s `bearer(overrides)` all exist and are reused unchanged.
- A running PostgreSQL server with the migrated `CustomerCRM` database, per [database/README.md](../../../database/README.md).
- **`CUSTOMER`-role users hold neither `customers:read` nor `customers:manage`** (Story 10's `## Edge Cases`, confirmed at `backend/src/auth/roles.ts:59`). Every endpoint in this story is therefore staff-only by construction — no additional per-record ownership scoping (`backend/src/auth/scope.ts`) is needed here, unlike `ticket.controller.ts` and `interaction.controller.ts`. Do not add `assertCustomerScope` calls to the new customer handlers; it would be dead code.

---

## Story Goal

Turn the Story 10 data model into working endpoints:

1. `GET /api/customers` gains `search` (matches name/email/phone/company, case-insensitive) and `status` query filters. `GET /api/customers/:id` returns a single profile.
2. `POST /api/customers` and `PATCH /api/customers/:id` create and update profiles, rejecting a duplicate email with `409`.
3. `GET/POST /api/customers/:id/notes` list and add notes, attributed to the authenticated user.
4. `GET/POST /api/customers/:id/attachments`, `GET /api/customers/:id/attachments/:attachmentId/download`, and `DELETE /api/customers/:id/attachments/:attachmentId` manage file attachments on local disk via `multer`.
5. Every new endpoint is documented in `backend/src/docs/openapi.ts` and covered by Jest + Supertest tests following the existing patterns.

**Not in scope for this story:** the frontend (Story 12), deleting a customer (Story 10's `## Edge Cases` — `Restrict` on delete, no endpoint), editing or deleting a note once created, MIME-type allow-listing, and antivirus scanning of uploads.

---

## Context — Read These Files First

1. [.squad/stories/customermanagement/4/intake.md](../../stories/customermanagement/4/intake.md) — `## Acceptance criteria`: "Customer can be created, updated and viewed", "Customer search and filtering work", "Customer details are displayed correctly", "Customer notes and attachments can be managed", "Customer ticket and interaction history is accessible". Tasks 2–7 below map onto these one-for-one; ticket/interaction history is already served by the existing `GET /api/tickets?customerId=` (Story 05) and `GET /api/customers/:id/timeline` (Story 05) — this story does not duplicate them.
2. `backend/src/services/customer.service.ts` (11 lines) — read the whole file. `listCustomers` currently takes no arguments; task 2 changes its signature to accept an optional filter, which is a **breaking change to the existing call in `customer.controller.ts`** and to the existing assertion in `backend/src/tests/customer.spec.ts:27`.
3. `backend/src/controllers/customer.controller.ts` (18 lines) and `backend/src/routes/customer.routes.ts` (18 lines) — read both whole files. The existing `router.get('/', requirePermission('customers:read'), listCustomersHandler)` (routes line 9) has no `validate({ query: ... })` — task 5 adds one.
4. `backend/src/services/user.service.ts` (130 lines) — the closest existing precedent for create/update-with-duplicate-check: `createUser` (69–89) checks `findUnique({ where: { email } })` and throws `AppError(409, ...)` before creating; `updateUser` (91–97) calls `findUserOrThrow` then `prisma.user.update`. Task 2's `createCustomer`/`updateCustomer` follow the same two steps.
5. `backend/src/services/interaction.service.ts` (54 lines) and `backend/src/services/ticket.service.ts` (20 lines) — the `AppError(404, ...)` "or-throw" helper pattern (`getTicketById` in `ticket.service.ts:10-14`) that task 2's `getCustomerById` follows.
6. `backend/src/routes/user.routes.ts` (68 lines) — read the whole file. `createUserSchema` / `updateUserSchema` (18–39) show the `.strict()` object pattern with every update field independently `.optional()` (not derived via `.partial()`) — task 5 follows this exact convention for `createCustomerSchema`/`updateCustomerSchema`.
7. `backend/src/routes/interaction.routes.ts` (38 lines) — `z.enum(CHANNELS)` (line 15) is the precedent for `z.enum(CUSTOMER_STATUSES)` in task 5's schemas.
8. `backend/src/middleware/validate.middleware.ts` (28 lines) and `backend/src/schemas/idParam.schema.ts` (3 lines) — re-read both whole. `idParamSchema` validates a single `:id` param; task 5 needs a **two-param** schema (`:id` + `:attachmentId`) for the attachment sub-routes, which is a new shape not yet used anywhere in this codebase — write it inline in `customer.routes.ts` rather than adding it to the shared `schemas/` file, since nothing else needs it yet.
9. `backend/src/utils/AppError.ts` (12 lines) and `backend/src/middleware/error.middleware.ts` (23 lines) — re-read both. `globalErrorHandler` reads `err.status || err.statusCode || 500` (error.middleware.ts:14). `multer`'s own `MulterError` has neither `.status` nor `.statusCode`, so an unhandled one would fall through as a `500` — task 3's upload middleware must catch it and re-throw as an `AppError(400, ...)` explicitly.
10. `frontend/src/services/api.ts` — **not modified by this story** (backend-only), but note for your own sanity check: it is Story 12's problem, not this one, that the shared axios instance defaults `Content-Type: application/json`.
11. `backend/src/tests/customer.spec.ts` (57 lines) — read the whole file. `jest.mock('../db/prisma', ...)` (1–7) only stubs `customer.findMany`/`findUnique` and `interaction.findMany`. Task 8 replaces this file's mock block to add `customer.create`/`update`, `customerNote.findMany`/`create`, and `customerAttachment.findMany`/`create`/`findUnique`/`delete`.
12. `backend/src/tests/authTestHelper.ts` (16 lines) — read the whole file. `bearer(overrides)` spreads `ADMIN_PAYLOAD` (full `PERMISSIONS`) with your overrides — task 8's `403` tests call `bearer({ permissions: ['customers:read'] })` to simulate a role that can view but not manage.
13. `backend/src/tests/interaction.spec.ts` (lines 1–80 read already) — the `jest.mock('../channels/registry', ...)` sibling-mock pattern next to the Prisma mock; task 3's upload middleware needs a comparable approach if it is imported by a spec that does not want to touch the real filesystem (see task 8).
14. `backend/src/tests/setup.ts` (currently 3 lines, after Story 08's edit: `JWT_SECRET` default) — task 1 adds a fourth line pointing `UPLOAD_DIR` at the `uploads-test/` directory Story 10 already added to `.gitignore`.
15. `backend/src/docs/openapi.ts` (1373 lines) — `components.schemas.Customer` (currently lines 33–43) and `paths['/customers']` / `paths['/customers/{id}/timeline']` (currently lines 228–305). Task 6 extends the schema and adds the new paths in the same flat shape.
16. `backend/src/tests/openapi.spec.ts` (37 lines) — read the whole file. The `'documents customer endpoints'` test (18–22) asserts specific path keys; task 7 extends it.
17. `backend/tsconfig.json` — `"strict"`, `"noUnusedLocals"`, `"noUnusedParameters"` are on (confirmed in Story 08's context notes). Unused handler parameters must be `_`-prefixed.

---

## Backend Tasks

### 1 — Test environment: isolated upload directory

**File: `backend/src/tests/setup.ts`**

Append a fourth line, following the existing `??=` idiom:

```ts
process.env.UPLOAD_DIR ??= 'uploads-test';
```

Without this, Jest runs would write real files into `backend/uploads/` (the production default) every time the test suite runs `multer`. `uploads-test/` is already in `.gitignore` from Story 10 task 5.

### 2 — Customer service: CRUD, search, notes, attachments

**File: `backend/src/services/customer.service.ts`**

Replace the whole file:

```ts
import { unlink } from 'node:fs/promises';
import { Prisma } from '../generated/prisma/client';
import { CUSTOMER_STATUSES } from '../customers/types';
import type { CustomerStatus } from '../customers/types';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export interface ListCustomersFilter {
  search?: string;
  status?: CustomerStatus;
}

export interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: CustomerStatus;
}

export type UpdateCustomerInput = Partial<CustomerInput>;

const buildCustomerWhere = (filter: ListCustomersFilter): Prisma.CustomerWhereInput => ({
  status: filter.status,
  ...(filter.search
    ? {
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { email: { contains: filter.search, mode: 'insensitive' } },
          { phone: { contains: filter.search, mode: 'insensitive' } },
          { company: { contains: filter.search, mode: 'insensitive' } }
        ]
      }
    : {})
});

export const listCustomers = (filter: ListCustomersFilter = {}) =>
  prisma.customer.findMany({ where: buildCustomerWhere(filter), orderBy: { name: 'asc' } });

export const getCustomerById = async (id: number) => {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new AppError(404, `Customer ${id} not found`);
  return customer;
};

const assertEmailAvailable = async (email: string, excludeId?: number): Promise<void> => {
  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing && existing.id !== excludeId) {
    throw new AppError(409, `A customer with email ${email} already exists`);
  }
};

export const createCustomer = async (input: CustomerInput) => {
  await assertEmailAvailable(input.email);
  return prisma.customer.create({ data: { ...input, status: input.status ?? 'ACTIVE' } });
};

export const updateCustomer = async (id: number, input: UpdateCustomerInput) => {
  await getCustomerById(id);
  if (input.email !== undefined) {
    await assertEmailAvailable(input.email, id);
  }
  return prisma.customer.update({ where: { id }, data: input });
};

export const getCustomerTimeline = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(404, `Customer ${customerId} not found`);
  return prisma.interaction.findMany({ where: { customerId }, orderBy: { occurredAt: 'asc' } });
};

const noteInclude = { author: { select: { id: true, name: true } } } as const;

export const listCustomerNotes = async (customerId: number) => {
  await getCustomerById(customerId);
  return prisma.customerNote.findMany({
    where: { customerId },
    include: noteInclude,
    orderBy: { createdAt: 'desc' }
  });
};

export const addCustomerNote = async (customerId: number, authorId: number, body: string) => {
  await getCustomerById(customerId);
  return prisma.customerNote.create({
    data: { customerId, authorId, body },
    include: noteInclude
  });
};

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

/** Never expose the local disk path to a client. */
const toAttachmentDto = <T extends { storagePath: string }>(attachment: T): Omit<T, 'storagePath'> => {
  const { storagePath: _storagePath, ...dto } = attachment;
  return dto;
};

export const listCustomerAttachments = async (customerId: number) => {
  await getCustomerById(customerId);
  const attachments = await prisma.customerAttachment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' }
  });
  return attachments.map(toAttachmentDto);
};

export const addCustomerAttachment = async (customerId: number, uploadedById: number, file: UploadedFile) => {
  await getCustomerById(customerId);
  const attachment = await prisma.customerAttachment.create({
    data: {
      customerId,
      uploadedById,
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storagePath: file.path
    }
  });
  return toAttachmentDto(attachment);
};

/** Internal — includes `storagePath`, unlike the list/create DTOs above. Used by the
 * download and delete handlers, which need the real disk location. */
export const getCustomerAttachmentOrThrow = async (customerId: number, attachmentId: number) => {
  const attachment = await prisma.customerAttachment.findUnique({ where: { id: attachmentId } });
  if (!attachment || attachment.customerId !== customerId) {
    throw new AppError(404, `Attachment ${attachmentId} not found for customer ${customerId}`);
  }
  return attachment;
};

export const deleteCustomerAttachment = async (customerId: number, attachmentId: number): Promise<void> => {
  const attachment = await getCustomerAttachmentOrThrow(customerId, attachmentId);
  await prisma.customerAttachment.delete({ where: { id: attachmentId } });
  // Best-effort: the database row is the source of truth. If the file is already
  // missing (manual cleanup, a prior partial failure) this must not fail the request.
  await unlink(attachment.storagePath).catch(() => undefined);
};
```

`CUSTOMER_STATUSES` is imported for its type-level re-export convenience only in this file (the value itself is consumed by the routes layer in task 5) — if `noUnusedLocals` complains because nothing in this file references the value form, drop the value import and keep only `import type { CustomerStatus } from '../customers/types'`.

If `Prisma.CustomerWhereInput` is not the exact exported name after Story 10's regeneration, read `backend/src/generated/prisma/models.ts` and `backend/src/generated/prisma/commonInputTypes.ts` for the actual generated name before using it — Story 04's `## Edge Cases` flagged this same uncertainty for generated Prisma types.

### 3 — Attachment upload middleware

**Create file: `backend/src/middleware/upload.middleware.ts`**

```ts
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextFunction, Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const customerId = req.params.id;
    const dir = path.join(env.UPLOAD_DIR, 'customers', customerId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    // path.basename strips any directory component from a hostile original filename
    // (e.g. "../../etc/passwd") before it becomes part of a path on disk.
    const safeName = path.basename(file.originalname);
    cb(null, `${randomUUID()}-${safeName}`);
  }
});

const singleFileUpload = multer({
  storage,
  limits: { fileSize: env.MAX_ATTACHMENT_SIZE_BYTES }
}).single('file');

/** Wraps multer's callback-style error into the project's AppError convention, so a
 * too-large or malformed upload returns the same `{ success, message, data }` envelope
 * as every other failure instead of falling through to a bare 500. */
export const uploadCustomerAttachment: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  singleFileUpload(req, res, (err: unknown) => {
    if (err instanceof MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'File exceeds the maximum allowed size' : err.message;
      next(new AppError(400, message));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    if (!req.file) {
      next(new AppError(400, 'No file was uploaded'));
      return;
    }
    next();
  });
};
```

`req.params.id` is a **string** at this point in the middleware chain (Express has not yet run `validate({ params: idParamSchema })`'s coercion — this middleware sits before it in task 5's route definition, since the destination directory must exist before Express even starts parsing the multipart body). `multer`'s own `Express.Request.file` typing comes from `@types/multer` automatically once it is installed (Story 10 task 6) — no manual `declare global` augmentation is needed here, unlike `auth.middleware.ts`'s `req.auth`.

### 4 — Customer controller

**File: `backend/src/controllers/customer.controller.ts`**

Replace the whole file:

```ts
import { Request, Response } from 'express';
import { assertCustomerScope } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import {
  addCustomerAttachment,
  addCustomerNote,
  createCustomer,
  deleteCustomerAttachment,
  getCustomerAttachmentOrThrow,
  getCustomerById,
  getCustomerTimeline,
  listCustomerAttachments,
  listCustomerNotes,
  listCustomers,
  updateCustomer
} from '../services/customer.service';
import { ok } from '../utils/apiResponse';

export const listCustomersHandler = async (req: Request, res: Response): Promise<void> => {
  const { search, status } = req.query as unknown as { search?: string; status?: string };
  const customers = await listCustomers({ search, status: status as never });
  res.json(ok(customers));
};

export const getCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await getCustomerById(id)));
};

export const createCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  res.status(201).json(ok(await createCustomer(req.body), 'Customer created'));
};

export const updateCustomerHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await updateCustomer(id, req.body), 'Customer updated'));
};

export const getCustomerTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  assertCustomerScope(getAuth(req), id);
  const timeline = await getCustomerTimeline(id);
  res.json(ok(timeline));
};

export const listCustomerNotesHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await listCustomerNotes(id)));
};

export const addCustomerNoteHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { body } = req.body as { body: string };
  const auth = getAuth(req);
  res.status(201).json(ok(await addCustomerNote(id, auth.userId, body), 'Note added'));
};

export const listCustomerAttachmentsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await listCustomerAttachments(id)));
};

export const createCustomerAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  // uploadCustomerAttachment (the middleware ahead of this handler) already rejects a
  // missing req.file with a 400, so req.file! is safe here.
  const attachment = await addCustomerAttachment(id, auth.userId, req.file!);
  res.status(201).json(ok(attachment, 'Attachment uploaded'));
};

export const downloadCustomerAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, attachmentId } = req.params as unknown as { id: number; attachmentId: number };
  const attachment = await getCustomerAttachmentOrThrow(id, attachmentId);
  res.download(attachment.storagePath, attachment.fileName);
};

export const deleteCustomerAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id, attachmentId } = req.params as unknown as { id: number; attachmentId: number };
  await deleteCustomerAttachment(id, attachmentId);
  res.json(ok(null, 'Attachment deleted'));
};
```

The `status as never` cast on `listCustomersHandler` is intentional: `validate({ query: listCustomersQuerySchema })` (task 5) already runs `z.enum(CUSTOMER_STATUSES)` before this handler executes, so by the time the handler sees `req.query.status` it is guaranteed to already be a valid `CustomerStatus` or `undefined` — the cast just satisfies the compiler the same way every other handler in this codebase casts `req.params`/`req.body` with `as unknown as { ... }` (see `ticket.controller.ts:8` for the identical pattern applied to `customerId`).

### 5 — Customer routes

**File: `backend/src/routes/customer.routes.ts`**

Replace the whole file:

```ts
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
```

`updateCustomerSchema` deliberately redeclares every field as `.optional()` rather than deriving it from `customerFieldsSchema` via `.partial()` — matching `backend/src/routes/user.routes.ts`'s `updateUserSchema` (context item 6), the established convention in this codebase for "same shape, all-optional" request bodies.

The `POST /:id/attachments` route runs `validate({ params: idParamSchema })` **before** `uploadCustomerAttachment` — an invalid `:id` is rejected with `400` before any disk I/O happens. `uploadCustomerAttachment` itself still reads `req.params.id` as a raw string (task 3) because `express.json()`/multipart parsing and route-level middleware both run before the coercion `validate` performs is visible to a `multer` `destination` callback — this is why task 3's comment calls out the string-vs-number distinction explicitly.

### 6 — OpenAPI documentation

**File: `backend/src/docs/openapi.ts`**

1. Replace the existing `Customer` schema (currently lines 33–43) to add the new fields:

```ts
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'email', 'status', 'createdAt', 'updatedAt']
      },
```

2. Add two new schemas as siblings of `Customer`, following its flat shape:
   - `CustomerNote` — `id`, `body`, `customerId`, `authorId`, `author` (object: `id`, `name`), `createdAt`.
   - `CustomerAttachment` — `id`, `fileName`, `mimeType`, `sizeBytes` (integer), `customerId`, `uploadedById`, `createdAt`. **No `storagePath` property** — the service layer never returns it (task 2).

3. Add to `paths` (all under `bearerAuth`, no `security: []` overrides needed):

| Path | Method | Permission | Responses |
|---|---|---|---|
| `/customers` | `get` | `customers:read` | `200` `Customer[]` (add `search`, `status` query params), `401`, `403` |
| `/customers` | `post` | `customers:manage` | `201` `Customer`, `400`, `401`, `403`, `409` duplicate email |
| `/customers/{id}` | `get` | `customers:read` | `200` `Customer`, `401`, `403`, `404` |
| `/customers/{id}` | `patch` | `customers:manage` | `200` `Customer`, `400`, `401`, `403`, `404`, `409` |
| `/customers/{id}/notes` | `get` | `customers:read` | `200` `CustomerNote[]`, `401`, `403`, `404` |
| `/customers/{id}/notes` | `post` | `customers:manage` | `201` `CustomerNote`, `400`, `401`, `403`, `404` |
| `/customers/{id}/attachments` | `get` | `customers:read` | `200` `CustomerAttachment[]`, `401`, `403`, `404` |
| `/customers/{id}/attachments` | `post` | `customers:manage` | multipart `requestBody` (`content: 'multipart/form-data'`, schema `{ type: 'object', properties: { file: { type: 'string', format: 'binary' } }, required: ['file'] }`); `201` `CustomerAttachment`, `400` (missing file or too large), `401`, `403`, `404` |
| `/customers/{id}/attachments/{attachmentId}/download` | `get` | `customers:read` | `200` (`content: 'application/octet-stream'`, no `$ref` — binary body), `401`, `403`, `404` |
| `/customers/{id}/attachments/{attachmentId}` | `delete` | `customers:manage` | `200`, `401`, `403`, `404` |

`/customers/{id}/timeline` (existing, lines 259–305) is unchanged by this story.

### 7 — OpenAPI doc test

**File: `backend/src/tests/openapi.spec.ts`**

Extend the existing `'documents customer endpoints'` test (currently lines 18–22):

```ts
  it('documents customer endpoints', () => {
    expect(openApiDocument.paths['/customers']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/timeline']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/notes']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/attachments']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/attachments/{attachmentId}']).toBeDefined();
    expect(openApiDocument.components.schemas.Customer).toBeDefined();
    expect(openApiDocument.components.schemas.CustomerNote).toBeDefined();
    expect(openApiDocument.components.schemas.CustomerAttachment).toBeDefined();
  });
```

### 8 — Rewrite the customer test suite

**File: `backend/src/tests/customer.spec.ts`**

Replace the whole file. Update the `jest.mock('../db/prisma', ...)` block to:

```ts
jest.mock('../db/prisma', () => ({
  prisma: {
    customer: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    customerNote: { findMany: jest.fn(), create: jest.fn() },
    customerAttachment: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    interaction: { findMany: jest.fn() }
  }
}));
```

Then, following the exact `describe`/`it` shape of the existing tests (`import request from 'supertest'`, `import app from '../app'`, `bearer()` from `authTestHelper`), add coverage for:

1. `GET /api/customers` — update the existing assertion (was `toHaveBeenCalledWith({ orderBy: { name: 'asc' } })`, now the call includes a `where` built by `buildCustomerWhere({})`, i.e. `{ where: { status: undefined }, orderBy: { name: 'asc' } }`) and add a case asserting `?search=acme&status=ACTIVE` builds the expected `OR` clause.
2. `GET /api/customers/:id` — `200` with a mocked customer; `404` when `findUnique` resolves `null`.
3. `POST /api/customers` — `201` on success; `400` when `email` is missing (Zod validation, no Prisma call); `409` when `findUnique` (the pre-check) resolves an existing row; `403` using `bearer({ permissions: ['customers:read'] })` (holds read but not manage).
4. `PATCH /api/customers/:id` — `200`; `404` when the initial `getCustomerById` lookup misses; `409` on a conflicting email change.
5. `GET /api/customers/:id/notes` and `POST /api/customers/:id/notes` — `200` list, `201` create attributing `authorId` to the token's `userId`, `403` on `POST` with a read-only token.
6. `GET /api/customers/:id/attachments` — `200`, asserting the returned objects have **no `storagePath` key** (`expect(res.body.data[0]).not.toHaveProperty('storagePath')`).
7. `POST /api/customers/:id/attachments` — use Supertest's `.attach('file', Buffer.from('test content'), 'note.txt')` against `.field()`-free multipart body; mock `prisma.customer.findUnique` (for the `getCustomerById` guard inside `addCustomerAttachment`) and `prisma.customerAttachment.create`; assert `201` and that the response strips `storagePath`. This test writes a real file under `uploads-test/customers/<id>/` (task 1) — add an `afterAll` that removes it: `fs.rmSync(path.join(process.cwd(), 'uploads-test'), { recursive: true, force: true })`.
8. `GET /api/customers/:id/attachments/:attachmentId/download` — write a small real file with `fs.writeFileSync` to a known path first, mock `prisma.customerAttachment.findUnique` to return a row whose `storagePath` points at it, assert `res.status === 200` and the `content-disposition` header contains the mocked `fileName`.
9. `DELETE /api/customers/:id/attachments/:attachmentId` — `200`; `404` when the attachment belongs to a different `customerId` than the one in the URL (exercise the `attachment.customerId !== customerId` branch in `getCustomerAttachmentOrThrow`).
10. Keep the existing `GET /api/customers/:id/timeline` tests (currently lines 31–57) unchanged — this story does not touch that handler.

---

## Edge Cases & Failure Modes

- **`CUSTOMER`-role requests never reach these handlers.** Confirmed in `## Prerequisites` — no test in task 8 needs to simulate a customer-scoped token hitting `/customers/*`, because `requirePermission('customers:read')` already rejects it with `403` before any handler runs (the role holds neither permission). Do not add a redundant test for this; it would just be re-testing `requirePermission` itself, which Story 08 already covers.
- **Search string with SQL special characters (`%`, `_`).** Prisma's `contains` maps to a parameterized `ILIKE`/`LIKE` — no manual escaping is implemented, and none is needed for correctness (Prisma parameterizes the value), but a literal `%` or `_` in a search term matches more broadly than a naive user might expect (standard `LIKE` wildcard behavior). Documented here, not fixed — same class of behavior as any `contains` filter in this codebase.
- **Empty `search` after trimming.** `listCustomersQuerySchema`'s `z.string().trim().min(1)` rejects a whitespace-only `search` param with `400` before the handler runs — an all-whitespace search is treated as a validation error, not silently ignored.
- **Duplicate email race.** `assertEmailAvailable`'s `findUnique`-then-`create` is not transactional — two concurrent `POST /customers` with the same email could both pass the check and one `create` would fail on the database's `@unique` constraint instead of returning a clean `409`. This mirrors the exact same known limitation in `user.service.ts:createUser` (Story 08) — accepted there, accepted here for consistency; not treated as a new risk introduced by this story.
- **Uploading with no `file` field, or a wrong field name.** `uploadCustomerAttachment` (task 3) explicitly checks `!req.file` and raises `AppError(400, 'No file was uploaded')` — `multer` itself would otherwise silently proceed with `req.file` undefined and the downstream handler would throw a less clear `TypeError` on `req.file!`.
- **Upload exceeding `MAX_ATTACHMENT_SIZE_BYTES`.** `multer`'s `limits.fileSize` aborts the upload mid-stream and emits a `MulterError` with `code === 'LIMIT_FILE_SIZE'`; task 3 maps this to a clean `400` with a human-readable message instead of the default `500`.
- **Attachment `:attachmentId` belongs to a different customer than `:id` in the URL.** `getCustomerAttachmentOrThrow` (task 2) checks `attachment.customerId !== customerId` and throws `404` — the same "not found" response as a nonexistent id, so the endpoint never leaks whether an attachment id exists under a different customer.
- **Deleting an attachment whose file is already missing from disk** (manually cleaned up, or a prior partial failure). `deleteCustomerAttachment`'s `unlink(...).catch(() => undefined)` (task 2) makes this a no-op instead of a `500` — the database row being gone is what the API contract promises, not the file.
- **`res.download` on a `storagePath` that no longer exists.** Unlike delete, the download handler has no `.catch` — a missing file on disk here means `res.download` calls its error callback internally, which Express 5 forwards to `globalErrorHandler` as a plain `ENOENT` error (no `.status`), so it falls through to a bare `500`. This is an accepted gap for this mini-module (the row and the file are expected to stay in sync via task 2's create/delete paths) — flagged here rather than silently left undocumented.

---

## Test Plan

Covered in full by task 8 above (rewriting `backend/src/tests/customer.spec.ts`), plus task 7's `openapi.spec.ts` extension. No new spec files beyond what those two tasks describe — everything in this story extends the customer resource's existing single Supertest suite, matching how Story 05 kept ticket, customer, and interaction tests each in their own single file per resource.

---

## Migration / Rollback

No schema changes in this story — Story 10 owns the migration. If this story's endpoints need to be rolled back independently of Story 10, revert `backend/src/services/customer.service.ts`, `backend/src/controllers/customer.controller.ts`, `backend/src/routes/customer.routes.ts`, `backend/src/middleware/upload.middleware.ts`, `backend/src/tests/customer.spec.ts`, `backend/src/tests/setup.ts`, `backend/src/tests/openapi.spec.ts`, and `backend/src/docs/openapi.ts` to their Story 05/08 state — the underlying `CustomerNote`/`CustomerAttachment` tables and `customers:manage` permission from Story 10 can stay in place unused, since nothing in Story 10 depends on this story's code existing.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Backend builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
2. **Tests pass:** `npm test` — green, including every case added to `customer.spec.ts` and `openapi.spec.ts`.
3. **No leaked files:** after `npm test`, `backend/uploads-test/` is either absent or empty (the `afterAll` cleanup from task 8 item 7 ran).
4. **Manual smoke test** (backend running via `npm run dev`, logged in as `agent@crm.local` / `Passw0rd!` via `POST /api/auth/login`):
   - `GET /api/customers?search=acme` returns the demo customer.
   - `POST /api/customers/1/notes` with `{ "body": "test note" }` returns `201` with `author.name === "Support Agent"`.
   - `curl -F "file=@package.json" http://localhost:3000/api/customers/1/attachments -H "Authorization: Bearer <token>"` returns `201` with no `storagePath` in the body, and the file appears under `backend/uploads/customers/1/`.
   - `GET /api/customers/1/attachments/<id>/download` streams the file back.
5. **Swagger UI reflects the new paths:** open `http://localhost:3000/api/docs` and confirm the new `/customers/*` operations render.
6. **Regression:** existing `GET /api/customers/:id/timeline`, `GET /api/tickets?customerId=`, and `POST /api/interactions` still behave exactly as in Story 05/08 — rerun their existing test files unchanged and confirm they still pass.

---

## Done Criteria

- [ ] `GET /api/customers` supports `search` and `status` query filters; `GET /api/customers/:id` returns a single profile or `404`.
- [ ] `POST /api/customers` and `PATCH /api/customers/:id` work, both behind `customers:manage`, both rejecting a duplicate email with `409`.
- [ ] `GET/POST /api/customers/:id/notes` work, attributing each note to the authenticated user.
- [ ] `GET/POST /api/customers/:id/attachments`, the download route, and `DELETE /api/customers/:id/attachments/:attachmentId` all work; no response ever includes `storagePath`.
- [ ] Every new endpoint is documented in `backend/src/docs/openapi.ts` and asserted in `openapi.spec.ts`.
- [ ] `backend/src/tests/customer.spec.ts` covers every case listed in task 8, and no test leaves files behind in `uploads-test/`.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 12.**
