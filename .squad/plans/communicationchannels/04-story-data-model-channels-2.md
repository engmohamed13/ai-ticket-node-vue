# Story 04 — Communication data model, mock channel abstraction, and migration (Story: 2)

## Prerequisites

- Story 02 completed: [../projectsetup/02-story-database-prisma-1.md](../projectsetup/02-story-database-prisma-1.md). `backend/prisma/schema.prisma` currently declares only the bootstrap `SystemInfo` model, `backend/src/db/prisma.ts` exports the single shared `prisma` client, and migration `backend/prisma/migrations/20260825080353_init/` is applied. Confirm `npx prisma migrate status` reports the schema up to date before starting.
- **No `Customer`, `Ticket`, `Agent`, or `User` model exists anywhere in the current codebase.** `backend/prisma/schema.prisma` (7–22) contains only `SystemInfo`. The historical Node/Vue implementation (deleted in commit `b1f0b9c`, readable at `git show 988127f:backend/prisma/schema.prisma`) had `User`/`Ticket`/`Comment` models but no `Customer` model at all, and that schema is not on disk. Work item [2 — Communication Channels](../../stories/communicationchannels/2/intake.md) requires associating interactions with both a customer and a ticket, so this story introduces minimal `Customer` and `Ticket` models scoped **only** to what interactions need. Full ticket/customer domain modelling (agents, comments, priorities, ticket workflows, authentication) is explicitly out of scope and belongs to a separate future feature.
- **A running PostgreSQL server is required** to run `npx prisma migrate dev`. Confirm `GET /api/health/db` reports `"status":"up"` on the currently running backend before starting, or start PostgreSQL per [database/README.md](../../../database/README.md).

---

## Story Goal

Add the data model and the mock communication-channel abstraction that every later story in this feature builds on:

1. `backend/prisma/schema.prisma` gains `Customer`, `Ticket`, and `Interaction` models, plus a real migration applied to `CustomerCRM`.
2. A shared `ChannelAdapter` abstraction (`backend/src/channels/`) represents the five supported channels — Email, WhatsApp, Live Chat, SMS, Web Forms — as internal mock implementations. No external service integration exists or is required; each adapter only stamps a channel-specific `externalRef` so the data proves which channel an interaction came through.
3. `backend/prisma/seed.ts` seeds one demo customer, one demo ticket, and one demo interaction per channel, all already associated with each other, so the API and UI stories have real data to read from day one.

**Not in scope for this story:** any HTTP endpoint (Story 05), the frontend (Story 06), authentication, ticket workflow fields (priority, assignee, comments), and any real Email/WhatsApp/SMS/live-chat/web-form integration — "mock" here means the adapters only generate a fake reference id, they never call an external API.

---

## Context — Read These Files First

