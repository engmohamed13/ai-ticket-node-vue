# Story 14 — Ticket management APIs: CRUD, assignment, and dashboard (Story: 5)

## Prerequisites

- Story 13 completed: [13-story-ticket-data-model-5.md](13-story-ticket-data-model-5.md). Specifically: `TicketCategory`, `TicketComment`, `TicketAttachment` models exist; `Ticket` has `priority`, `categoryId`, `assignedToUserId`, `respondedAt`, `resolvedAt`; `TICKET_STATUSES`, `TICKET_PRIORITIES` constants exist in `backend/src/tickets/types.ts`; `tickets:manage` permission is defined and granted to support roles.
- Story 08 completed: [../authenticationandusermanagement/08-story-auth-apis-3.md](../authenticationandusermanagement/08-story-auth-apis-3.md). Specifically: `requirePermission` and `getAuth` middleware, JWT authentication, and `AppError` patterns are in place.
- Story 05 completed: [../communicationchannels/05-story-communication-apis-2.md](../communicationchannels/05-story-communication-apis-2.md). The read-only ticket endpoints (`GET /api/tickets`, `GET /api/tickets/:id`, `GET /api/tickets/:id/timeline`) exist from this story and are reused/extended by Story 14.
- A running PostgreSQL server with the `CustomerCRM` database, including the migrations from Story 13.

---

## Story Goal

Expose ticket management over HTTP so an agent can create tickets, assign them to themselves or other agents, update status and priority, add comments and attachments, and view a dashboard of tickets filtered by assignment/status. Outcomes:

1. `POST /api/tickets` creates a new ticket (customer-scoped for `CUSTOMER` role, unrestricted for agents).
2. `PATCH /api/tickets/:id` updates status, priority, category, or assignment (enforces `tickets:manage`).
3. `POST /api/tickets/:id/comments` adds an internal comment (enforces `tickets:manage`).
4. `POST /api/tickets/:id/attachments` uploads and attaches a file (enforces `tickets:manage`).
5. `GET /api/tickets` is extended with optional filters: `status`, `priority`, `assignedToUserId`, `categoryId` (agents see all, customers see only their own).
6. `GET /api/ticket-categories` lists categories for UI dropdowns (read-only, unrestricted).
7. `PATCH /api/tickets/:id/assign` assigns or reassigns a ticket to an agent (enforces `tickets:manage`).
8. All endpoints are documented in OpenAPI and covered by Supertest + mocked Prisma tests.

**Not in scope for this story:** ticket deletion (not offered — `Restrict` FK behavior prevents it), editing or deleting existing comments/attachments, bulk operations, advanced SLA computation (timestamps are updated, UI computes overdue), and customer-facing ticket creation forms or email integration.

---

## Context — Read These Files First

1. [.squad/stories/ticketmanagementagentworkflow/5/intake.md](../../stories/ticketmanagementagentworkflow/5/intake.md) — `## Description` lists "Ticket CRUD", "Assign/Reassign Ticket to Agent", "Category and Priority", "Ticket comments", "Ticket attachments", "Agent Dashboard". This story delivers the API layer; the dashboard UI is Story 15.
2. [13-story-ticket-data-model-5.md](13-story-ticket-data-model-5.md) — re-read task 1 (exact `Ticket`, `TicketComment`, `TicketAttachment` fields), task 2 (`TICKET_STATUSES`, `TICKET_PRIORITIES` in `backend/src/tickets/types.ts`), and task 3 (the `tickets:manage` permission).
3. `backend/src/routes/ticket.routes.ts` (16 lines, Story 05) — currently mounts three read-only endpoints. This story extends this file with `POST /`, `PATCH /:id`, `POST /:id/comments`, `POST /:id/attachments`, and `PATCH /:id/assign`.
4. `backend/src/services/ticket.service.ts` (19 lines, Story 05) — currently has `listTickets`, `getTicketById`, `getTicketTimeline`. Story 14 adds `createTicket`, `updateTicket`, `assignTicket`, `addComment`, and `uploadAttachment`.
5. `backend/src/controllers/ticket.controller.ts` (30 lines, Story 05) — currently has three handlers. Story 14 adds handlers for the new operations.
6. [../customermanagement/11-story-customer-apis-4.md](../customermanagement/11-story-customer-apis-4.md) — re-read task 2 (file upload pattern using `multer` and `diskStorage`), task 3 (Zod schemas for create/update, `.strict()`), task 4 (permission enforcement, `AppError` for 403/404), and task 5 (OpenAPI documentation structure). This story follows the identical pattern.
7. `backend/src/auth/scope.ts` — contains `assertCustomerScope` pattern used to enforce customer-scoped access (Story 08). Story 14 uses this for `CUSTOMER`-role users on ticket endpoints.
8. `backend/src/middleware/upload.middleware.ts` (if it exists from Story 10; if not, Story 11 created it) — the `multer` setup. Verify the `diskStorage` path and field name expected by Story 14's attachment handler.
9. [../communicationchannels/05-story-communication-apis-2.md](../communicationchannels/05-story-communication-apis-2.md) — re-read sections on Zod schemas, OpenAPI paths/components/responses, and Supertest patterns. Story 14's test suite closely follows that model.
10. `backend/src/docs/openapi.ts` — new schemas: `Ticket` (full DTO with all fields from task 1), `TicketCategory`, `TicketComment`, `TicketAttachment` (minus `storagePath`), and `CreateTicketRequest` / `UpdateTicketRequest`. New paths for each endpoint.

