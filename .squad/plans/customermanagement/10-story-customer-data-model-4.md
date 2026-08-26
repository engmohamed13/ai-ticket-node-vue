# Story 10 — Customer profile data model: contact fields, status, notes, and attachments (Story: 4)

## Prerequisites

- Story 04 completed: [../communicationchannels/04-story-data-model-channels-2.md](../communicationchannels/04-story-data-model-channels-2.md). `backend/prisma/schema.prisma` currently declares a **minimal** `Customer` model (`id`, `name`, `email`, `phone`, `createdAt` — lines 24–38) explicitly scoped to "what interactions need"; this story is the "full customer profile management" work that model's own doc comment (line 25) deferred.
- Story 07 completed: [../authenticationandusermanagement/07-story-auth-data-model-3.md](../authenticationandusermanagement/07-story-auth-data-model-3.md). `backend/src/auth/permissions.ts` (`PERMISSIONS`, `PERMISSION_DESCRIPTIONS`) and `backend/src/auth/roles.ts` (`ROLE_PERMISSIONS`) exist and are seeded; `User` has a nullable `customerId` (`backend/prisma/schema.prisma:165`).
- Story 08 completed: [../authenticationandusermanagement/08-story-auth-apis-3.md](../authenticationandusermanagement/08-story-auth-apis-3.md). `requirePermission`, `getAuth`, `AppError`, and `validate` exist — Story 11 (APIs) depends on them, and this story's permission changes are what Story 11 gates its new endpoints on.
- **A running PostgreSQL server is required** to run `npx prisma migrate dev`. Confirm `GET /api/health/db` reports `"status":"up"` before starting, or start PostgreSQL per [database/README.md](../../../database/README.md).
- **No file-upload dependency exists in this codebase today.** `grep -rn "multer" backend/src backend/package.json` returns nothing. This story adds `multer` (and its `@types/multer` dev dependency) — the first binary-upload capability in the project — because "Attachments" (work item 4) has no existing precedent to extend.

---

## Story Goal

Extend the minimal `Customer` model into a real profile the rest of the feature (Story 11 APIs, Story 12 UI) can build on:

1. `Customer` gains contact-info fields (`company`, `address`, `city`, `country`), a `status` field following the existing plain-`String` convention (`Ticket.status`, `Interaction.channel` — no Prisma `enum`), and `updatedAt`.
2. Two new models: `CustomerNote` (a timestamped, attributed note an agent leaves on a profile) and `CustomerAttachment` (metadata for a file stored on local disk — the row is a pointer, never the binary itself).
3. A new `customers:manage` permission, granted to the roles that create/edit customer profiles (`CRM_MANAGER`, `SUPPORT_SUPERVISOR`, `SUPPORT_AGENT`, and implicitly `SYSTEM_ADMINISTRATOR` via the full `PERMISSIONS` spread) and withheld from `REPORTING_USER` (read-only) and `CUSTOMER` (no `customers:read` at all — see `## Edge Cases & Failure Modes`).
4. Local-disk attachment storage configuration (`UPLOAD_DIR`, `MAX_ATTACHMENT_SIZE_BYTES`) in `backend/src/config/env.ts`, and the `multer` dependency Story 11's upload endpoint needs.
5. A real migration applied to `CustomerCRM`, and updated seed data.

**Not in scope for this story:** any HTTP endpoint (Story 11), the frontend (Story 12), cloud/object-storage for attachments (local disk only — appropriate for this mini-module), and virus scanning or MIME-type allow-listing of uploaded files (flagged as a follow-up in `## Edge Cases & Failure Modes`).

---

## Context — Read These Files First