1. [.squad/stories/communicationchannels/2/intake.md](.squad/stories/communicationchannels/2/intake.md) — the source work item. Read `## Description` (channel list: Email, WhatsApp, Live Chat, SMS, Web Forms) and `## Acceptance criteria` ("Communication channels use a common abstraction", "Customer interactions can be stored", "Interactions can be associated with customers and tickets", "Each interaction identifies its communication channel", "The feature works without requiring external communication services"). These four criteria are what this story delivers.
2. `backend/prisma/schema.prisma` — read the whole file (22 lines). Note the `generator client { provider = "prisma-client"; output = "../src/generated/prisma" }` block (line 4–7) and the plain `datasource db { provider = "postgresql" }` (line 9–11, `DATABASE_URL` is read from the environment automatically by this generator, not written inline). Keep both blocks unchanged; you are only adding models below `SystemInfo`.
3. `backend/prisma/seed.ts` — read the whole file (25 lines). It seeds `system_info` via idempotent `upsert` calls keyed on a unique field, then disconnects in `.finally()`. Follow the same idempotency pattern for the new seed data — `Ticket` and `Interaction` have no natural unique key, so use `findFirst` + conditional `create` instead of `upsert` (see task 5).
4. `backend/src/db/prisma.ts` — read the whole file (17 lines). Exactly one `PrismaClient` is instantiated here via the `@prisma/adapter-pg` driver adapter. Import `prisma` from this file wherever the new code needs a database call; never instantiate a second client.
5. `backend/src/generated/prisma/models/SystemInfo.ts` and `backend/src/generated/prisma/models.ts` — the generated barrel pattern. After you add `Customer`, `Ticket`, and `Interaction` to the schema and regenerate, this barrel gains `export type * from './models/Customer'` etc. **Do not hand-edit anything under `backend/src/generated/`** — it regenerates from `npx prisma generate` / `npx prisma migrate dev`.
6. `backend/src/generated/prisma/enums.ts` — currently empty (`// This file is empty because there are no enums in the schema.` — line 14) because the schema has no `enum` blocks yet. This story deliberately does **not** add a Prisma `enum` for channel/direction (see task 2) — it follows the existing `Ticket.status` string-field precedent from the historical schema instead, so this file stays out of scope.
7. Historical precedent for a plain-string status field — `git show 988127f:backend/prisma/schema.prisma`: the `Ticket` model there declares `status String @default("Open")` and `priority String @default("Medium")` (no Prisma enums at all). This story's `Ticket.status` and `Interaction.channel`/`Interaction.direction` follow that same plain-`String` convention, validated in application code instead of the database.
8. [../projectsetup/02-story-database-prisma-1.md](../projectsetup/02-story-database-prisma-1.md) — re-read task 5 ("Do not hand-write migration SQL — generate it and read it back") and the `## Migration / Rollback` section. The same rules apply here.

---

## Implementation tasks

### 1 — Prisma schema: `Customer`, `Ticket`, `Interaction`

**File: `backend/prisma/schema.prisma`**

Append below the existing `SystemInfo` model:

```prisma
/// Minimal customer record — scoped to what interactions need (name, email, phone).
/// Full customer profile management is out of scope for this feature.
model Customer {
  id           Int           @id @default(autoincrement())
  name         String
  email        String        @unique
  phone        String?
  createdAt    DateTime      @default(now())

  tickets      Ticket[]
  interactions Interaction[]

  @@map("customers")
}

/// Minimal ticket record — scoped to what interactions need to associate against.
/// Ticket workflow (priority, assignee, comments) is out of scope for this feature.
model Ticket {
  id           Int           @id @default(autoincrement())
  subject      String
  status       String        @default("Open")
  customerId   Int
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  customer     Customer      @relation(fields: [customerId], references: [id])
  interactions Interaction[]

  @@map("tickets")
}

/// A single customer interaction on one of the supported communication channels.
/// `channel` and `direction` are plain strings validated by the API layer against
/// the CHANNELS / INTERACTION_DIRECTIONS constants in `src/channels/types.ts`,
/// following the same convention as Ticket.status above rather than a Prisma enum.
model Interaction {
  id          Int      @id @default(autoincrement())
  channel     String
  direction   String
  subject     String?
  body        String
  externalRef String
  customerId  Int
  ticketId    Int?
  occurredAt  DateTime @default(now())
  createdAt   DateTime @default(now())

  customer    Customer @relation(fields: [customerId], references: [id])
  ticket      Ticket?  @relation(fields: [ticketId], references: [id])

  @@index([customerId])
  @@index([ticketId])
  @@map("interactions")
}
```

`ticketId` is **nullable by design**: the demo flow in the work item is "create or receive a customer interaction, select its communication channel, **associate it with a ticket**" — a two-step flow. An interaction can exist before it is triaged onto a ticket; Story 05 adds the association endpoint.

### 2 — Channel abstraction types

**Create file: `backend/src/channels/types.ts`**