---

## Backend Tasks

### 1 — Extend ticket service with CRUD and management operations

**File: `backend/src/services/ticket.service.ts`**

Replace the existing contents with:

```ts
import { prisma } from '../db/prisma';
import { TICKET_STATUSES, TICKET_PRIORITIES } from '../tickets/types';
import { AppError } from '../utils/AppError';

export interface CreateTicketInput {
  subject: string;
  description?: string;
  customerId: number;
  categoryId?: number;
  priority?: string;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

export interface UpdateTicketInput {
  status?: string;
  priority?: string;
  categoryId?: number | null;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
}

export interface AssignTicketInput {
  assignedToUserId: number | null;
}

export interface AddCommentInput {
  body: string;
}

export interface UploadAttachmentInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storagePath: string;
}

const assertTicketBelongsToCustomer = async (ticketId: number, customerId: number): Promise<void> => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, `Ticket ${ticketId} not found`);
  if (ticket.customerId !== customerId) {
    throw new AppError(403, `Access denied to ticket ${ticketId}`);
  }
};

const assertUserExists = async (userId: number): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, `User ${userId} not found`);
};

const assertCategoryExists = async (categoryId: number): Promise<void> => {
  const category = await prisma.ticketCategory.findUnique({ where: { id: categoryId } });
  if (!category) throw new AppError(404, `Category ${categoryId} not found`);
};

export const listTickets = async (
  customerId?: number,
  filters?: { status?: string; priority?: string; assignedToUserId?: number; categoryId?: number }
) =>
  prisma.ticket.findMany({
    where: {
      ...(customerId !== undefined && { customerId }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.priority && { priority: filters.priority }),
      ...(filters?.assignedToUserId !== undefined && { assignedToUserId: filters.assignedToUserId }),
      ...(filters?.categoryId !== undefined && { categoryId: filters.categoryId })
    },
    orderBy: { createdAt: 'desc' },
    include: { category: true, assignedTo: { select: { id: true, name: true, email: true } } }
  });

export const getTicketById = async (id: number) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
      attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true, uploadedBy: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } }
    }
  });
  if (!ticket) throw new AppError(404, `Ticket ${id} not found`);
  return ticket;
};

export const getTicketTimeline = async (ticketId: number) => {
  await getTicketById(ticketId);
  return prisma.interaction.findMany({ where: { ticketId }, orderBy: { occurredAt: 'asc' } });
};

export const createTicket = async (input: CreateTicketInput) => {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new AppError(404, `Customer ${input.customerId} not found`);

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }

  return prisma.ticket.create({
    data: {
      subject: input.subject,
      status: 'New',
      priority: input.priority ?? 'Medium',
      customerId: input.customerId,
      categoryId: input.categoryId ?? null,
      responseTimeMinutes: input.responseTimeMinutes ?? 30,
      resolutionTimeMinutes: input.resolutionTimeMinutes ?? 480
    },
    include: {
      category: true,
      assignedTo: { select: { id: true, name: true, email: true } }
    }
  });
};

export const updateTicket = async (id: number, input: UpdateTicketInput) => {
  const ticket = await getTicketById(id);

  if (input.status && !TICKET_STATUSES.includes(input.status as any)) {
    throw new AppError(400, `Invalid status: ${input.status}`);
  }
  if (input.priority && !TICKET_PRIORITIES.includes(input.priority as any)) {
    throw new AppError(400, `Invalid priority: ${input.priority}`);
  }
  if (input.categoryId !== undefined && input.categoryId !== null) {
    await assertCategoryExists(input.categoryId);
  }

  const updateData: any = {};
  if (input.status !== undefined) {
    updateData.status = input.status;
    if (!ticket.respondedAt && input.status !== 'New') {
      updateData.respondedAt = new Date();
    }
    if (!ticket.resolvedAt && (input.status === 'Resolved' || input.status === 'Closed')) {
      updateData.resolvedAt = new Date();
    }
  }
  if (input.priority !== undefined) updateData.priority = input.priority;
  if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
  if (input.responseTimeMinutes !== undefined) updateData.responseTimeMinutes = input.responseTimeMinutes;
  if (input.resolutionTimeMinutes !== undefined) updateData.resolutionTimeMinutes = input.resolutionTimeMinutes;

  return prisma.ticket.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: { include: { author: { select: { id: true, name: true } } } },
      attachments: { select: { id: true, fileName: true, mimeType: true, sizeBytes: true, uploadedBy: { select: { id: true, name: true } } } }
    }
  });
};

export const assignTicket = async (id: number, input: AssignTicketInput) => {
  const ticket = await getTicketById(id);

  if (input.assignedToUserId !== null) {
    await assertUserExists(input.assignedToUserId);
  }

  return prisma.ticket.update({
    where: { id },
    data: { assignedToUserId: input.assignedToUserId ?? null },
    include: {
      category: true,
      assignedTo: { select: { id: true, name: true, email: true } }
    }
  });
};

export const addComment = async (ticketId: number, input: AddCommentInput, authorId: number) => {
  await getTicketById(ticketId);

  return prisma.ticketComment.create({
    data: {
      ticketId,
      body: input.body,
      authorId
    },
    include: { author: { select: { id: true, name: true } } }
  });
};

export const uploadAttachment = async (ticketId: number, input: UploadAttachmentInput, uploadedById: number) => {
  await getTicketById(ticketId);

  return prisma.ticketAttachment.create({
    data: {
      ticketId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storagePath: input.storagePath,
      uploadedById
    },
    select: { id: true, fileName: true, mimeType: true, sizeBytes: true, createdAt: true, uploadedBy: { select: { id: true, name: true } } }
  });
};

export const getTicketCategories = () => prisma.ticketCategory.findMany({ orderBy: { name: 'asc' } });
```

