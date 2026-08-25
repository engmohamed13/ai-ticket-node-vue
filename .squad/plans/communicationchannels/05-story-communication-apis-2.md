# Story 05 — Backend APIs for customers, tickets, and interactions (Story: 2)

## Prerequisites

- Story 04 completed: [04-story-data-model-channels-2.md](04-story-data-model-channels-2.md). Specifically: `Customer`, `Ticket`, and `Interaction` exist in `backend/prisma/schema.prisma` and are migrated into `CustomerCRM`; `backend/src/channels/types.ts` (`CHANNELS`, `INTERACTION_DIRECTIONS`, `ChannelAdapter`) and `backend/src/channels/registry.ts` (`getChannelAdapter`) exist; `npm run db:seed` has been run at least once so there is a demo customer, ticket, and five interactions to query against.
- A running PostgreSQL server with the migrated `CustomerCRM` database, per [database/README.md](../../../database/README.md).

---

## Story Goal

Expose the communication data model over HTTP so a support agent can list customers and tickets, create or receive an interaction on any of the five mock channels, associate an existing interaction with a ticket, and read back a chronological unified timeline for either a customer or a ticket.

Outcomes:

1. `GET /api/customers` lists customers; `GET /api/customers/:id/timeline` returns that customer's interactions in chronological order.
2. `GET /api/tickets` lists tickets (optionally filtered by `customerId`); `GET /api/tickets/:id` returns one; `GET /api/tickets/:id/timeline` returns that ticket's interactions in chronological order.
3. `POST /api/interactions` creates an interaction through the mock channel abstraction from Story 04 (`INBOUND` = "receive", `OUTBOUND` = "create/send"), storing the channel-stamped `externalRef`.
4. `PATCH /api/interactions/:id/associate` associates an existing interaction with a ticket, enforcing that the ticket belongs to the interaction's customer.
5. `GET /api/interactions/:id` returns one interaction.
6. All new endpoints are documented in `backend/src/docs/openapi.ts` and covered by Jest + Supertest tests following the existing health-endpoint test pattern.

**Not in scope for this story:** the frontend (Story 06), creating/updating customers or tickets over HTTP (both are seeded only, per Story 04), deleting interactions, and pagination (the demo dataset is small; list endpoints return everything unpaginated).

---

## Context — Read These Files First

1. [.squad/stories/communicationchannels/2/intake.md](.squad/stories/communicationchannels/2/intake.md) — `## Acceptance criteria`: "Customer interactions can be stored", "Interactions can be associated with customers and tickets", "Each interaction identifies its communication channel", "Unified timeline displays interactions chronologically", "Backend APIs" from `## Description`. These map directly onto the five endpoints above.
2. [04-story-data-model-channels-2.md](04-story-data-model-channels-2.md) — re-read task 1 (exact `Customer`/`Ticket`/`Interaction` fields — `ticketId` is nullable), task 2 (`CHANNELS`, `INTERACTION_DIRECTIONS` in `backend/src/channels/types.ts`), and task 4 (`getChannelAdapter` in `backend/src/channels/registry.ts`).
3. `backend/src/routes/health.routes.ts` (14 lines) and `backend/src/routes/index.ts` (8 lines) — the routing pattern: a Zod schema declared at the top of the route file, `validate({ query/body/params: schema })` from `backend/src/middleware/validate.middleware.ts` wired directly into the route, and each resource's router mounted in `routes/index.ts` via `router.use('/<resource>', resourceRoutes)`.
4. `backend/src/controllers/health.controller.ts` (18 lines) — controllers are thin `async (req, res) => { ... }` functions with **no try/catch**: Express 5 (`"express": "^5.2.1"` in `backend/package.json`) forwards a rejected async handler to `globalErrorHandler` automatically. Follow this — do not add try/catch blocks to the new controllers.
5. `backend/src/services/health.service.ts` (52 lines) — business logic lives in services, imported from `backend/src/db/prisma.ts`. The new services follow the same shape: plain exported `async` functions, no classes.
6. `backend/src/utils/AppError.ts` (12 lines) and `backend/src/middleware/error.middleware.ts` (23 lines) — `AppError(status, message, details?)` is how a service signals a `4xx`; `globalErrorHandler` reads `err.status`, masks `500`s, and attaches `details` only for `AppError` instances with `status < 500`. Use `AppError` for every "not found" and "bad association" case below — never throw a plain `Error` for an expected failure.
7. `backend/src/middleware/validate.middleware.ts` (28 lines) — `validate({ body, params, query })` runs `schema.safeParse` per key and replaces `req[key]` with the parsed (and `z.coerce`d) result. It already supports `params`, so a numeric `:id` route param is validated the same way as a body or query.
8. `backend/src/utils/apiResponse.ts` (8 lines) — every success response is `res.json(ok(data, message))`; every controller in this story follows that envelope, matching `backend/src/tests/health.spec.ts` assertions like `res.body.data...`.
9. `backend/src/tests/health.spec.ts` (105 lines) and `backend/src/tests/health.db.spec.ts` (46 lines) — the test pattern to copy: `jest.mock('../db/prisma', () => ({ prisma: { ... } }))` declared **before** the `import request from 'supertest'` / `import app from '../app'` lines (Jest hoists `jest.mock` above imports, but the mock factory itself must not reference out-of-scope variables), then `request(app).get(...)`/`.post(...)` assertions against `res.status` and `res.body`.
10. `backend/src/docs/openapi.ts` (91 lines) — read the whole file. `components.schemas` holds reusable shapes (`ApiResponse`, `DatabaseHealth`); `paths['/health']` shows the per-path/per-method/per-response shape including a `parameters` array for query params. New paths and schemas follow this exact structure.
11. `backend/src/tests/openapi.spec.ts` (17 lines) — asserts specific `paths[...]` and `components.schemas[...]` keys exist. Follow this pattern for the new paths.
12. Grep for `router.use(` in `backend/src/routes/index.ts` to confirm the current mount list before adding three more.