```ts
export const CHANNELS = ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] as const;
export type Channel = (typeof CHANNELS)[number];

export const INTERACTION_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type InteractionDirection = (typeof INTERACTION_DIRECTIONS)[number];

export interface ChannelMessageInput {
  subject?: string | null;
  body: string;
}

export interface ChannelMessage extends ChannelMessageInput {
  channel: Channel;
  direction: InteractionDirection;
  externalRef: string;
}

export interface ChannelAdapter {
  channel: Channel;
  /** Mock outbound send — an agent replying through this channel. Never calls a real external service. */
  deliver(input: ChannelMessageInput): ChannelMessage;
  /** Mock inbound receive — a customer reaching in through this channel. Never calls a real external service. */
  simulateInbound(input: ChannelMessageInput): ChannelMessage;
}
```

`CHANNELS` and `INTERACTION_DIRECTIONS` are the single source of truth: Story 05's Zod validation (`z.enum(CHANNELS)`) and the frontend's channel dropdown (Story 06) both read from this list so a new channel is added in one place.

### 3 — Five mock channel adapters

**Create file: `backend/src/channels/email.adapter.ts`**

```ts
import { randomUUID } from 'node:crypto';
import type { ChannelAdapter, ChannelMessage, ChannelMessageInput, InteractionDirection } from './types';

const buildMessage = (input: ChannelMessageInput, direction: InteractionDirection): ChannelMessage => ({
  ...input,
  channel: 'EMAIL',
  direction,
  externalRef: `email-${randomUUID()}`
});

export const emailAdapter: ChannelAdapter = {
  channel: 'EMAIL',
  deliver: (input) => buildMessage(input, 'OUTBOUND'),
  simulateInbound: (input) => buildMessage(input, 'INBOUND')
};
```

**Create file: `backend/src/channels/whatsapp.adapter.ts`** — identical shape, `channel: 'WHATSAPP'`, `externalRef` prefix `wa-`, exported as `whatsappAdapter`.

**Create file: `backend/src/channels/liveChat.adapter.ts`** — identical shape, `channel: 'LIVE_CHAT'`, `externalRef` prefix `chat-`, exported as `liveChatAdapter`.

**Create file: `backend/src/channels/sms.adapter.ts`** — identical shape, `channel: 'SMS'`, `externalRef` prefix `sms-`, exported as `smsAdapter`.

**Create file: `backend/src/channels/webForm.adapter.ts`** — identical shape, `channel: 'WEB_FORM'`, `externalRef` prefix `webform-`, exported as `webFormAdapter`.

Each adapter is a plain object literal following `emailAdapter` exactly — same `buildMessage` shape duplicated per file so each is independently testable and there is no shared base class to reason about. Use `node:crypto`'s built-in `randomUUID` (already used implicitly by Node 24, no new dependency).

### 4 — Channel registry

**Create file: `backend/src/channels/registry.ts`**

```ts
import { emailAdapter } from './email.adapter';
import { liveChatAdapter } from './liveChat.adapter';
import { smsAdapter } from './sms.adapter';
import type { Channel, ChannelAdapter } from './types';
import { webFormAdapter } from './webForm.adapter';
import { whatsappAdapter } from './whatsapp.adapter';

export const channelAdapters: Record<Channel, ChannelAdapter> = {
  EMAIL: emailAdapter,
  WHATSAPP: whatsappAdapter,
  LIVE_CHAT: liveChatAdapter,
  SMS: smsAdapter,
  WEB_FORM: webFormAdapter
};

export const getChannelAdapter = (channel: Channel): ChannelAdapter => channelAdapters[channel];
```

Story 05's `interaction.service.ts` imports `getChannelAdapter` from this file — it is the one place that maps a `Channel` string to its mock implementation.

### 5 — Migration

From `backend/`:

```bash
npx prisma migrate dev --name communication_channels
```

**Read the generated `backend/prisma/migrations/<timestamp>_communication_channels/migration.sql` before continuing.** Confirm it creates `customers`, `tickets`, and `interactions` tables with foreign keys `tickets.customerId → customers.id`, `interactions.customerId → customers.id`, `interactions.ticketId → tickets.id` (nullable), and a unique index on `customers.email`. Commit the migration directory and the regenerated `migration_lock.toml` is unchanged (still `provider = "postgresql"`).