### 2 — Extend ticket controller with CRUD handlers

**File: `backend/src/controllers/ticket.controller.ts`**

Replace the existing contents with:

```ts
import { Request, Response } from 'express';
import { assertCustomerScope, scopedCustomerId } from '../auth/scope';
import { getAuth } from '../middleware/auth.middleware';
import {
  addComment,
  assignTicket,
  createTicket,
  getTicketById,
  getTicketCategories,
  getTicketTimeline,
  listTickets,
  updateTicket,
  uploadAttachment
} from '../services/ticket.service';
import { ok } from '../utils/apiResponse';

export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  const { customerId, status, priority, assignedToUserId, categoryId } = req.query as unknown as {
    customerId?: number;
    status?: string;
    priority?: string;
    assignedToUserId?: number;
    categoryId?: number;
  };
  const auth = getAuth(req);
  const scoped = scopedCustomerId(auth);
  const tickets = await listTickets(scoped ?? customerId, {
    status,
    priority,
    assignedToUserId,
    categoryId
  });
  res.json(ok(tickets));
};

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await getTicketById(id);
  assertCustomerScope(getAuth(req), ticket.customerId);
  res.json(ok(ticket));
};

export const getTicketTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await getTicketById(id);
  assertCustomerScope(getAuth(req), ticket.customerId);
  const timeline = await getTicketTimeline(id);
  res.json(ok(timeline));
};

export const createTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const scoped = scopedCustomerId(auth);
  const customerId = scoped ?? req.body.customerId;
  const ticket = await createTicket({ ...req.body, customerId });
  res.status(201).json(ok(ticket, 'Ticket created'));
};

export const updateTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await updateTicket(id, req.body);
  res.json(ok(ticket, 'Ticket updated'));
};

export const assignTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await assignTicket(id, req.body);
  res.json(ok(ticket, 'Ticket assigned'));
};

export const addCommentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  const comment = await addComment(id, req.body, auth.userId);
  res.status(201).json(ok(comment, 'Comment added'));
};

export const uploadAttachmentHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  const auth = getAuth(req);
  const attachment = await uploadAttachment(
    id,
    {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      storagePath: req.file.path
    },
    auth.userId
  );
  res.status(201).json(ok(attachment, 'Attachment uploaded'));
};

export const getTicketCategoriesHandler = async (_req: Request, res: Response): Promise<void> => {
  const categories = await getTicketCategories();
  res.json(ok(categories));
};
```