1. [.squad/stories/customermanagement/4/intake.md](../../stories/customermanagement/4/intake.md) — `## Description` lists "Customer database model and APIs", "Contact information", "Customer status", "Notes", "Attachments"; `## Acceptance criteria` includes "Customer notes and attachments can be managed." This story delivers the data layer those two criteria need.
2. `backend/prisma/schema.prisma` (180 lines) — read the whole file. The `Customer` block (24–38) is what task 1 replaces; the `User` block (156–179) is what task 1 adds two relation fields to (after line 172, before the `@@index` block at 174–178). Note `Ticket.status String @default("Open")` (line 45) and the doc comment on `Interaction` (58–59, "plain strings validated by the API layer... following the same convention as `Ticket.status`... rather than a Prisma enum") — `Customer.status` follows the identical convention in task 1.
3. `backend/src/channels/types.ts` — the precedent for a hand-rolled `as const` string tuple backing a plain-`String` schema column (`CHANNELS`, `INTERACTION_DIRECTIONS`). Task 2 creates `backend/src/customers/types.ts` following the exact same shape for `CUSTOMER_STATUSES`.
4. `backend/src/auth/permissions.ts` (35 lines) — read the whole file. `PERMISSIONS` (1–15) already contains `'customers:read'` (line 8) with no `'customers:manage'` counterpart — unlike `users:read`/`users:manage`, `roles:read`/`roles:manage`, `orgunits:read`/`orgunits:manage`, which all have both. Task 3 fills that gap. `PERMISSION_DESCRIPTIONS` (20–34) is a sibling map keyed by the same tuple.
5. `backend/src/auth/roles.ts` (61 lines) — read the whole file. `ROLE_PERMISSIONS` (29–61): `CRM_MANAGER` (31–42) and `SUPPORT_SUPERVISOR` (43–51) both already hold `'customers:read'`; `SUPPORT_AGENT` (52–58) does too. `CUSTOMER` (line 59) holds `['tickets:read', 'interactions:read', 'interactions:create']` — **no `customers:read`**. `REPORTING_USER` (line 60) holds `'customers:read'` but not `'tickets:manage'` (read-only pattern to preserve). Task 3 adds `'customers:manage'` to `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, and `SUPPORT_AGENT` only.
6. `backend/src/config/env.ts` (37 lines) — read the whole file. `envSchema` (6–21) is a Zod object; `JWT_EXPIRES_IN_SECONDS` (line 20) is the pattern for a `z.coerce.number().int().positive().default(...)` field. Task 4 adds two more fields the same way.
7. `backend/prisma/seed.ts` (211 lines) — read the whole file. The `customer` upsert (24–28) is what task 6 extends with the new contact/status fields. The `demoUsers` loop (117–194) creates `agent@crm.local` (SUPPORT_AGENT) — task 6 looks this user up by email afterward to attribute the demo note. The final `console.log` (196–200) is what task 6 extends to report the new counts.
8. `backend/.gitignore` — read the whole file. No `uploads/` entry exists. Task 5 adds one, in the same style as the existing `dist/`, `.env`, and `*.log` entries.
9. [04-story-data-model-channels-2.md](../communicationchannels/04-story-data-model-channels-2.md) — re-read its `## Migration / Rollback` and `## Test Plan` sections; this story's equivalent sections follow the same shape (additive-only migration, no HTTP endpoint yet so no Supertest suite, a small unit test for the new constants file).

---

## Implementation tasks

### 1 — Prisma schema: extend `Customer`, add `CustomerNote` and `CustomerAttachment`

**File: `backend/prisma/schema.prisma`**

Replace the existing `Customer` block (lines 24–38) with:

```prisma
/// A customer profile. Contact/status fields beyond name+email+phone were added in
/// Story 10 (work item 4) — the original comment here ("full profile management is
/// out of scope") no longer applies.
model Customer {
  id           Int                  @id @default(autoincrement())
  name         String
  email        String               @unique
  phone        String?
  company      String?
  address      String?
  city         String?
  country      String?
  status       String               @default("ACTIVE")
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  tickets      Ticket[]
  interactions Interaction[]
  users        User[]
  notes        CustomerNote[]
  attachments  CustomerAttachment[]

  @@map("customers")
}
```

`status` follows the plain-`String` convention from `Ticket.status` / `Interaction.channel` (see context item 2) — validated in the API layer (Story 11) against `CUSTOMER_STATUSES` (task 2), not a Prisma `enum`. All four new contact fields are nullable: existing rows created before this migration (and every current call site — Story 05's `createInteraction`, Story 08's `createUser` with a `customerId`) keep working unmodified.

Append two new models after `Customer` (before `Ticket`, or anywhere below `Customer` — order does not matter to Prisma):

```prisma
/// A free-text note an agent leaves on a customer profile. Internal only — never
/// returned to a CUSTOMER-role user (that role holds no `customers:read` permission
/// at all; see backend/src/auth/roles.ts).
model CustomerNote {
  id         Int      @id @default(autoincrement())
  body       String
  customerId Int
  authorId   Int
  createdAt  DateTime @default(now())

  customer   Customer @relation(fields: [customerId], references: [id])
  author     User     @relation(fields: [authorId], references: [id])

  @@index([customerId])
  @@map("customer_notes")
}

/// Metadata for a file attached to a customer profile. The binary lives on local disk
/// under `UPLOAD_DIR` (backend/src/config/env.ts); `storagePath` is the pointer to it
/// and is never serialized back to the frontend (Story 11 strips it before responding).
model CustomerAttachment {
  id           Int      @id @default(autoincrement())
  fileName     String
  mimeType     String
  sizeBytes    Int
  storagePath  String
  customerId   Int
  uploadedById Int
  createdAt    DateTime @default(now())

  customer     Customer @relation(fields: [customerId], references: [id])
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])

  @@index([customerId])
  @@map("customer_attachments")
}
```