---

## Backend Tasks

### 1 — Shared numeric-id param schema

**Create file: `backend/src/schemas/idParam.schema.ts`**

```ts
import { z } from 'zod';

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() }).strict();
```

Reused by every `:id` route in this story (`GET /customers/:id/timeline`, `GET /tickets/:id`, `GET /tickets/:id/timeline`, `GET /interactions/:id`, `PATCH /interactions/:id/associate`).

### 2 — Customer service, controller, and routes

**Create file: `backend/src/services/customer.service.ts`**

```ts
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listCustomers = () => prisma.customer.findMany({ orderBy: { name: 'asc' } });

export const getCustomerTimeline = async (customerId: number) => {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new AppError(404, `Customer ${customerId} not found`);

  return prisma.interaction.findMany({ where: { customerId }, orderBy: { occurredAt: 'asc' } });
};
```

**Create file: `backend/src/controllers/customer.controller.ts`**

```ts
import { Request, Response } from 'express';
import { getCustomerTimeline, listCustomers } from '../services/customer.service';
import { ok } from '../utils/apiResponse';

export const listCustomersHandler = async (_req: Request, res: Response): Promise<void> => {
  const customers = await listCustomers();
  res.json(ok(customers));
};

export const getCustomerTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const timeline = await getCustomerTimeline(id);
  res.json(ok(timeline));
};
```

**Create file: `backend/src/routes/customer.routes.ts`**

```ts
import { Router } from 'express';
import { getCustomerTimelineHandler, listCustomersHandler } from '../controllers/customer.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const router = Router();

router.get('/', listCustomersHandler);
router.get('/:id/timeline', validate({ params: idParamSchema }), getCustomerTimelineHandler);

export default router;
```

### 3 — Ticket service, controller, and routes

**Create file: `backend/src/services/ticket.service.ts`**

```ts
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listTickets = (customerId?: number) =>
  prisma.ticket.findMany({
    where: customerId === undefined ? undefined : { customerId },
    orderBy: { createdAt: 'desc' }
  });

export const getTicketById = async (id: number) => {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) throw new AppError(404, `Ticket ${id} not found`);
  return ticket;
};

export const getTicketTimeline = async (ticketId: number) => {
  await getTicketById(ticketId);
  return prisma.interaction.findMany({ where: { ticketId }, orderBy: { occurredAt: 'asc' } });
};
```

**Create file: `backend/src/controllers/ticket.controller.ts`**

```ts
import { Request, Response } from 'express';
import { getTicketById, getTicketTimeline, listTickets } from '../services/ticket.service';
import { ok } from '../utils/apiResponse';

export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.query as unknown as { customerId?: number };
  const tickets = await listTickets(customerId);
  res.json(ok(tickets));
};

export const getTicketHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const ticket = await getTicketById(id);
  res.json(ok(ticket));
};

export const getTicketTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const timeline = await getTicketTimeline(id);
  res.json(ok(timeline));
};
```

