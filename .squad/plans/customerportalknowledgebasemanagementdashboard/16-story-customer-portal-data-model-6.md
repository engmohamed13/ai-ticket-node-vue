# Story 16 — Customer Portal: feedback data model & APIs (Story: 6)

## Prerequisites

- Story 15 completed: [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md). Ticket system with categories, comments, and attachments is live; all ticket APIs and UI are complete.
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). CUSTOMER role exists and is scoped to view only their own data via `customerId`.
- Story 10 completed: [../customermanagement/10-story-customer-data-model-4.md](../customermanagement/10-story-customer-data-model-4.md). Customer model with contact fields and relations is in place.
- A running PostgreSQL server with `CustomerCRM` database and migrations applied through Story 15.

---

## Story Goal

Add a customer feedback system that allows customers (CUSTOMER-role users) to submit ratings and comments on resolved tickets, and view their own ticket history and status in a customer-facing portal. This enables customers to track their support requests and provide closure feedback.

Outcomes:

1. New `TicketFeedback` model capturing customer satisfaction ratings (1–5 stars) and optional comment text on resolved tickets.
2. New `feedback:write` permission for customer feedback submission; new `feedback:read` permission for agents/managers to view feedback.
3. Four new backend APIs: `POST /api/tickets/:id/feedback` (submit feedback, customer-scoped), `GET /api/tickets/:id/feedback` (view feedback, gated on `feedback:read`), `GET /api/customers/portal/tickets` (list own tickets for customer portal), `GET /api/customers/portal/summary` (customer's ticket summary stats).
4. Customer role gains `feedback:write` permission (for their own feedback) and read-only access to their own ticket list.
5. Real migration applied to `CustomerCRM`; seed data includes one feedback entry on the demo ticket.

**Not in scope for this story:** email notifications on feedback submission, bulk feedback export, feedback analytics (covered by Story 21 dashboard), customer-initiated ticket creation (customer portal is read-only for tickets), ticket assignment UI (agents-only, Story 15), and feedback moderation/deletion.

---

## Context — Read These Files First

1. [.squad/stories/customerportalknowledgebasemanagementdashboard/6/intake.md](../../stories/customerportalknowledgebasemanagementdashboard/6/intake.md) — `## Description` lists "Customer login", "View own tickets", "Track ticket status", "Submit feedback". This story delivers the backend data model and APIs those features depend on.

2. `backend/prisma/schema.prisma` (lines 93–119) — the complete `Ticket` model with categories, comments, attachments, and assignment. This story adds a one-to-one `TicketFeedback` relation. Note the comment convention (model purpose, story context, validation strategy).

3. `backend/src/tickets/types.ts` — the constant tuple pattern for `TICKET_STATUSES` / `TICKET_PRIORITIES`. This story does not introduce new enum-like types, but reuses `TicketStatus` to constrain which statuses allow feedback submission.

4. [../customermanagement/10-story-customer-data-model-4.md](../customermanagement/10-story-customer-data-model-4.md) — the `Customer` model relations; note `customerId` is how the API layer scopes customer-role users to see only their own records.

5. [../ticketmanagementagentworkflow/14-story-ticket-management-apis-5.md](../ticketmanagementagentworkflow/14-story-ticket-management-apis-5.md) — read task 1 (`GET /api/tickets`, filtering, permission checks, response shape) and the error handling patterns (`AppError`, `toErrorMessage`).

6. `backend/src/auth/permissions.ts` — currently has `'tickets:read'`, `'tickets:manage'`, `'customers:read'`, `'customers:manage'`, etc. Task 2 adds `'feedback:write'` and `'feedback:read'`.

7. `backend/src/auth/roles.ts` — CUSTOMER role (currently lines 59–64) has no permissions; task 3 adds `'feedback:write'` for the customer's own feedback. SUPPORT_AGENT, SUPPORT_SUPERVISOR, CRM_MANAGER get `'feedback:read'`. REPORTING_USER (read-only analyst) gets `'feedback:read'` too.

8. `backend/src/services/ticket.service.ts` — the pattern for filtering by customer (`where: { customerId: userId.customerId }`), permission checks, and returning DTOs. Task 5 adds two new service functions following the same pattern.

9. `backend/prisma/seed.ts` — the demo-data upsert pattern. Task 6 seeds one feedback entry on the demo ticket (5-star rating, short comment like "Excellent support!").

---

## Implementation tasks

### 1 — Prisma schema: add `TicketFeedback` model

**File: `backend/prisma/schema.prisma`**

Add after the `TicketAttachment` model (after line 171):

```prisma
/// A customer satisfaction rating and optional comment left after a ticket is resolved.
/// One feedback per ticket (unique constraint). Submitted by the customer who owns
/// the ticket; agents cannot edit or delete, only view. Ratings are 1–5 stars.
model TicketFeedback {
  id        Int      @id @default(autoincrement())
  rating    Int      // 1–5 stars, validated by API layer
  comment   String?  // optional open-ended feedback
  ticketId  Int      @unique
  customerId Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  customer  Customer @relation(fields: [customerId], references: [id])

  @@index([customerId])
  @@map("ticket_feedback")
}
```

Add a relation to the `Ticket` model (lines 93–119) — after line 113 (after `attachments TicketAttachment[]`), add:

```prisma
  feedback          TicketFeedback?
```

Add a relation to the `Customer` model (lines 27–47) — after line 44 (after `attachments CustomerAttachment[]`), add:

```prisma
  feedback          TicketFeedback[]
```

### 2 — Add feedback permissions

**File: `backend/src/auth/permissions.ts`**

Add two new entries to the `PERMISSIONS` tuple (maintaining alphabetical order within the tuple):

```ts
'feedback:read',   // agents/managers can view customer feedback on resolved tickets
'feedback:write',  // customers can submit their own feedback on their tickets
```

Update `PERMISSIONS` constant to include these alongside existing permissions like `'tickets:read'`, `'customers:manage'`, etc.

### 3 — Grant feedback permissions to roles

**File: `backend/src/auth/roles.ts`**

- **CUSTOMER** role (line 59): Add `'feedback:write'`. Customers can only write feedback on their own tickets (API layer enforces).
- **SUPPORT_AGENT**, **SUPPORT_SUPERVISOR**, **CRM_MANAGER** (lines 43–58): Add `'feedback:read'` to all three. They can view feedback from any customer.
- **REPORTING_USER** (line 60): Add `'feedback:read'` (analyst can see feedback in reports, Story 21).

### 4 — Add feedback types constants

**File: `backend/src/tickets/types.ts`**

Append at the end (after line 33):

```ts
export const FEEDBACK_RATINGS = [1, 2, 3, 4, 5] as const;
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number];

export interface TicketFeedbackDto {
  id: number;
  rating: FeedbackRating;
  comment: string | null;
  ticketId: number;
  createdAt: string;
}

export interface SubmitFeedbackPayload {
  rating: number; // 1–5, validated by schema
  comment?: string; // optional, max 1000 chars
}
```

### 5 — Add feedback service functions

**File: `backend/src/services/ticket.service.ts`**

Add two new exported functions at the end of the file (before the closing `export` line):

```ts
export const submitTicketFeedback = async (
  ticketId: number,
  customerId: number,
  payload: SubmitFeedbackPayload
): Promise<TicketFeedbackDto> => {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new AppError(404, 'Ticket not found');
  if (ticket.customerId !== customerId) {
    throw new AppError(403, 'Cannot submit feedback for another customer\'s ticket');
  }
  if (!CLOSED_TICKET_STATUSES.includes(ticket.status as TicketStatus)) {
    throw new AppError(400, 'Feedback can only be submitted on resolved or closed tickets');
  }

  const existing = await prisma.ticketFeedback.findUnique({ where: { ticketId } });
  if (existing) throw new AppError(409, 'Feedback already submitted for this ticket');

  const feedback = await prisma.ticketFeedback.create({
    data: {
      rating: payload.rating,
      comment: payload.comment || null,
      ticketId,
      customerId
    }
  });

  return toFeedbackDto(feedback);
};

export const getTicketFeedback = async (ticketId: number): Promise<TicketFeedbackDto | null> => {
  const feedback = await prisma.ticketFeedback.findUnique({ where: { ticketId } });
  return feedback ? toFeedbackDto(feedback) : null;
};

export const getCustomerPortalTickets = async (customerId: number): Promise<TicketListItem[]> => {
  const tickets = await prisma.ticket.findMany({
    where: { customerId },
    include: {
      category: true,
      feedback: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return tickets.map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    category: t.category ? { id: t.category.id, name: t.category.name } : null,
    hasFeedback: !!t.feedback,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString()
  }));
};

export const getCustomerPortalSummary = async (customerId: number): Promise<CustomerPortalSummary> => {
  const [allTickets, openTickets, resolvedTickets] = await Promise.all([
    prisma.ticket.count({ where: { customerId } }),
    prisma.ticket.count({ where: { customerId, status: { in: ['New', 'Open', 'In Progress', 'Pending'] } } }),
    prisma.ticket.count({ where: { customerId, status: { in: CLOSED_TICKET_STATUSES } } })
  ]);

  return {
    totalTickets: allTickets,
    openTickets,
    resolvedTickets
  };
};

// Helper to convert Prisma TicketFeedback to DTO (never returns storagePath-like internal fields)
const toFeedbackDto = (feedback: any): TicketFeedbackDto => ({
  id: feedback.id,
  rating: feedback.rating,
  comment: feedback.comment,
  ticketId: feedback.ticketId,
  createdAt: feedback.createdAt.toISOString()
});

interface TicketListItem {
  id: number;
  subject: string;
  status: string;
  priority: string;
  category: { id: number; name: string } | null;
  hasFeedback: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CustomerPortalSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
}
```

Import `CLOSED_TICKET_STATUSES` and `TicketStatus` from `./tickets/types.ts` at the top of the file.

### 6 — Add feedback API routes

**Create file: `backend/src/routes/feedback.routes.ts`**

```ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { z } from 'zod';
import * as feedbackController from '../controllers/feedback.controller';

const router = Router();

const submitFeedbackSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1000).optional()
  })
});

// Submit feedback on a resolved ticket (customer only, scoped to own tickets)
router.post(
  '/tickets/:id/feedback',
  authenticate,
  validate(submitFeedbackSchema),
  feedbackController.submitFeedback
);

// View feedback on a ticket (gated on feedback:read)
router.get(
  '/tickets/:id/feedback',
  authenticate,
  feedbackController.getTicketFeedback
);

// Customer portal: list own tickets
router.get(
  '/customers/portal/tickets',
  authenticate,
  feedbackController.getCustomerPortalTickets
);

// Customer portal: own ticket summary stats
router.get(
  '/customers/portal/summary',
  authenticate,
  feedbackController.getCustomerPortalSummary
);

export default router;
```

### 7 — Add feedback controller

**Create file: `backend/src/controllers/feedback.controller.ts`**

```ts
import { Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import * as feedbackService from '../services/feedback.service';

export const submitFeedback = async (req: Request, res: Response): Promise<void> => {
  const { id: ticketId } = req.params;
  const customerId = (req.user as any).customerId;

  if (!customerId) {
    throw new AppError(403, 'Only customers can submit feedback');
  }

  const feedback = await feedbackService.submitTicketFeedback(
    Number(ticketId),
    customerId,
    req.body
  );

  res.status(201).json({ data: feedback, message: 'Feedback submitted' });
};

export const getTicketFeedback = async (req: Request, res: Response): Promise<void> => {
  const { id: ticketId } = req.params;

  if (!req.user?.can('feedback:read')) {
    throw new AppError(403, 'Not authorized to view feedback');
  }

  const feedback = await feedbackService.getTicketFeedback(Number(ticketId));
  res.json({ data: feedback });
};

export const getCustomerPortalTickets = async (req: Request, res: Response): Promise<void> => {
  const customerId = (req.user as any).customerId;

  if (!customerId) {
    throw new AppError(403, 'Only customers can access the customer portal');
  }

  const tickets = await feedbackService.getCustomerPortalTickets(customerId);
  res.json({ data: tickets });
};

export const getCustomerPortalSummary = async (req: Request, res: Response): Promise<void> => {
  const customerId = (req.user as any).customerId;

  if (!customerId) {
    throw new AppError(403, 'Only customers can access the customer portal');
  }

  const summary = await feedbackService.getCustomerPortalSummary(customerId);
  res.json({ data: summary });
};
```

### 8 — Move feedback service to new module

**Create file: `backend/src/services/feedback.service.ts`**

Move the four functions from task 5 (and helper types) into this new dedicated service file. Keep the implementation identical; this just separates concerns (ticket management vs. feedback). Update imports in the feedback controller to import from `../services/feedback.service`.

### 9 — Update main app routes

**File: `backend/src/app.ts`**

Add the feedback router after the existing route registrations (e.g., after ticket routes):

```ts
import feedbackRouter from './routes/feedback.routes';

// ... existing route registrations ...

app.use('/api', feedbackRouter);
```

### 10 — Database migration

Run Prisma migration to create the `ticket_feedback` table:

```bash
npx prisma migrate dev --name add_feedback_model
```

Commit the generated migration file to version control.

### 11 — Seed feedback data

**File: `backend/prisma/seed.ts`**

After seeding the demo ticket (approximately line 180–210, where the demo ticket is created), add:

```ts
// Seed one feedback entry on the demo ticket
await prisma.ticketFeedback.upsert({
  where: { ticketId: demoTicket.id },
  update: {},
  create: {
    rating: 5,
    comment: 'Excellent support! Issue was resolved quickly.',
    ticketId: demoTicket.id,
    customerId: demoCustomer.id
  }
});
```

---

## Edge Cases & Failure Modes

- **Feedback on open tickets.** `submitTicketFeedback` checks `CLOSED_TICKET_STATUSES` before allowing submission. If a customer tries to submit feedback on an "Open" ticket, they receive `400 "Feedback can only be submitted on resolved or closed tickets"` and the form is not cleared (UX handles retry).

- **Duplicate feedback submission.** The `TicketFeedback` model has a `@unique` constraint on `ticketId`. A second submission attempt throws a unique violation; `submitTicketFeedback` catches and returns `409 "Feedback already submitted for this ticket"` via `AppError`.

- **Customer A tries to submit feedback for Customer B's ticket.** The `customerId` in the JWT is different from `ticket.customerId`; `submitTicketFeedback` throws `403 "Cannot submit feedback for another customer's ticket"`.

- **CUSTOMER-role user tries to call `GET /api/tickets/:id/feedback` without `feedback:read`.** The route handler checks `req.user?.can('feedback:read')` and throws `403 "Not authorized to view feedback"` — by design, customers cannot view others' feedback (not in acceptance criteria; Story 21 dashboard is internal only).

- **Accessing `/api/customers/portal/tickets` as a non-customer (e.g., agent logged in).** No `customerId` in `req.user`; throws `403 "Only customers can access the customer portal"`.

- **Feedback comment contains XSS payload (e.g., `<script>alert('xss')</script>`).** Stored as-is in the database; the frontend (Story 17) must HTML-escape before rendering. The schema validation (`z.string().max(1000)`) does not sanitize input — that is a frontend concern.

- **Rating field sent as a string (`"3"`) instead of a number.** Zod schema validation (`z.number().int()`) rejects it with a `400 "Invalid input"` before it reaches the service.

- **Rating sent as `2.5` (non-integer).** Zod's `.int()` constraint rejects it; customer gets `400`.

---

## Test Plan

1. **Backend service tests** (`backend/src/tests/feedback.service.spec.ts`):
   - `submitTicketFeedback` succeeds and returns a DTO with `id`, `rating`, `comment`, `ticketId`, `createdAt`.
   - `submitTicketFeedback` rejects if ticket is not found (404).
   - `submitTicketFeedback` rejects if `customerId` does not match the ticket's customer (403).
   - `submitTicketFeedback` rejects if ticket status is not in `CLOSED_TICKET_STATUSES` (400).
   - `submitTicketFeedback` rejects duplicate feedback on same ticket (409).
   - `getTicketFeedback` returns feedback if it exists, `null` if not.
   - `getCustomerPortalTickets` returns a list of the customer's tickets sorted by `createdAt` descending, with `hasFeedback` boolean.
   - `getCustomerPortalSummary` returns correct counts for `totalTickets`, `openTickets`, `resolvedTickets`.

2. **Backend route tests** (`backend/src/tests/feedback.spec.ts`):
   - `POST /api/tickets/:id/feedback` with valid payload succeeds (201).
   - `POST /api/tickets/:id/feedback` with invalid rating (e.g., 6) returns 400.
   - `POST /api/tickets/:id/feedback` without `feedback:write` permission returns 403.
   - `GET /api/tickets/:id/feedback` with `feedback:read` permission returns feedback (200).
   - `GET /api/tickets/:id/feedback` without permission returns 403.
   - `GET /api/customers/portal/tickets` with no `customerId` (non-customer user) returns 403.
   - `GET /api/customers/portal/summary` calculates correct ticket counts.

3. **Database migration test**: `npm run db:seed` runs without error and the demo feedback entry is inserted.

---

## Verification Steps

**Backend builds:** `npm run build` exits 0 from `backend/`.

**Typecheck:** `npm run typecheck` exits 0 from `backend/`.

**Tests pass:** `npm test` exits 0 from `backend/`, including all feedback-related specs.

**Database migration:** `npm run db:seed` completes and `npx prisma studio` shows the demo feedback entry on the demo ticket (5 stars, "Excellent support!").

**Dev smoke test:**
1. `npm run dev` in both `backend/` and `frontend/`.
2. Log in as the demo customer (e.g., if a customer user exists in seed data, login with those credentials). If no customer user exists yet, create one via the user management UI as an agent (Story 09).
3. Navigate to the customer portal (Story 17 adds this route; for now, manually test the API).
4. Call `GET /api/customers/portal/summary` via a REST client and confirm it returns `{ totalTickets: 1, openTickets: 0, resolvedTickets: 1 }` (or the appropriate counts for the demo data).
5. Call `GET /api/customers/portal/tickets` and confirm the demo ticket is returned with `status: "Resolved"` (or appropriate status) and `hasFeedback: true`.
6. Call `GET /api/tickets/{demoTicketId}/feedback` as an agent and confirm it returns the 5-star feedback.
7. Log in as a different customer (create one if needed) and attempt `POST /api/tickets/{demoTicketId}/feedback`. Confirm it returns `403 "Cannot submit feedback for another customer's ticket"`.

---

## Done Criteria

- [ ] `TicketFeedback` Prisma model added with `rating`, `comment`, `ticketId`, `customerId` fields and `@unique` on `ticketId`.
- [ ] `feedback:read` and `feedback:write` permissions exist in the backend auth system.
- [ ] CUSTOMER role has `feedback:write`; SUPPORT_AGENT, SUPPORT_SUPERVISOR, CRM_MANAGER, REPORTING_USER all have `feedback:read`.
- [ ] `POST /api/tickets/:id/feedback` (submit) and `GET /api/tickets/:id/feedback` (view) endpoints are implemented and permission-gated.
- [ ] `GET /api/customers/portal/tickets` and `GET /api/customers/portal/summary` endpoints work for customer-scoped users only.
- [ ] Database migration creates `ticket_feedback` table; seed data includes one feedback entry on the demo ticket.
- [ ] All backend tests pass; `npm run build` and `npm run typecheck` exit 0.
- [ ] Manual smoke tests confirm API behavior for success, permission checks, and edge cases (duplicate feedback, closed-ticket-only, customer-scoped).