**File: `backend/prisma/schema.prisma`** — `User` model (currently lines 156–179)

Add two relation fields after the existing `customer Customer? @relation(...)` line (172), before the `@@index` block:

```prisma
  customerNotes       CustomerNote[]
  customerAttachments CustomerAttachment[]
```

Prisma requires both sides of a relation to be declared; these are the `User` side of the two relations added above.

### 2 — Customer status constants

**Create file: `backend/src/customers/types.ts`**

```ts
export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];
```

Follows `backend/src/channels/types.ts`'s `CHANNELS` / `Channel` shape exactly (context item 3) — the single source of truth Story 11's Zod validation (`z.enum(CUSTOMER_STATUSES)`) and Story 12's frontend status dropdown both read from.

### 3 — `customers:manage` permission

**File: `backend/src/auth/permissions.ts`**

In `PERMISSIONS` (currently lines 1–15), add `'customers:manage'` immediately after `'customers:read'` (line 8):

```ts
  'customers:read',
  'customers:manage',
```

In `PERMISSION_DESCRIPTIONS` (currently lines 20–34), add the matching entry immediately after `'customers:read'`'s (line 27):

```ts
  'customers:read': 'View the customer list',
  'customers:manage': 'Create and update customer profiles, notes, and attachments',
```

**File: `backend/src/auth/roles.ts`**

Add `'customers:manage'` immediately after `'customers:read'` in exactly three of the five role arrays in `ROLE_PERMISSIONS` (currently lines 29–61) — `CRM_MANAGER` (31–42), `SUPPORT_SUPERVISOR` (43–51), and `SUPPORT_AGENT` (52–58). Do **not** touch `SYSTEM_ADMINISTRATOR` (line 30, already `PERMISSIONS` — the full tuple), `CUSTOMER` (line 59), or `REPORTING_USER` (line 60, stays read-only). Work item 4's opening line — "As a support agent, I want to manage customer profiles" — is why `SUPPORT_AGENT` is included, not just the two management tiers above it.

### 4 — Attachment storage configuration

**File: `backend/src/config/env.ts`**

Add two fields to `envSchema` (currently lines 6–21), after `JWT_EXPIRES_IN_SECONDS` (line 20):

```ts
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  MAX_ATTACHMENT_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024)
```

`UPLOAD_DIR` is relative to the `backend/` working directory (matching how `npm run dev` / `npm start` are always invoked from `backend/` per every existing npm script). `MAX_ATTACHMENT_SIZE_BYTES` defaults to 10 MiB — Story 11's `multer` config reads this to reject oversized uploads with a `400` before they hit disk.

**File: `backend/.env.example`**

Append:

```dotenv
# Customer attachments — local disk storage directory (relative to backend/) and the
# maximum accepted file size in bytes. Default 10485760 = 10 MiB.
UPLOAD_DIR=uploads
MAX_ATTACHMENT_SIZE_BYTES=10485760
```

Both fields have defaults, so no change to `backend/src/tests/setup.ts` or your local `backend/.env` is required — unlike `JWT_SECRET` in Story 08, a missing value here does not crash the process.

### 5 — Ignore uploaded files

**File: `backend/.gitignore`**

Add a new section, following the existing style (a comment header, then the pattern):

```gitignore
# Uploaded customer attachments (local disk storage — Story 10)
uploads/
uploads-test/
```

`uploads-test/` is reserved now for Story 11's test suite, which will point `UPLOAD_DIR` at it during `npm test` so Jest runs never write into the real `uploads/` directory.

### 6 — Install `multer`

From `backend/`:

```bash
npm install multer
npm install -D @types/multer
```

Do not hand-pick version numbers — let `npm` resolve the current major release, then commit the resulting `backend/package.json` and `backend/package-lock.json` changes. Story 11 imports `multer` in a new `backend/src/middleware/upload.middleware.ts`; no code in this story imports it yet.

### 7 — Migration

From `backend/`:

```bash
npx prisma migrate dev --name customer_profile
```