### 3 — Extend ticket routes with new endpoints

**File: `backend/src/routes/ticket.routes.ts`**

Replace the existing contents with:

```ts
import { Router } from 'express';
import { z } from 'zod';
import {
  addCommentHandler,
  assignTicketHandler,
  createTicketHandler,
  getTicketCategoriesHandler,
  getTicketHandler,
  getTicketTimelineHandler,
  listTicketsHandler,
  updateTicketHandler,
  uploadAttachmentHandler
} from '../controllers/ticket.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../tickets/types';

const listTicketsQuerySchema = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assignedToUserId: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional()
  })
  .strict();

const createTicketSchema = z
  .object({
    subject: z.string().min(1).max(255),
    customerId: z.coerce.number().int().positive(),
    categoryId: z.coerce.number().int().positive().optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    responseTimeMinutes: z.coerce.number().int().positive().optional(),
    resolutionTimeMinutes: z.coerce.number().int().positive().optional()
  })
  .strict();

const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    categoryId: z.coerce.number().int().positive().optional().nullable(),
    responseTimeMinutes: z.coerce.number().int().positive().optional(),
    resolutionTimeMinutes: z.coerce.number().int().positive().optional()
  })
  .strict();

const assignTicketSchema = z.object({ assignedToUserId: z.coerce.number().int().positive().optional().nullable() }).strict();

const addCommentSchema = z.object({ body: z.string().min(1) }).strict();

const router = Router();

router.get('/', requirePermission('tickets:read'), validate({ query: listTicketsQuerySchema }), listTicketsHandler);
router.post('/', requirePermission('tickets:manage'), validate({ body: createTicketSchema }), createTicketHandler);
router.get('/:id', requirePermission('tickets:read'), validate({ params: idParamSchema }), getTicketHandler);
router.get('/:id/timeline', requirePermission('tickets:read'), validate({ params: idParamSchema }), getTicketTimelineHandler);
router.patch('/:id', requirePermission('tickets:manage'), validate({ params: idParamSchema, body: updateTicketSchema }), updateTicketHandler);
router.patch('/:id/assign', requirePermission('tickets:manage'), validate({ params: idParamSchema, body: assignTicketSchema }), assignTicketHandler);
router.post('/:id/comments', requirePermission('tickets:manage'), validate({ params: idParamSchema, body: addCommentSchema }), addCommentHandler);
router.post(
  '/:id/attachments',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema }),
  uploadMiddleware.single('file'),
  uploadAttachmentHandler
);

router.get('/categories', listTicketsHandler);

export default router;
```

Wait, there's an error in the last route. Let me fix it:

Actually, let me reconsider the routes. The `/categories` endpoint should come before the `/:id` routes to avoid shadowing. Let me correct this:

```ts
import { Router } from 'express';
import { z } from 'zod';
import {
  addCommentHandler,
  assignTicketHandler,
  createTicketHandler,
  getTicketCategoriesHandler,
  getTicketHandler,
  getTicketTimelineHandler,
  listTicketsHandler,
  updateTicketHandler,
  uploadAttachmentHandler
} from '../controllers/ticket.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../tickets/types';

const listTicketsQuerySchema = z
  .object({
    customerId: z.coerce.number().int().positive().optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    assignedToUserId: z.coerce.number().int().positive().optional(),
    categoryId: z.coerce.number().int().positive().optional()
  })
  .strict();

const createTicketSchema = z
  .object({
    subject: z.string().min(1).max(255),
    customerId: z.coerce.number().int().positive(),
    categoryId: z.coerce.number().int().positive().optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    responseTimeMinutes: z.coerce.number().int().positive().optional(),
    resolutionTimeMinutes: z.coerce.number().int().positive().optional()
  })
  .strict();

const updateTicketSchema = z
  .object({
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    categoryId: z.coerce.number().int().positive().optional().nullable(),
    responseTimeMinutes: z.coerce.number().int().positive().optional(),
    resolutionTimeMinutes: z.coerce.number().int().positive().optional()
  })
  .strict();

const assignTicketSchema = z.object({ assignedToUserId: z.coerce.number().int().positive().optional().nullable() }).strict();

const addCommentSchema = z.object({ body: z.string().min(1) }).strict();

const router = Router();

router.get('/', requirePermission('tickets:read'), validate({ query: listTicketsQuerySchema }), listTicketsHandler);
router.get('/categories', getTicketCategoriesHandler);
router.post('/', requirePermission('tickets:manage'), validate({ body: createTicketSchema }), createTicketHandler);
router.get('/:id', requirePermission('tickets:read'), validate({ params: idParamSchema }), getTicketHandler);
router.get('/:id/timeline', requirePermission('tickets:read'), validate({ params: idParamSchema }), getTicketTimelineHandler);
router.patch('/:id', requirePermission('tickets:manage'), validate({ params: idParamSchema, body: updateTicketSchema }), updateTicketHandler);
router.patch('/:id/assign', requirePermission('tickets:manage'), validate({ params: idParamSchema, body: assignTicketSchema }), assignTicketHandler);
router.post('/:id/comments', requirePermission('tickets:manage'), validate({ params: idParamSchema, body: addCommentSchema }), addCommentHandler);
router.post(
  '/:id/attachments',
  requirePermission('tickets:manage'),
  validate({ params: idParamSchema }),
  uploadMiddleware.single('file'),
  uploadAttachmentHandler
);

export default router;
```

### 4 — OpenAPI documentation

**File: `backend/src/docs/openapi.ts`**

Add the following to `components.schemas` (alongside existing schemas):

```ts
TicketCategory: {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    color: { type: 'string', nullable: true }
  }
},
TicketComment: {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    body: { type: 'string' },
    author: { $ref: '#/components/schemas/User' },
    createdAt: { type: 'string', format: 'date-time' }
  }
},
TicketAttachment: {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    fileName: { type: 'string' },
    mimeType: { type: 'string' },
    sizeBytes: { type: 'integer' },
    uploadedBy: { $ref: '#/components/schemas/User' },
    createdAt: { type: 'string', format: 'date-time' }
  }
},
Ticket: {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    subject: { type: 'string' },
    status: { type: 'string', enum: TICKET_STATUSES },
    priority: { type: 'string', enum: TICKET_PRIORITIES },
    category: { $ref: '#/components/schemas/TicketCategory', nullable: true },
    assignedTo: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' }
      },
      nullable: true
    },
    customerId: { type: 'integer' },
    responseTimeMinutes: { type: 'integer', nullable: true },
    resolutionTimeMinutes: { type: 'integer', nullable: true },
    respondedAt: { type: 'string', format: 'date-time', nullable: true },
    resolvedAt: { type: 'string', format: 'date-time', nullable: true },
    comments: { type: 'array', items: { $ref: '#/components/schemas/TicketComment' } },
    attachments: { type: 'array', items: { $ref: '#/components/schemas/TicketAttachment' } },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' }
  }
}
```

Add the following to `paths`:

```ts
'/tickets': {
  get: {
    tags: ['Tickets'],
    summary: 'List tickets',
    parameters: [
      { name: 'customerId', in: 'query', schema: { type: 'integer' }, required: false },
      { name: 'status', in: 'query', schema: { type: 'string', enum: TICKET_STATUSES }, required: false },
      { name: 'priority', in: 'query', schema: { type: 'string', enum: TICKET_PRIORITIES }, required: false },
      { name: 'assignedToUserId', in: 'query', schema: { type: 'integer' }, required: false },
      { name: 'categoryId', in: 'query', schema: { type: 'integer' }, required: false }
    ],
    responses: {
      200: {
        description: 'Ticket list',
        content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Ticket' } } } }
      }
    }
  },
  post: {
    tags: ['Tickets'],
    summary: 'Create a new ticket',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              subject: { type: 'string' },
              customerId: { type: 'integer' },
              categoryId: { type: 'integer' },
              priority: { type: 'string', enum: TICKET_PRIORITIES },
              responseTimeMinutes: { type: 'integer' },
              resolutionTimeMinutes: { type: 'integer' }
            },
            required: ['subject', 'customerId']
          }
        }
      }
    },
    responses: {
      201: {
        description: 'Ticket created',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } }
      },
      400: { description: 'Validation error' },
      404: { description: 'Customer or category not found' }
    }
  }
},
'/tickets/{id}': {
  get: {
    tags: ['Tickets'],
    summary: 'Get a single ticket',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Ticket', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } },
      404: { description: 'Ticket not found' }
    }
  },
  patch: {
    tags: ['Tickets'],
    summary: 'Update ticket',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: TICKET_STATUSES },
              priority: { type: 'string', enum: TICKET_PRIORITIES },
              categoryId: { type: 'integer', nullable: true },
              responseTimeMinutes: { type: 'integer' },
              resolutionTimeMinutes: { type: 'integer' }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Ticket updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } },
      400: { description: 'Validation error or invalid status/priority' },
      404: { description: 'Ticket or category not found' }
    }
  }
},
'/tickets/{id}/timeline': {
  get: {
    tags: ['Tickets'],
    summary: 'Get ticket communication timeline',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    responses: {
      200: { description: 'Interactions', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Interaction' } } } } },
      404: { description: 'Ticket not found' }
    }
  }
},
'/tickets/{id}/assign': {
  patch: {
    tags: ['Tickets'],
    summary: 'Assign ticket to an agent',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              assignedToUserId: { type: 'integer', nullable: true }
            }
          }
        }
      }
    },
    responses: {
      200: { description: 'Ticket assigned', content: { 'application/json': { schema: { $ref: '#/components/schemas/Ticket' } } } },
      404: { description: 'Ticket or user not found' }
    }
  }
},
'/tickets/{id}/comments': {
  post: {
    tags: ['Tickets'],
    summary: 'Add a comment to a ticket',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              body: { type: 'string' }
            },
            required: ['body']
          }
        }
      }
    },
    responses: {
      201: { description: 'Comment added', content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketComment' } } } },
      400: { description: 'Validation error' },
      404: { description: 'Ticket not found' }
    }
  }
},
'/tickets/{id}/attachments': {
  post: {
    tags: ['Tickets'],
    summary: 'Upload attachment to ticket',
    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
    requestBody: {
      required: true,
      content: {
        'multipart/form-data': {
          schema: {
            type: 'object',
            properties: {
              file: { type: 'string', format: 'binary' }
            },
            required: ['file']
          }
        }
      }
    },
    responses: {
      201: { description: 'Attachment uploaded', content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketAttachment' } } } },
      400: { description: 'No file provided or file too large' },
      404: { description: 'Ticket not found' }
    }
  }
},
'/tickets/categories': {
  get: {
    tags: ['Tickets'],
    summary: 'List ticket categories',
    responses: {
      200: {
        description: 'Category list',
        content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/TicketCategory' } } } }
      }
    }
  }
}
```

### 5 — Update tests

**Modify `backend/src/tests/ticket.spec.ts`** (from Story 05) to add tests for the new endpoints:

- `POST /api/tickets` with valid data → `201`, returns created ticket.
- `POST /api/tickets` without `tickets:manage` permission → `403`.
- `PATCH /api/tickets/:id` updates status and `respondedAt` on transition from `New`.
- `PATCH /api/tickets/:id` sets `resolvedAt` when moving to `Resolved` or `Closed`.
- `GET /api/tickets?status=Open` filters by status.
- `GET /api/tickets?assignedToUserId=1` filters by assignee.
- `POST /api/tickets/:id/comments` adds a comment, visible in subsequent `GET /api/tickets/:id`.
- `POST /api/tickets/:id/attachments` (with mocked multer file) creates an attachment entry.
- `PATCH /api/tickets/:id/assign` with valid user id → `200`.
- `PATCH /api/tickets/:id/assign` with invalid user id → `404`.
- `GET /api/tickets/categories` → `200` with category list.

**Create `backend/src/tests/ticket.service.spec.ts`** (unit, mocked Prisma):

- `createTicket` with valid input creates a ticket with status `New`.
- `updateTicket` sets `respondedAt` when transitioning from `New` to any other status.
- `assignTicket` updates `assignedToUserId`.
- `addComment` creates a comment with the author's id.

---

## Edge Cases & Failure Modes