**Create file: `backend/src/routes/ticket.routes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { getTicketHandler, getTicketTimelineHandler, listTicketsHandler } from '../controllers/ticket.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const listTicketsQuerySchema = z.object({ customerId: z.coerce.number().int().positive().optional() }).strict();

const router = Router();

router.get('/', validate({ query: listTicketsQuerySchema }), listTicketsHandler);
router.get('/:id', validate({ params: idParamSchema }), getTicketHandler);
router.get('/:id/timeline', validate({ params: idParamSchema }), getTicketTimelineHandler);

export default router;
```

### 4 — Interaction service, controller, and routes

**Create file: `backend/src/services/interaction.service.ts`**

```ts
import { getChannelAdapter } from '../channels/registry';
import type { Channel, InteractionDirection } from '../channels/types';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export interface CreateInteractionInput {
  channel: Channel;
  direction: InteractionDirection;
  customerId: number;
  ticketId?: number;
  subject?: string;
  body: string;
}

const assertTicketBelongsToCustomer = async (ticketId: number, customerId: number): Promise<void> => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, `Ticket ${ticketId} not found`);
  if (ticket.customerId !== customerId) {
    throw new AppError(400, `Ticket ${ticketId} does not belong to customer ${customerId}`);
  }
};

export const createInteraction = async (input: CreateInteractionInput) => {
  const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) throw new AppError(404, `Customer ${input.customerId} not found`);

  if (input.ticketId !== undefined) {
    await assertTicketBelongsToCustomer(input.ticketId, input.customerId);
  }

  const adapter = getChannelAdapter(input.channel);
  const message =
    input.direction === 'INBOUND'
      ? adapter.simulateInbound({ subject: input.subject ?? null, body: input.body })
      : adapter.deliver({ subject: input.subject ?? null, body: input.body });

  return prisma.interaction.create({
    data: { ...message, customerId: input.customerId, ticketId: input.ticketId ?? null }
  });
};

export const getInteractionById = async (id: number) => {
  const interaction = await prisma.interaction.findUnique({ where: { id } });
  if (!interaction) throw new AppError(404, `Interaction ${id} not found`);
  return interaction;
};

export const associateInteractionWithTicket = async (interactionId: number, ticketId: number) => {
  const interaction = await getInteractionById(interactionId);
  await assertTicketBelongsToCustomer(ticketId, interaction.customerId);

  return prisma.interaction.update({ where: { id: interactionId }, data: { ticketId } });
};
```

**Create file: `backend/src/controllers/interaction.controller.ts`**

```ts
import { Request, Response } from 'express';
import {
  associateInteractionWithTicket,
  createInteraction,
  getInteractionById
} from '../services/interaction.service';
import { ok } from '../utils/apiResponse';

export const createInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const interaction = await createInteraction(req.body);
  res.status(201).json(ok(interaction, 'Interaction stored'));
};

export const getInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const interaction = await getInteractionById(id);
  res.json(ok(interaction));
};

export const associateInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { ticketId } = req.body as { ticketId: number };
  const interaction = await associateInteractionWithTicket(id, ticketId);
  res.json(ok(interaction, 'Interaction associated with ticket'));
};
```

**Create file: `backend/src/routes/interaction.routes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { CHANNELS, INTERACTION_DIRECTIONS } from '../channels/types';
import {
  associateInteractionHandler,
  createInteractionHandler,
  getInteractionHandler
} from '../controllers/interaction.controller';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const createInteractionSchema = z
  .object({
    channel: z.enum(CHANNELS),
    direction: z.enum(INTERACTION_DIRECTIONS),
    customerId: z.coerce.number().int().positive(),
    ticketId: z.coerce.number().int().positive().optional(),
    subject: z.string().min(1).optional(),
    body: z.string().min(1)
  })
  .strict();

const associateInteractionSchema = z.object({ ticketId: z.coerce.number().int().positive() }).strict();

const router = Router();

router.post('/', validate({ body: createInteractionSchema }), createInteractionHandler);
router.get('/:id', validate({ params: idParamSchema }), getInteractionHandler);
router.patch(
  '/:id/associate',
  validate({ params: idParamSchema, body: associateInteractionSchema }),
  associateInteractionHandler
);

export default router;
```

### 5 — Mount the new routers

**File: `backend/src/routes/index.ts`**

```ts
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
```

### 6 — OpenAPI documentation

**File: `backend/src/docs/openapi.ts`**