**Read the generated `backend/prisma/migrations/<timestamp>_customer_profile/migration.sql` before continuing.** Confirm it: adds `company`, `address`, `city`, `country` (all nullable `TEXT`), `status` (`TEXT NOT NULL DEFAULT 'ACTIVE'`), and `updatedAt` to `customers`; creates `customer_notes` with foreign keys to `customers.id` and `users.id`; creates `customer_attachments` with foreign keys to `customers.id` and `users.id`. Because `status` has a database-level default, every existing row (e.g. the Story 04 demo customer) gets `'ACTIVE'` automatically — no manual backfill script is needed.

This also regenerates `backend/src/generated/prisma/**`. Confirm the barrel (`backend/src/generated/prisma/models.ts`) now exports `CustomerNote` and `CustomerAttachment`, and that `prisma.customerNote` / `prisma.customerAttachment` exist on the generated `PrismaClient` before Story 11 references them.

### 8 — Seed data

**File: `backend/prisma/seed.ts`**

Replace the existing `customer` upsert (currently lines 24–28) with:

```ts
const customer = await prisma.customer.upsert({
  where: { email: 'demo.customer@example.com' },
  update: {},
  create: {
    name: 'Demo Customer',
    email: 'demo.customer@example.com',
    phone: '+1-555-0100',
    company: 'Acme Logistics',
    address: '400 Market Street',
    city: 'San Francisco',
    country: 'USA',
    status: 'ACTIVE'
  }
});
```

`update: {}` is unchanged — reseeding must not overwrite contact details an administrator edited through the Story 11 API, matching the existing `systemInfo`/`branch`/`department` upsert idempotency pattern used throughout this file.

After the `demoUsers` loop (currently ending line 194), before the final `console.log` (196), add:

```ts
const supportAgent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@crm.local' } });
const existingNote = await prisma.customerNote.findFirst({ where: { customerId: customer.id } });
if (!existingNote) {
  await prisma.customerNote.create({
    data: {
      customerId: customer.id,
      authorId: supportAgent.id,
      body: 'Called about the login issue; advised the customer to reset their password via the email on file.'
    }
  });
}
```

Update the final `console.log` (currently lines 196–200) to also report the note:

```ts
console.log(
  'Seed complete: system_info, 1 customer, 1 ticket, 5 interactions (one per channel), 1 customer note, ' +
    `2 branches, 3 departments, ${PERMISSIONS.length} permissions, ${ROLES.length} roles, ` +
    `${demoUsers.length} demo users (password: ${DEMO_PASSWORD})`
);
```

Run `npm run db:seed` twice from `backend/` and confirm the second run creates zero new `customer_notes` rows (the `findFirst` guard) and leaves `customers.company` etc. unchanged.

---

## Edge Cases & Failure Modes