This also regenerates `backend/src/generated/prisma/**`, adding `Customer`, `Ticket`, and `Interaction` model types to the barrel in `backend/src/generated/prisma/models.ts` and populating `PrismaClient` with `prisma.customer`, `prisma.ticket`, `prisma.interaction`. Story 05 imports these generated model types directly from `backend/src/generated/prisma/client` (the same module `backend/src/db/prisma.ts` already imports `PrismaClient` from) — confirm the exact export names by reading the regenerated `backend/src/generated/prisma/models/Customer.ts`, `Ticket.ts`, and `Interaction.ts` before Story 05 references them, since this generator's exact export shape is only known once the schema is regenerated.

### 6 — Seed data

**File: `backend/prisma/seed.ts`**

Extend the existing `main` function (keep the two `systemInfo.upsert` calls unchanged) by adding, before the final `console.log`:

```ts
import { channelAdapters } from '../src/channels/registry';

// ... inside main(), after the systemInfo upserts:

const customer = await prisma.customer.upsert({
  where: { email: 'demo.customer@example.com' },
  update: {},
  create: { name: 'Demo Customer', email: 'demo.customer@example.com', phone: '+1-555-0100' }
});

let ticket = await prisma.ticket.findFirst({
  where: { customerId: customer.id, subject: 'Cannot log in to my account' }
});
if (!ticket) {
  ticket = await prisma.ticket.create({
    data: { subject: 'Cannot log in to my account', status: 'Open', customerId: customer.id }
  });
}

for (const adapter of Object.values(channelAdapters)) {
  const existingInteraction = await prisma.interaction.findFirst({
    where: { customerId: customer.id, channel: adapter.channel }
  });
  if (existingInteraction) continue;

  const message = adapter.simulateInbound({
    subject: 'Login issue',
    body: `Demo ${adapter.channel} message: I cannot log in to my account.`
  });
  await prisma.interaction.create({
    data: { ...message, customerId: customer.id, ticketId: ticket.id }
  });
}

console.log('Seed complete: system_info, 1 customer, 1 ticket, 5 interactions (one per channel)');
```

Run `npm run db:seed` twice from `backend/` and confirm the second run creates zero new rows (the `findFirst` guards make it idempotent, matching the existing `systemInfo.upsert` idempotency).

---

## Edge Cases & Failure Modes

- **`ticketId` omitted on create.** `Interaction.ticketId` is nullable in the schema (task 1) — an interaction can be stored before it is triaged onto a ticket. Story 05's create endpoint must accept a missing `ticketId`; this story only needs the column to allow `NULL`.
- **Deleting a customer or ticket with interactions.** No `onDelete` behavior is specified on the `customer`/`ticket` relations in task 1, so Prisma defaults to `Restrict` — deleting a `Customer` or `Ticket` that has `Interaction` rows fails at the database level rather than silently orphaning or cascading. No delete endpoint exists in this feature, so this is a latent constraint to be aware of, not something to handle now.
- **Two interactions on the same channel for the same customer.** The seed's idempotency check in task 6 (`findFirst` by `customerId` + `channel`) means only the **first** interaction per channel per customer is skipped on reseed — this is a seed-script-only constraint, not a database uniqueness constraint. The schema does not enforce one-interaction-per-channel-per-customer; real usage (Story 05) allows many interactions per channel.
- **`randomUUID()` collisions.** Effectively impossible (122 bits of randomness per call), so no collision handling is implemented in the adapters — this is a deliberate simplification appropriate for mock data.
- **Regenerated Prisma client export names.** Task 5 flags that the exact export names in `backend/src/generated/prisma/models/Customer.ts` etc. are only known after regeneration. If Story 05 finds the barrel exports different names than expected, it must read the regenerated file rather than guessing.