Add to `components.schemas` (alongside `ApiResponse` and `DatabaseHealth`): `Customer` (`id`, `name`, `email`, `phone` nullable, `createdAt`), `Ticket` (`id`, `subject`, `status`, `customerId`, `createdAt`, `updatedAt`), and `Interaction` (`id`, `channel` enum of the five channel values, `direction` enum `['INBOUND', 'OUTBOUND']`, `subject` nullable, `body`, `externalRef`, `customerId`, `ticketId` nullable, `occurredAt`, `createdAt`).

Add to `paths`:

- `'/customers'` — `get`: list, `200` with `Customer[]`.
- `'/customers/{id}/timeline'` — `get`: `id` path param, `200` with `Interaction[]`, `404` if the customer does not exist.
- `'/tickets'` — `get`: optional `customerId` query param, `200` with `Ticket[]`.
- `'/tickets/{id}'` — `get`: `200` with `Ticket`, `404`.
- `'/tickets/{id}/timeline'` — `get`: `200` with `Interaction[]`, `404`.
- `'/interactions'` — `post`: request body referencing the `channel`/`direction`/`customerId`/`ticketId`/`subject`/`body` shape from task 4, `201` with `Interaction`, `400` on validation failure, `404` if the customer or ticket does not exist.
- `'/interactions/{id}'` — `get`: `200` with `Interaction`, `404`.
- `'/interactions/{id}/associate'` — `patch`: body `{ ticketId }`, `200` with the updated `Interaction`, `400` if the ticket belongs to a different customer, `404`.

Follow the exact structure already used for `paths['/health']` (lines 36–66) — a `parameters` array for path/query params, a `responses` object keyed by status code, each response's content pointing at `#/components/schemas/<Name>` via `$ref`.

---

## Edge Cases & Failure Modes

- **`customerId` does not exist on create.** `createInteraction` (task 4) throws `AppError(404, ...)` before touching the channel adapter or the database — enforced by the `prisma.customer.findUnique` check at the top of the function.
- **`ticketId` provided but belongs to a different customer.** `assertTicketBelongsToCustomer` (task 4) throws `AppError(400, ...)` — this is the concrete enforcement of "Interactions can be associated with customers and tickets" meaning a *consistent* association, not just any ticket id.
- **`ticketId` provided but does not exist.** Same helper throws `AppError(404, ...)` before the `400` check runs (existence is checked first).
- **Associating an interaction that is already linked to a different ticket.** `associateInteractionWithTicket` (task 4) does not check the interaction's current `ticketId` — it always overwrites. Re-associating is allowed; this is a deliberate simplification since the work item's demo flow only exercises a single association per interaction.
- **`GET /tickets/:id/timeline` for a ticket with zero interactions.** Returns `200` with an empty array — `getTicketTimeline` (task 3) does not throw once the ticket itself is confirmed to exist; only a missing ticket is a `404`.
- **`GET /tickets?customerId=` with a non-numeric value.** `z.coerce.number()` on an unparseable string yields `NaN`, which fails `.int().positive()`, so `validate` (task 1/`validate.middleware.ts`) returns `400` before the controller runs.
- **Unknown fields in the `POST /interactions` body.** `createInteractionSchema` is `.strict()` (task 4), so an unexpected field (e.g. a typo) is rejected with `400`, matching the existing `healthQuerySchema` convention (`backend/src/routes/health.routes.ts:6`).
- **Empty `body` string on create.** `z.string().min(1)` on `body` rejects an empty interaction body with `400` — an interaction must have content.

---

## Test Plan

All new backend tests live in `backend/src/tests/` and use the `jest.mock('../db/prisma', () => ({ prisma: { ... } }))` pattern from `backend/src/tests/health.spec.ts` and `health.db.spec.ts`, extended with `customer`, `ticket`, and `interaction` mocked methods (`findMany`, `findUnique`, `findFirst`, `create`, `update`).

1. **Create `backend/src/tests/customer.spec.ts`** (Supertest, mocked Prisma):
   - `GET /api/customers` → `200`, body is the array from the mocked `findMany`.
   - `GET /api/customers/:id/timeline` when the customer exists → `200` with the mocked interaction list ordered as returned (assert the `orderBy` argument passed to `prisma.interaction.findMany` is `{ occurredAt: 'asc' }`).
   - `GET /api/customers/:id/timeline` when `findUnique` resolves `null` → `404`.
2. **Create `backend/src/tests/ticket.spec.ts`** (Supertest, mocked Prisma):
   - `GET /api/tickets` → `200` with all tickets; `GET /api/tickets?customerId=1` → asserts `prisma.ticket.findMany` was called with `{ where: { customerId: 1 }, orderBy: { createdAt: 'desc' } }`.
   - `GET /api/tickets/:id` found → `200`; not found → `404`.
   - `GET /api/tickets/:id/timeline` found → `200` with interactions ordered by `occurredAt` asc; not found → `404`.
