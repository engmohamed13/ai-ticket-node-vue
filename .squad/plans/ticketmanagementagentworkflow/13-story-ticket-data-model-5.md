# Story 13 — Ticket data model: categories, priority, SLA, assignment, and comments (Story: 5)

## Prerequisites

- Story 12 completed: [../customermanagement/12-story-customer-management-ui-4.md](../customermanagement/12-story-customer-management-ui-4.md). Specifically: `User` model with `roleId`, `customerId`, and full auth/permissions are in place; `Customer` model is complete with contact fields and notes/attachments relations.
- Story 11 completed: [../customermanagement/11-story-customer-apis-4.md](../customermanagement/11-story-customer-apis-4.md). The `customers:manage` permission exists and is assigned to support roles.
- Story 05 completed: [../communicationchannels/05-story-communication-apis-2.md](../communicationchannels/05-story-communication-apis-2.md). The minimal `Ticket` model (lines 88–100 in `backend/prisma/schema.prisma`) exists with `id`, `subject`, `status`, `customerId`, `createdAt`, `updatedAt`, and a one-to-many `interactions` relation.
- A running PostgreSQL server with the `CustomerCRM` database, per [database/README.md](../../../database/README.md).

---

## Story Goal

Extend the minimal `Ticket` model from Story 05 into a ticket-management model that supports the work item's core requirements: assignment to agents, categorization and priority, basic SLA tracking (response/resolution times, overdue indicator), and internal comments/attachments. Outcomes:

1. `Ticket` gains `categoryId`, `priority`, `assignedToUserId`, `responseTimeMinutes`, `resolutionTimeMinutes`, `respondedAt`, `resolvedAt`, and `updatedAt` (already present but unused until this story).
2. New `TicketCategory` model (owned by organization, used across all tickets for consistency).
3. New `TicketComment` model (agent-authored, timestamped, part of the ticket's internal timeline — not customer-facing).
4. New `TicketAttachment` model (metadata for files attached to a ticket, stored on local disk like `CustomerAttachment`).
5. New `tickets:manage` permission (controls creation, assignment, status/priority updates, comments, attachments).
6. A real migration applied to `CustomerCRM`, and updated seed data with demo categories and a demo ticket with comments.

**Not in scope for this story:** HTTP endpoints (Story 14), the agent dashboard UI (Story 15), ticket notifications or in-app alerts (Story 15), ticket deletion (not offered in this mini-module), and Ticket-level SLA policies or automation (SLA fields are present for UI display, but no background job computes overdue status).

---

## Context — Read These Files First

1. [.squad/stories/ticketmanagementagentworkflow/5/intake.md](../../stories/ticketmanagementagentworkflow/5/intake.md) — `## Description` lists "Ticket CRUD", "Assign/Reassign Ticket to Agent", "Category and Priority", "Ticket Status", "Ticket comments", "Ticket attachments", "Ticket history", "Basic SLA", "Agent Dashboard", and "Communication Timeline". This story delivers the data model those requirements depend on.
2. `backend/prisma/schema.prisma` (lines 88–100) — the minimal `Ticket` model with `subject`, `status`, `customerId`. This story replaces that block with an extended version. Note `status` is a plain `String` (not a Prisma `enum`), validated in the API layer against `TICKET_STATUSES` constants (task 4), following the existing convention from `Interaction.channel` (Story 04).
3. `backend/src/channels/types.ts` — the precedent for `CHANNELS`, `INTERACTION_DIRECTIONS` as `as const` tuples. Task 4 creates `backend/src/tickets/types.ts` with `TICKET_STATUSES`, `TICKET_PRIORITIES`, `TICKET_CATEGORIES_PREDEFINED` in the same shape.
4. [../customermanagement/10-story-customer-data-model-4.md](../customermanagement/10-story-customer-data-model-4.md) — re-read task 1 (`CustomerNote`, `CustomerAttachment` models, nullable field design, relation directions) and task 4 (`multer` dependency, `UPLOAD_DIR`, `MAX_ATTACHMENT_SIZE_BYTES`). This story applies the exact same pattern for `TicketComment`, `TicketAttachment`. Since `multer` is already installed by Story 10, this story does not re-install it.
5. `backend/src/auth/permissions.ts` (35 lines) — `PERMISSIONS` has `'tickets:read'` (line 11) but no `'tickets:manage'` counterpart. Task 5 adds it. See context item 4 of Story 11 for the permission structure.
6. `backend/src/auth/roles.ts` (61 lines) — `SUPPORT_AGENT` (52–58), `SUPPORT_SUPERVISOR` (43–51), and `CRM_MANAGER` (31–42) hold `'tickets:read'`. Task 5 adds `'tickets:manage'` to all three, following the same grant pattern as Story 10's `'customers:manage'`. `CUSTOMER` (line 59) and `REPORTING_USER` (line 60) do not get `'tickets:manage'` (the former only sees its own tickets, the latter is read-only).
7. `backend/prisma/seed.ts` (211 lines) — the upsert pattern for demo data. Task 6 seeds one `TicketCategory` and updates the demo customer's ticket with a comment and attachment metadata.

---

## Implementation tasks

### 1 — Prisma schema: extend `Ticket`, add `TicketCategory`, `TicketComment`, `TicketAttachment`

**File: `backend/prisma/schema.prisma`**

Replace the existing `Ticket` block (lines 88–100) with:

```prisma
/// A customer support ticket. Originally minimal (Story 05), extended in Story 13 with
/// assignment, category, priority, SLA tracking, and comment/attachment support.
/// `status` is a plain String validated by the API layer against TICKET_STATUSES.
model Ticket {
  id                    Int                @id @default(autoincrement())
  subject               String
  status                String             @default("New")
  priority              String             @default("Medium")
  categoryId            Int?
  customerId            Int
  assignedToUserId      Int?
  responseTimeMinutes   Int?
  resolutionTimeMinutes Int?
  respondedAt           DateTime?
  resolvedAt            DateTime?
  createdAt             DateTime           @default(now())
  updatedAt             DateTime           @updatedAt

  customer              Customer           @relation(fields: [customerId], references: [id])
  category              TicketCategory?    @relation(fields: [categoryId], references: [id])
  assignedTo            User?              @relation(fields: [assignedToUserId], references: [id])
  interactions          Interaction[]
  comments              TicketComment[]
  attachments           TicketAttachment[]

  @@index([customerId])
  @@index([categoryId])
  @@index([assignedToUserId])
  @@map("tickets")
}

/// A ticket category (e.g. "Technical Support", "Billing", "Feature Request"). Owned by the
/// organization; all tickets use the same category list. No soft-delete — an archived
/// category remains visible in historical ticket records.
model TicketCategory {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  color     String?
  createdAt DateTime @default(now())

  tickets   Ticket[]

  @@map("ticket_categories")
}

/// An internal comment added by an agent to a ticket. Not customer-facing — never returned
/// to a CUSTOMER-role user. Part of the ticket's internal work log.
model TicketComment {
  id        Int      @id @default(autoincrement())
  body      String
  ticketId  Int
  authorId  Int
  createdAt DateTime @default(now())

  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  author    User     @relation(fields: [authorId], references: [id])

  @@index([ticketId])
  @@map("ticket_comments")
}

/// Metadata for a file attached to a ticket. The binary lives on local disk under `UPLOAD_DIR`
/// (backend/src/config/env.ts); `storagePath` is the pointer and is never serialized back
/// to the frontend (Story 14 strips it before responding).
model TicketAttachment {
  id           Int      @id @default(autoincrement())
  fileName     String
  mimeType     String
  sizeBytes    Int
  storagePath  String
  ticketId     Int
  uploadedById Int
  createdAt    DateTime @default(now())

  ticket       Ticket   @relation(fields: [ticketId], references: [id])
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])

  @@index([ticketId])
  @@map("ticket_attachments")
}
```

**File: `backend/prisma/schema.prisma`** — `User` model (currently lines 202–227)

Add two relation fields after the existing `customerNotes` / `customerAttachments` lines (219–220), before the `@@index` block:

```prisma
  assignedTickets  Ticket[]
  ticketComments   TicketComment[]
  ticketAttachments TicketAttachment[]
```

These are the `User` side of the three relations added above (`Ticket.assignedTo`, `TicketComment.author`, `TicketAttachment.uploadedBy`).

### 2 — Ticket status, priority, and category constants

**Create file: `backend/src/tickets/types.ts`**

```ts
export const TICKET_STATUSES = ['New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES_PREDEFINED = ['Technical Support', 'Billing', 'Feature Request', 'Bug Report', 'General Inquiry'] as const;
export type TicketCategoryPredefined = (typeof TICKET_CATEGORIES_PREDEFINED)[number];
```

Follows `backend/src/channels/types.ts`'s shape exactly — single source of truth for Story 14's Zod validation and Story 15's UI dropdowns.

### 3 — `tickets:manage` permission

**File: `backend/src/auth/permissions.ts`**

In `PERMISSIONS` (currently lines 1–15), add `'tickets:manage'` immediately after `'tickets:read'` (line 11):

```ts
  'tickets:read',
  'tickets:manage',
```

In `PERMISSION_DESCRIPTIONS` (currently lines 20–34), add the matching entry immediately after `'tickets:read'`'s (line 28):

```ts
  'tickets:read': 'View tickets and their timelines',
  'tickets:manage': 'Create tickets, assign/reassign to agents, update status and priority, add comments and attachments',
```

**File: `backend/src/auth/roles.ts`**

Add `'tickets:manage'` immediately after `'tickets:read'` in exactly three of the five role arrays in `ROLE_PERMISSIONS` (currently lines 29–61) — `CRM_MANAGER` (31–42), `SUPPORT_SUPERVISOR` (43–51), and `SUPPORT_AGENT` (52–58). Do **not** touch `SYSTEM_ADMINISTRATOR` (line 30), `CUSTOMER` (line 59), or `REPORTING_USER` (line 60). The work item states "As a support agent, I want to...", so `SUPPORT_AGENT` is included.

### 4 — Migration

From `backend/`:

```bash
npx prisma migrate dev --name ticket_management
```

**Read the generated `backend/prisma/migrations/<timestamp>_ticket_management/migration.sql` before continuing.** Confirm it: alters `tickets` to add the new columns (`priority TEXT NOT NULL DEFAULT 'Medium'`, `categoryId INT`, `assignedToUserId INT`, `responseTimeMinutes INT`, `resolutionTimeMinutes INT`, `respondedAt TIMESTAMP`, `resolvedAt TIMESTAMP`); creates `ticket_categories`, `ticket_comments`, and `ticket_attachments` tables with appropriate foreign keys and indexes. Because columns have defaults or are nullable, every existing row (e.g. the Story 04 demo ticket) remains valid without manual backfill.

This also regenerates `backend/src/generated/prisma/**`. Confirm the barrel exports `TicketCategory`, `TicketComment`, `TicketAttachment`, and that `prisma.ticketCategory` / `prisma.ticketComment` / `prisma.ticketAttachment` exist on the generated `PrismaClient`.

### 5 — Seed data

**File: `backend/prisma/seed.ts`**

After the existing `customer` upsert (currently lines 24–28) and before the `demoTicket` upsert (currently around line 30), add a category upsert:

```ts
const ticketCategory = await prisma.ticketCategory.upsert({
  where: { name: 'Technical Support' },
  update: {},
  create: { name: 'Technical Support', color: '#3B82F6' }
});
```

Update the `demoTicket` upsert (currently around line 30) to reference the category and assign it to the demo agent:

```ts
const demoTicket = await prisma.ticket.upsert({
  where: { id: 1 },
  update: {},
  create: {
    subject: 'Cannot login to customer portal',
    status: 'Open',
    priority: 'High',
    categoryId: ticketCategory.id,
    customerId: customer.id,
    assignedToUserId: undefined, // Will be set after demoUsers are created
    responseTimeMinutes: 30,
    resolutionTimeMinutes: 480
  }
});
```

After the `demoUsers` loop (currently ending line 194), before the final `console.log`, assign the ticket to the demo agent and add a comment:

```ts
const supportAgent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@crm.local' } });
await prisma.ticket.update({
  where: { id: demoTicket.id },
  data: { assignedToUserId: supportAgent.id }
});

const existingComment = await prisma.ticketComment.findFirst({ where: { ticketId: demoTicket.id } });
if (!existingComment) {
  await prisma.ticketComment.create({
    data: {
      ticketId: demoTicket.id,
      authorId: supportAgent.id,
      body: 'Customer reports unable to reset password. Escalating to technical team.'
    }
  });
}
```

Update the final `console.log` to report the new counts:

```ts
console.log(
  'Seed complete: system_info, 1 customer, 1 ticket (with 1 comment), 5 interactions (one per channel), 1 customer note, ' +
    `1 ticket category, 2 branches, 3 departments, ${PERMISSIONS.length} permissions, ${ROLES.length} roles, ` +
    `${demoUsers.length} demo users (password: ${DEMO_PASSWORD})`
);
```

Run `npm run db:seed` twice from `backend/` and confirm the second run creates zero new `ticket_comments` rows and leaves the ticket assignment unchanged.

---

## Edge Cases & Failure Modes

- **`categoryId` is nullable.** A ticket can exist without a category; the category is optional. When a predefined category is deleted (not offered in Story 14, but possible via direct database edit), existing ticket rows keep their `categoryId` pointing to a non-existent category — Story 14's API must handle this gracefully (e.g. return `null` for a missing category in the DTO).
- **`assignedToUserId` is nullable.** A new ticket starts unassigned; assignment is a separate operation (Story 14 adds `PATCH /api/tickets/:id/assign`). A user can be deleted (by an admin) while assigned to tickets — the FK has no `onDelete` cascade, so the ticket remains but `assignedTo` becomes `null` when fetched.
- **`status` values outside `TICKET_STATUSES`.** The database column is plain `TEXT` — Story 14's Zod validation (`z.enum(TICKET_STATUSES)`) is the only enforcement, identical to how `Interaction.channel` is validated.
- **`priority` values outside `TICKET_PRIORITIES`.** Same as status — validation in the API layer only.
- **`respondedAt` and `resolvedAt` manual tracking.** This story only defines the columns; no backend job sets them. Story 14 is responsible for updating `respondedAt` when an agent first comments or changes the status from `'New'`, and `resolvedAt` when the status moves to `'Resolved'` or `'Closed'`. Timestamps are never cleared — once set, they stay (even if status reverts, e.g. a ticket is reopened after being marked resolved).
- **SLA thresholds are reference values only.** `responseTimeMinutes` and `resolutionTimeMinutes` are set at ticket creation and serve as policy reference (e.g. "response within 30 minutes, resolved within 8 hours"). No automatic `overdue` flag or alerting is implemented — Story 15's dashboard UI computes overdue client-side by comparing `now()` to `createdAt + responseTimeMinutes`, and similarly for `resolutionTimeMinutes`. This is acceptable for a mini-module; production systems would use a background job.
- **`storagePath` uniqueness and path traversal — same as `CustomerAttachment`** (see Story 10's `## Edge Cases`). Story 14 is responsible for sanitization via `path.basename`.
- **Deleting a user who authored ticket comments or uploaded attachments.** No `onDelete` cascade on `TicketComment.authorId` or `TicketAttachment.uploadedById` — a user can be deleted while their comments/attachments remain, and `author` / `uploadedBy` become `null` in queries (soft deletion is not implemented; the record persists with a dangling FK).

---

## Test Plan

1. **Create `backend/src/tickets/types.spec.ts`** (unit, no Prisma involved):
   - `TICKET_STATUSES` has exactly six entries: `'New'`, `'Open'`, `'In Progress'`, `'Pending'`, `'Resolved'`, `'Closed'`.
   - `TICKET_PRIORITIES` has exactly four entries: `'Low'`, `'Medium'`, `'High'`, `'Urgent'`.
   - `TICKET_CATEGORIES_PREDEFINED` has exactly five entries.
   - Every entry in each tuple is unique.

2. **Manual seed verification** (not automated): after the migration and `npm run db:seed`, use `npx prisma studio` (or `psql -d CustomerCRM`) to confirm:
   - `ticket_categories` has at least the "Technical Support" row.
   - `tickets` has the demo ticket with `priority = 'High'`, `categoryId` set to "Technical Support", `assignedToUserId` set to the agent's user id, `responseTimeMinutes = 30`, `resolutionTimeMinutes = 480`.
   - `ticket_comments` has exactly 1 row attributed to `agent@crm.local`.

No Supertest suite is added in this story — there is no HTTP endpoint yet. Story 14 owns the API-level test suite, including permission tests for the new `tickets:manage` grants.

---

## Migration / Rollback

- The migration is **additive only**: it adds nullable/defaulted columns to `tickets` and creates three new tables. It touches no existing `customers`, `interactions`, `users`, `roles`, `permissions`, or other data.
- **Half-applied state:** if `prisma migrate dev` fails partway, `_prisma_migrations` records a failed migration and blocks further Prisma commands. On a development database, run `npx prisma migrate reset` (**drops all data** and re-applies every migration plus the seed).
- **Rollback:** delete the generated `backend/prisma/migrations/<timestamp>_ticket_management/` directory and run `npx prisma migrate reset`.
- Commit `backend/prisma/migrations/<timestamp>_ticket_management/**` and all files modified by tasks 1–5. Never commit `backend/.env` or anything under `backend/uploads/` or `backend/uploads-test/`.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Migration applies:** `npx prisma migrate dev --name ticket_management` succeeds; `npx prisma migrate status` reports the schema up to date.
2. **Tables exist:** `npx prisma studio` (or `psql -d CustomerCRM`) shows `ticket_categories`, `ticket_comments`, `ticket_attachments` with the foreign keys and indexes described in task 1.
3. **Seed runs twice:** `npm run db:seed` twice in a row; the second run logs the same completion message and creates zero additional `ticket_comments` rows.
4. **Backend still builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
5. **Tests pass:** `npm test` — green, including the new `tickets/types.spec.ts`.
6. **Regression:** `curl http://localhost:3000/api/health/db` (with the backend running via `npm run dev`) still returns `"status":"up"`.

---

## Done Criteria

- [ ] `Ticket` has `priority`, `categoryId`, `assignedToUserId`, `responseTimeMinutes`, `resolutionTimeMinutes`, `respondedAt`, and `resolvedAt` in `backend/prisma/schema.prisma`, with appropriate indexes and nullable/default behavior.
- [ ] `TicketCategory`, `TicketComment`, and `TicketAttachment` models exist with the relations and indexes from task 1.
- [ ] `backend/src/tickets/types.ts` defines `TICKET_STATUSES`, `TICKET_PRIORITIES`, `TICKET_CATEGORIES_PREDEFINED` with their TypeScript counterparts.
- [ ] `'tickets:manage'` exists in `PERMISSIONS`/`PERMISSION_DESCRIPTIONS` and is granted to `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, and `SUPPORT_AGENT` only.
- [ ] A real migration is committed and applied to `CustomerCRM`; `TicketCategory`, `TicketComment`, and `TicketAttachment` are exported from `backend/src/generated/prisma/models.ts`.
- [ ] `npm run db:seed` is idempotent and produces the demo ticket with assigned agent, one comment, and category.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 14.**