---

## Test Plan

1. **Create `backend/src/tests/channels.spec.ts`** (unit, no Prisma involved):
   - For each of the five adapters (`emailAdapter`, `whatsappAdapter`, `liveChatAdapter`, `smsAdapter`, `webFormAdapter`): `deliver({ body: 'hi' })` returns `direction: 'OUTBOUND'` and an `externalRef` starting with that channel's prefix; `simulateInbound({ body: 'hi' })` returns `direction: 'INBOUND'` with the same prefix.
   - `channelAdapters` (from `registry.ts`) has exactly five keys matching `CHANNELS` from `types.ts`, and `getChannelAdapter('EMAIL')` returns the same object as `channelAdapters.EMAIL`.
   - Two calls to `emailAdapter.deliver({ body: 'hi' })` produce different `externalRef` values (uniqueness).
2. **Manual seed verification** (not automated): after running the migration and `npm run db:seed`, use `npx prisma studio` (or `psql -d CustomerCRM`) to confirm `customers` has 1 row, `tickets` has 1 row, and `interactions` has 5 rows — one per channel, all with the same `customerId` and `ticketId`.

No Prisma-mocked integration tests are needed in this story — there is no HTTP endpoint yet. Story 05 owns the API-level test suite.

---

## Migration / Rollback

- The migration is **additive only** — it creates `customers`, `tickets`, and `interactions`, and touches neither `system_info` nor any existing data.
- **Half-applied state:** if `prisma migrate dev` fails partway, `_prisma_migrations` records a failed migration and blocks further Prisma commands. On a development database, run `npx prisma migrate reset` (**drops all data**, including the `system_info` rows from Story 02, and re-applies every migration plus the seed).
- **Rollback:** delete the generated `backend/prisma/migrations/<timestamp>_communication_channels/` directory and run `npx prisma migrate reset`. Prisma has no `migrate down`.
- **Never hand-edit an applied migration's SQL file** — Prisma checksums it; edit by adding a new migration instead.
- Commit `prisma/migrations/<timestamp>_communication_channels/**`. Never commit `backend/.env`.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Migration applies:** `npx prisma migrate dev --name communication_channels` succeeds; `npx prisma migrate status` reports the schema up to date.
2. **Tables exist:** `npx prisma studio` (or `psql -d CustomerCRM -c '\d interactions'`) shows `customers`, `tickets`, and `interactions` with the foreign keys described in task 5.
3. **Seed runs twice:** `npm run db:seed` twice in a row; the second run logs the same completion message and creates zero additional rows.
4. **Backend still builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
5. **Tests pass:** `npm test` — green, including the new `channels.spec.ts`.
6. **Regression:** `curl http://localhost:3000/api/health/db` (with the backend running via `npm run dev`) still returns `"status":"up"` — the new models did not break the existing database health probe.
7. **No stray Prisma clients:** `grep -rn "new PrismaClient" backend/src backend/prisma` returns exactly one line, in `backend/src/db/prisma.ts` (unchanged from Story 02).

---

## Done Criteria

- [ ] `Customer`, `Ticket`, and `Interaction` models exist in `backend/prisma/schema.prisma` with the fields and relations from task 1, and a real migration is committed and applied to `CustomerCRM`.
- [ ] `backend/src/channels/types.ts` defines `CHANNELS`, `INTERACTION_DIRECTIONS`, and the `ChannelAdapter` interface.
- [ ] Five mock adapters exist under `backend/src/channels/`, one per channel, each producing a channel-prefixed `externalRef` and never calling an external service (**"Communication channels use a common abstraction"**, **"The feature works without requiring external communication services"**).
- [ ] `backend/src/channels/registry.ts` exports `channelAdapters` and `getChannelAdapter`, covering all five channels.
- [ ] `npm run db:seed` is idempotent and produces 1 customer, 1 ticket, and 5 interactions (one per channel) already associated with both the customer and the ticket.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 05.**