3. **Create `backend/src/tests/interaction.spec.ts`** (Supertest, mocked Prisma and `jest.mock('../channels/registry')` returning a fixed adapter per channel):
   - `POST /api/interactions` with `direction: 'INBOUND'` calls the mocked adapter's `simulateInbound`, not `deliver`; `direction: 'OUTBOUND'` calls `deliver`, not `simulateInbound`.
   - `POST /api/interactions` with a nonexistent `customerId` → `404`.
   - `POST /api/interactions` with a `ticketId` belonging to a different customer (mocked `ticket.customerId !== body.customerId`) → `400`.
   - `POST /api/interactions` missing `body` → `400` (validation).
   - `GET /api/interactions/:id` found → `200`; not found → `404`.
   - `PATCH /api/interactions/:id/associate` with a valid same-customer ticket → `200`, `prisma.interaction.update` called with `{ where: { id }, data: { ticketId } }`.
   - `PATCH /api/interactions/:id/associate` with a cross-customer ticket → `400`.
4. **Create `backend/src/tests/interaction.service.spec.ts`** (unit, mocked Prisma and channel registry): directly test `createInteraction` and `associateInteractionWithTicket` for the same cases as item 3, without going through Express — mirrors the existing split between `health.service.spec.ts` (unit) and `health.spec.ts` (Supertest).
5. **Modify `backend/src/tests/openapi.spec.ts`** — add assertions that `paths['/customers']`, `paths['/tickets']`, `paths['/interactions']`, and `paths['/interactions/{id}/associate']` are defined, and that `components.schemas.Interaction` is defined.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Backend builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
2. **Tests pass:** `npm test` — green.
3. **Backend runs:** `npm run dev`, then from a second shell (using the seeded data from Story 04 — customer id `1`, ticket id `1`):
   - `curl http://localhost:3000/api/customers` → `200`, one customer.
   - `curl http://localhost:3000/api/customers/1/timeline` → `200`, five interactions ordered by `occurredAt` ascending.
   - `curl http://localhost:3000/api/tickets` → `200`, one ticket.
   - `curl -X POST http://localhost:3000/api/interactions -H "Content-Type: application/json" -d '{"channel":"EMAIL","direction":"INBOUND","customerId":1,"body":"Still cannot log in"}'` → `201`, response `data.externalRef` starts with `email-`.
   - Take the `id` from the previous response and `curl -X PATCH http://localhost:3000/api/interactions/<id>/associate -H "Content-Type: application/json" -d '{"ticketId":1}'` → `200`, `data.ticketId` is `1`.
   - `curl http://localhost:3000/api/tickets/1/timeline` → `200`, now includes the newly associated interaction.
   - `curl http://localhost:3000/api/docs.json` → contains `"/interactions"` and `"/customers/{id}/timeline"`.
4. **Failure paths:** `curl http://localhost:3000/api/customers/999/timeline` → `404`; `curl -X POST .../interactions -d '{"channel":"FAX",...}'` → `400` (unknown channel, per `z.enum(CHANNELS)`).
5. **Regression:** `curl http://localhost:3000/api/health` still returns `200` with `"status":"ok"`; Story 01/02 checks (`?verbse=true` → 400, `/api/unknown` → 404) still hold.

---

## Done Criteria

- [ ] `GET /api/customers` and `GET /api/customers/:id/timeline` work against seeded data.
- [ ] `GET /api/tickets`, `GET /api/tickets/:id`, and `GET /api/tickets/:id/timeline` work, with `customerId` filtering on the list endpoint.
- [ ] `POST /api/interactions` stores an interaction through the correct mock channel adapter based on `direction`, and rejects an unknown customer, a cross-customer ticket, or an invalid channel (**"Customer interactions can be stored"**, **"Each interaction identifies its communication channel"**).
- [ ] `PATCH /api/interactions/:id/associate` links an interaction to a ticket, enforcing the same-customer constraint (**"Interactions can be associated with customers and tickets"**).
- [ ] `GET /api/tickets/:id/timeline` and `GET /api/customers/:id/timeline` both return interactions ordered chronologically by `occurredAt` ascending (**"Unified timeline displays interactions chronologically"**).
- [ ] All new paths and schemas are documented in `backend/src/docs/openapi.ts`.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 06.**