- **`CUSTOMER`-role users have no `customers:read` or `customers:manage` permission at all.** This is a pre-existing decision from Story 07/08 (`backend/src/auth/roles.ts:59`), not something this story introduces — a customer-role user cannot view their own profile through `/api/customers`, only their own tickets and interactions. Task 3 deliberately does not add `customers:read` or `customers:manage` to the `CUSTOMER` array; do not "fix" this as part of this story — it is out of scope, matching how `git show 988127f` (the historical implementation) never let a customer view their own profile row either.
- **Deleting a customer with notes or attachments.** No `onDelete` is specified on the `customer` relation in task 1, so Prisma defaults to `Restrict` — deleting a `Customer` with `CustomerNote` or `CustomerAttachment` rows fails at the database level, matching the existing `Ticket`/`Interaction` relations (see context item 2 / Story 04's `## Edge Cases`). No delete-customer endpoint exists in this feature (Story 11 adds create/update only).
- **`status` values outside `CUSTOMER_STATUSES`.** The database column is a plain `TEXT` with no `CHECK` constraint — nothing at the schema level stops an out-of-band `UPDATE customers SET status = 'whatever'`. Story 11's Zod validation (`z.enum(CUSTOMER_STATUSES)`) is the only enforcement, identical to how `Ticket.status` / `Interaction.channel` are validated (context item 2).
- **`storagePath` uniqueness and path traversal.** This story only defines the column as a plain `String` — it does not constrain its contents. Story 11 is responsible for sanitizing `file.originalname` (stripping any `../` or directory components via `path.basename`) before it becomes part of a path, and for generating a unique filename per upload. Flagged here so Story 11 does not skip it.
- **No MIME-type allow-list or virus scanning.** Any file type up to `MAX_ATTACHMENT_SIZE_BYTES` can be uploaded once Story 11 wires the endpoint. Acceptable for this mini-module; documented as a known limitation, not fixed here.
- **`multer`'s exact installed version is unknown until `npm install` runs.** Task 6 deliberately does not pin a version in this document — Story 11 must read the installed `backend/node_modules/multer/package.json` (or `backend/package.json` after task 6 lands) to confirm the API surface (`multer.diskStorage`, `.single(fieldName)`, `MulterError`) matches what it codes against.

---

## Test Plan

1. **Create `backend/src/customers/types.spec.ts`** (unit, no Prisma involved):
   - `CUSTOMER_STATUSES` has exactly four entries: `'ACTIVE'`, `'INACTIVE'`, `'PROSPECT'`, `'ARCHIVED'`.
   - Every entry is unique (`new Set(CUSTOMER_STATUSES).size === CUSTOMER_STATUSES.length`).
2. **Manual seed verification** (not automated): after the migration and `npm run db:seed`, use `npx prisma studio` (or `psql -d CustomerCRM`) to confirm `customers` has the new columns populated for the demo row (`status = 'ACTIVE'`, `company = 'Acme Logistics'`, etc.) and `customer_notes` has exactly 1 row attributed to the `agent@crm.local` user.

No Supertest suite is added in this story — there is no HTTP endpoint yet. Story 11 owns the API-level test suite, including permission tests for the new `customers:manage` grants.

---

## Migration / Rollback

- The migration is **additive only**: it adds nullable/defaulted columns to `customers` and creates two new tables. It touches no existing `tickets`, `interactions`, `users`, `roles`, `permissions`, `branches`, or `departments` data.
- **Half-applied state:** if `prisma migrate dev` fails partway, `_prisma_migrations` records a failed migration and blocks further Prisma commands. On a development database, run `npx prisma migrate reset` (**drops all data** and re-applies every migration plus the seed).
- **Rollback:** delete the generated `backend/prisma/migrations/<timestamp>_customer_profile/` directory and run `npx prisma migrate reset`. Prisma has no `migrate down`.
- **Never hand-edit an applied migration's SQL file.** Prisma checksums it; edit by adding a new migration instead.
- If `npm install multer` is rolled back (task 6), also revert `backend/package.json`/`backend/package-lock.json` in the same change — Story 11's code will fail to compile against a schema/permission set that expects the dependency to exist.
- Commit `backend/prisma/migrations/<timestamp>_customer_profile/**`, `backend/package.json`, `backend/package-lock.json`, and `backend/.gitignore`. Never commit `backend/.env` or anything under `backend/uploads/`.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **`multer` installs:** `npm install multer` and `npm install -D @types/multer` both exit 0; `backend/package.json` lists both.
2. **Migration applies:** `npx prisma migrate dev --name customer_profile` succeeds; `npx prisma migrate status` reports the schema up to date.
3. **Tables exist:** `npx prisma studio` (or `psql -d CustomerCRM -c '\d customer_notes'` and `'\d customer_attachments'`) shows the new columns and tables with the foreign keys described in task 7.
4. **Seed runs twice:** `npm run db:seed` twice in a row; the second run logs the same completion message and creates zero additional `customer_notes` rows.
5. **Backend still builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
6. **Tests pass:** `npm test` — green, including the new `customers/types.spec.ts`.
7. **Regression:** `curl http://localhost:3000/api/health/db` (with the backend running via `npm run dev`) still returns `"status":"up"`.
8. **No stray Prisma clients:** `grep -rn "new PrismaClient" backend/src backend/prisma` returns exactly one line, in `backend/src/db/prisma.ts` (unchanged from Story 02).

---

## Done Criteria

- [ ] `Customer` has `company`, `address`, `city`, `country`, `status`, and `updatedAt` in `backend/prisma/schema.prisma`, all backward-compatible with existing call sites.
- [ ] `CustomerNote` and `CustomerAttachment` models exist with the relations and indexes from task 1, and a real migration is committed and applied to `CustomerCRM`.
- [ ] `backend/src/customers/types.ts` defines `CUSTOMER_STATUSES` and `CustomerStatus`.
- [ ] `'customers:manage'` exists in `PERMISSIONS`/`PERMISSION_DESCRIPTIONS` and is granted to `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, and `SUPPORT_AGENT` (not `REPORTING_USER` or `CUSTOMER`).
- [ ] `UPLOAD_DIR` and `MAX_ATTACHMENT_SIZE_BYTES` are configured in `backend/src/config/env.ts` with working defaults.
- [ ] `multer` and `@types/multer` are installed dependencies.
- [ ] `npm run db:seed` is idempotent and produces the demo customer's full contact profile plus 1 attributed note.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 11.**