- **`customerId` on `POST /api/tickets` for `CUSTOMER` role.** The request body includes `customerId`, but `CUSTOMER`-role users are scoped via `scopedCustomerId(auth)` — the handler overwrites `req.body.customerId` with the scoped id. Even if a customer sends `customerId: 2`, they can only create tickets for their own customer id.
- **Assigning a ticket to a non-existent user.** `assignTicket` calls `assertUserExists`; a `404` is returned before the update runs.
- **Moving a ticket from `New` to any other status.** `updateTicket` checks if `respondedAt` is null and sets it to `now()`. Moving from `Open` → `Pending` → `New` does **not** clear `respondedAt` — once set, it stays.
- **Resolving an already-resolved ticket.** If `resolvedAt` is already set and the status is updated to `Resolved` again, `resolvedAt` is not re-written (the condition `!ticket.resolvedAt` prevents it). If the status moves from `Resolved` back to `Open`, `resolvedAt` is not cleared.
- **Invalid `status` or `priority` on `PATCH /api/tickets/:id`.** Zod validation catches these before the service runs; `400` is returned.
- **File upload without `tickets:manage` permission.** `requirePermission('tickets:manage')` runs before the multer middleware, so a non-managing user gets `403` before the file is even parsed.
- **File upload exceeds `MAX_ATTACHMENT_SIZE_BYTES`.** Multer rejects it with a `413 Payload Too Large` before the handler runs.
- **`storagePath` includes traversal sequences.** Story 14 relies on `path.basename(req.file.originalname)` to sanitize the filename (see task 2 implementation). If this is not done, an attacker could upload to `../../../secret.txt`. The plan documents this as a bug if it occurs; implementation must prevent it.

---

## Test Plan

1. **Extend `backend/src/tests/ticket.spec.ts`** (Supertest, mocked Prisma):
   - `POST /api/tickets` with valid data and `tickets:manage` permission → `201` with the created ticket.
   - `POST /api/tickets` without `tickets:manage` → `403`.
   - `PATCH /api/tickets/:id` to change status from `New` to `Open` → `respondedAt` is set.
   - `PATCH /api/tickets/:id` to `Resolved` → `resolvedAt` is set.
   - `GET /api/tickets?status=Open` → filters work.
   - `GET /api/tickets?assignedToUserId=1` → filters work.
   - `GET /api/tickets/categories` → `200` with categories.

2. **Create `backend/src/tests/ticket.service.spec.ts`** (unit, mocked Prisma):
   - `createTicket` with valid input creates ticket with `status: 'New'`.
   - `updateTicket` setting status from `New` to `Open` sets `respondedAt`.
   - `assignTicket` updates `assignedToUserId`.
   - `addComment` creates comment with author id.
   - `uploadAttachment` creates attachment with storage path and uploaded by user id.

3. **Modify `backend/src/tests/openapi.spec.ts`** — add assertions that `paths['/tickets/{id}']`, `paths['/tickets/{id}/assign']`, `paths['/tickets/{id}/comments']`, `paths['/tickets/{id}/attachments']`, and `paths['/tickets/categories']` exist.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Backend builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
2. **Tests pass:** `npm test` — green.
3. **Backend runs:** `npm run dev`, then from a second shell (using the seeded data from Story 13):
   - `curl http://localhost:3000/api/tickets` → `200`, one ticket (demo).
   - `curl -X POST http://localhost:3000/api/tickets -H "Content-Type: application/json" -H "Authorization: Bearer <agent_token>" -d '{"subject":"Test","customerId":1,"priority":"High"}' ` → `201` with new ticket.
   - `curl -X PATCH http://localhost:3000/api/tickets/1 -H "Content-Type: application/json" -H "Authorization: Bearer <agent_token>" -d '{"status":"Open"}' ` → `200` with status updated and `respondedAt` set.
   - `curl http://localhost:3000/api/tickets/categories` → `200` with categories list.

---

## Done Criteria

- [ ] `backend/src/services/ticket.service.ts` has `createTicket`, `updateTicket`, `assignTicket`, `addComment`, `uploadAttachment`, and `getTicketCategories` functions.
- [ ] `backend/src/controllers/ticket.controller.ts` has handlers for all new operations.
- [ ] `backend/src/routes/ticket.routes.ts` mounts `POST /`, `PATCH /:id`, `PATCH /:id/assign`, `POST /:id/comments`, `POST /:id/attachments`, `GET /categories` with appropriate permission guards.
- [ ] OpenAPI documentation includes schemas and paths for all new endpoints.
- [ ] Tests cover CRUD, filtering, comments, attachments, assignment, and category listing.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.
- [ ] Frontend can create, update, and assign tickets via HTTP; comments and attachments are visible in the DTO returned.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 15.**
