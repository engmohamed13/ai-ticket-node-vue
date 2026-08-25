# Story 07 — Auth, RBAC, and org data model with seeded roles and demo users (Story: 3)

## Prerequisites

- Story 04 completed: [../communicationchannels/04-story-data-model-channels-2.md](../communicationchannels/04-story-data-model-channels-2.md). `backend/prisma/schema.prisma` currently declares `SystemInfo` (lines 15–22), `Customer` (26–37), `Ticket` (41–53), and `Interaction` (59–77); migrations `backend/prisma/migrations/20260825080353_init/` and `backend/prisma/migrations/20260825092446_communication_channels/` are applied.
- **No `User`, `Role`, `Permission`, `Department`, or `Branch` model exists anywhere in the working tree.** Grep for `model User` in `backend/prisma/schema.prisma` returns nothing. The historical Node/Vue implementation (deleted in commit `b1f0b9c`, readable at `git show 988127f:backend/prisma/schema.prisma`) had a `User` model with `passwordHash` but no roles, permissions, departments, or branches. That schema is **not** on disk.
- **Authentication was explicitly out of scope for both prior features** — see [../projectsetup/00-overview.md](../projectsetup/00-overview.md) (line 21) and [../communicationchannels/00-overview.md](../communicationchannels/00-overview.md) (line 18). This story is where it enters the codebase.
- A running PostgreSQL server with the migrated `CustomerCRM` database, per [database/README.md](../../../database/README.md). Confirm `npx prisma migrate status` from `backend/` reports the schema up to date before starting.
- `npm run db:seed` has been run at least once, so the seeded **Demo Customer** (`demo.customer@example.com`) exists — task 7 links the `CUSTOMER`-role demo user to that customer row.

---

## Story Goal

Add the data model and the shared RBAC vocabulary that the rest of work item [3 — Authentication & User Management](../../stories/authenticationandusermanagement/3/intake.md) builds on. No HTTP endpoint and no frontend change happens in this story.

Outcomes:

1. `backend/prisma/schema.prisma` gains `Branch`, `Department`, `Permission`, `Role`, `RolePermission`, and `User` models, plus a real migration applied to `CustomerCRM`.
2. `backend/src/auth/permissions.ts` and `backend/src/auth/roles.ts` declare the permission keys and the six main roles from the work item, together with the canonical role → permission map that the seed writes into the database.
3. `backend/src/auth/password.ts` provides `hashPassword` / `verifyPassword` so a password is never stored in plain text.
4. `backend/prisma/seed.ts` seeds two branches, three departments, all permissions, the six roles with their permissions, and **one demo user per role** — so Story 09's demo ("Login with different roles and demonstrate different access based on permissions") has real accounts to log in with on day one.

**Not in scope for this story:** JWT signing/verification, login/logout endpoints, the `authenticate` / `requirePermission` middleware, protecting the existing `/api/customers`, `/api/tickets`, `/api/interactions` routes, user-management endpoints (all Story 08), and every frontend change (Story 09). Also out of scope permanently for this feature: password reset e-mails, MFA, refresh tokens, OAuth/SSO, and per-record row-level security beyond the customer-ownership check Story 08 adds.

---

## Context — Read These Files First

1. [.squad/stories/authenticationandusermanagement/3/intake.md](../../stories/authenticationandusermanagement/3/intake.md) — `## Description` lists the deliverables ("Users management", "Roles and permissions", "Departments and branches") and the six **Main Roles**: System Administrator, CRM Manager, Support Supervisor, Support Agent, Customer, Reporting User. Task 3 below turns that list into `ROLES`. `## Attachments` is empty — there is no design artefact to reconcile against.
2. `backend/prisma/schema.prisma` — read the whole file (78 lines). Keep the `generator client` block (4–7) and `datasource db` (9–11) unchanged. Note that `Ticket.status` (line 44) and `Interaction.channel` / `Interaction.direction` (61–62) are plain `String` columns validated in application code, **not** Prisma enums — this story follows that same convention for `Role.key` and `Permission.key`. `backend/src/generated/prisma/enums.ts` stays empty.
3. `backend/src/channels/types.ts` (24 lines) — the precedent this story's `permissions.ts` / `roles.ts` copy exactly: a `readonly` tuple declared `as const`, plus a derived `type X = (typeof X)[number]`. `CHANNELS` (line 1) and `INTERACTION_DIRECTIONS` (line 4) are the single source of truth for the values Zod validates against and the frontend mirrors.
4. `backend/prisma/seed.ts` — read the whole file (61 lines). It is **idempotent by construction**: `systemInfo.upsert` on a unique `key` (10–19), `customer.upsert` on the unique `email` (21–25), and `findFirst` + conditional `create` where there is no natural unique key (27–34, 36–49). Task 7 appends to `main()` between the interaction loop (ends line 49) and the final `console.log` (line 51), and reuses the `customer` variable bound at line 21.
5. `backend/src/db/prisma.ts` (17 lines) — exactly one `PrismaClient` exists, built on the `@prisma/adapter-pg` driver adapter. `backend/prisma/seed.ts` (lines 5–7) instantiates its own client on purpose because the seed runs outside the app; **do not add a third**.
6. [../communicationchannels/04-story-data-model-channels-2.md](../communicationchannels/04-story-data-model-channels-2.md) — re-read task 5 ("Do not hand-write migration SQL — generate it and read it back") and the `## Migration / Rollback` section. The same rules apply verbatim here.
7. `git show 988127f:backend/src/services/auth.service.ts` — the historical login service. It used `bcryptjs` for `passwordHash` comparison and `jsonwebtoken` for signing. Task 2 reinstates `bcryptjs`; Story 08 reinstates `jsonwebtoken`. **Do not copy its style**: it was a class with an internal `new PrismaClient()` and a `'fallback-secret-do-not-use'` default. The current codebase uses plain exported `async` functions and the shared `prisma` client.
8. `git show 988127f:backend/prisma/schema.prisma` — the historical `User` model (`id`, `name`, `email @unique`, `passwordHash`). Task 6's `User` keeps those four fields and adds `isActive`, `roleId`, `departmentId`, `branchId`, `customerId`, `createdAt`, `updatedAt`.
9. `backend/package.json` (61 lines) — confirm the current dependency list before task 2. There is **no** `jsonwebtoken` and **no** `bcryptjs` today. Note `"engines": { "node": ">=24.0.0" }` and the `prisma.seed` hook (`tsx prisma/seed.ts`, line 31).
10. `backend/tsconfig.json` (19 lines) — `"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`, and `"types": ["node", "jest"]`. Every new file must satisfy all four; an unused import is a build failure, not a warning.
11. `backend/src/tests/channels.spec.ts` — the unit-test pattern for pure constant/helper modules (no Prisma, no Supertest). Task 8's `auth.rbac.spec.ts` follows it.

---

## Implementation tasks

### 1 — Directory layout

All new non-Prisma code in this story lives in a new `backend/src/auth/` directory, mirroring the existing `backend/src/channels/` convention: shared vocabulary and pure helpers in their own folder, consumed by `services/` and `middleware/` later.

```
backend/src/auth/
  permissions.ts   (task 3)
  roles.ts         (task 4)
  password.ts      (task 5)
```

`backend/src/auth/jwt.ts` and `backend/src/auth/scope.ts` are added by Story 08 — **do not create them here**.

### 2 — Dependencies

From `backend/`:

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken
```

- `bcryptjs@^3` ships its **own** TypeScript declarations (see the `types` field in `node_modules/bcryptjs/package.json` after install). **Do not install `@types/bcryptjs`** — on DefinitelyTyped it is now a stub that declares no types and shadows the real ones.
- `jsonwebtoken` is not used until Story 08, but install it now so the whole feature needs one `npm install` and one `package-lock.json` diff.
- Both are pure-JS packages — no native build step, so they work on the Windows dev machine and in CI unchanged.

Commit the updated `backend/package.json` and `backend/package-lock.json`.

### 3 — Permission keys

**Create file: `backend/src/auth/permissions.ts`**

```ts
export const PERMISSIONS = [
  'users:read',
  'users:manage',
  'roles:read',
  'roles:manage',
  'orgunits:read',
  'orgunits:manage',
  'customers:read',
  'tickets:read',
  'tickets:manage',
  'interactions:read',
  'interactions:create',
  'interactions:associate',
  'reports:read'
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Human-readable copy for the roles/permissions admin screen (Story 09) and the seeded `permissions.description` column. */
export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  'users:read': 'View users, their roles, departments, and branches',
  'users:manage': 'Create, update, deactivate users and reset their passwords',
  'roles:read': 'View roles and the permissions assigned to them',
  'roles:manage': 'Change which permissions a role grants',
  'orgunits:read': 'View departments and branches',
  'orgunits:manage': 'Create and update departments and branches',
  'customers:read': 'View the customer list',
  'tickets:read': 'View tickets and their timelines',
  'tickets:manage': 'Change ticket subject and status',
  'interactions:read': 'View customer interactions and unified timelines',
  'interactions:create': 'Create or receive a customer interaction on any channel',
  'interactions:associate': 'Associate an existing interaction with a ticket',
  'reports:read': 'View reporting and analytics data'
};
```

`PERMISSIONS` is the **single source of truth** for the permission vocabulary: task 7's seed writes exactly these rows into `permissions`, Story 08's `requirePermission(...)` is typed against `Permission`, and Story 09 mirrors the list in `frontend/src/types/index.ts`. Adding a permission means editing this file and reseeding — nothing else.

`tickets:manage` and `reports:read` have **no route behind them yet** — no ticket-mutation or reporting endpoint exists (`backend/src/routes/ticket.routes.ts` is read-only). They are seeded because the work item names a **Reporting User** role that must differ from Support Agent in the demo, and because Story 08's role-permission editor needs a permission it can grant and revoke without breaking a live route. Document this in a comment when a future story adds those endpoints.

### 4 — Roles and the canonical role → permission map

**Create file: `backend/src/auth/roles.ts`**

```ts
import { PERMISSIONS } from './permissions';
import type { Permission } from './permissions';

export const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'CRM_MANAGER',
  'SUPPORT_SUPERVISOR',
  'SUPPORT_AGENT',
  'CUSTOMER',
  'REPORTING_USER'
] as const;

export type RoleKey = (typeof ROLES)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SYSTEM_ADMINISTRATOR: 'System Administrator',
  CRM_MANAGER: 'CRM Manager',
  SUPPORT_SUPERVISOR: 'Support Supervisor',
  SUPPORT_AGENT: 'Support Agent',
  CUSTOMER: 'Customer',
  REPORTING_USER: 'Reporting User'
};

/**
 * Seed-time default only. `role_permissions` is the runtime source of truth once an
 * administrator edits a role through the API (Story 08) — re-running the seed resets
 * every role back to this map.
 */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  SYSTEM_ADMINISTRATOR: PERMISSIONS,
  CRM_MANAGER: [
    'users:read',
    'roles:read',
    'orgunits:read',
    'customers:read',
    'tickets:read',
    'tickets:manage',
    'interactions:read',
    'interactions:create',
    'interactions:associate',
    'reports:read'
  ],
  SUPPORT_SUPERVISOR: [
    'customers:read',
    'tickets:read',
    'tickets:manage',
    'interactions:read',
    'interactions:create',
    'interactions:associate',
    'reports:read'
  ],
  SUPPORT_AGENT: [
    'customers:read',
    'tickets:read',
    'interactions:read',
    'interactions:create',
    'interactions:associate'
  ],
  CUSTOMER: ['tickets:read', 'interactions:read', 'interactions:create'],
  REPORTING_USER: ['customers:read', 'tickets:read', 'interactions:read', 'reports:read']
};
```

Design notes the executor must preserve:

- **`SYSTEM_ADMINISTRATOR` is the only role with `users:manage` / `roles:manage` / `orgunits:manage`.** The acceptance criterion is "Users can be created and managed by an administrator" — CRM Manager gets `users:read` so it can *see* the org chart without being able to change it.
- **`CUSTOMER` is deliberately the narrowest role and carries no `customers:read`.** A customer must not be able to list other customers. Story 08 additionally scopes every `CUSTOMER`-role request to that user's own `customerId` (`backend/src/auth/scope.ts`), because a permission alone cannot express "only my own records".
- **`REPORTING_USER` is read-only** — it has no `:create`, `:associate`, or `:manage` permission at all. This is the cleanest contrast for the demo: log in as Support Agent and the "Save interaction" button works; log in as Reporting User and the same call returns `403`.
- `SYSTEM_ADMINISTRATOR: PERMISSIONS` reuses the tuple directly, so a new permission key is granted to the administrator automatically and to nobody else.

### 5 — Password hashing

**Create file: `backend/src/auth/password.ts`**

```ts
import bcrypt from 'bcryptjs';

/** 10 rounds ≈ 60 ms per hash on the target hardware — enough work factor without slowing the demo login. */
const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(plain, passwordHash);
```

This module is the **only** place in the codebase that touches a plain-text password. Story 08's login service calls `verifyPassword`; Story 08's user-create/change-password handlers call `hashPassword`. Nothing else reads `User.passwordHash`.

### 6 — Prisma schema

**File: `backend/prisma/schema.prisma`**

First, add the back-relation to the existing `Customer` model. Insert `users User[]` after `interactions Interaction[]` (currently line 34):

```prisma
model Customer {
  id           Int           @id @default(autoincrement())
  name         String
  email        String        @unique
  phone        String?
  createdAt    DateTime      @default(now())

  tickets      Ticket[]
  interactions Interaction[]
  users        User[]

  @@map("customers")
}
```

This is a **relation field only** — it adds no column to `customers` and no SQL beyond the foreign key declared on `users.customerId`. Leave every other line of `Customer`, `Ticket`, `Interaction`, and `SystemInfo` untouched.

Then append below `Interaction` (currently ends line 77):

```prisma
/// A physical office. Users are assigned to a branch so an administrator can see the
/// organisational structure required by work item 3 ("Departments and branches").
model Branch {
  id          Int          @id @default(autoincrement())
  name        String       @unique
  code        String       @unique
  createdAt   DateTime     @default(now())

  departments Department[]
  users       User[]

  @@map("branches")
}

/// A department inside a branch. Department names repeat across branches
/// (every branch has a "Customer Support"), so the unique key is the pair.
model Department {
  id        Int      @id @default(autoincrement())
  name      String
  branchId  Int
  createdAt DateTime @default(now())

  branch    Branch   @relation(fields: [branchId], references: [id])
  users     User[]

  @@unique([branchId, name])
  @@index([branchId])
  @@map("departments")
}

/// A single capability. `key` matches a value in the PERMISSIONS tuple in
/// `src/auth/permissions.ts` — a plain String, validated in application code, following
/// the same convention as Ticket.status and Interaction.channel above.
model Permission {
  id          Int              @id @default(autoincrement())
  key         String           @unique
  description String
  createdAt   DateTime         @default(now())

  roles       RolePermission[]

  @@map("permissions")
}

/// One of the six main roles from work item 3. `key` matches a value in the ROLES tuple
/// in `src/auth/roles.ts`; `name` is the display label shown in the UI.
model Role {
  id          Int              @id @default(autoincrement())
  key         String           @unique
  name        String
  description String?
  createdAt   DateTime         @default(now())

  permissions RolePermission[]
  users       User[]

  @@map("roles")
}

/// Explicit many-to-many join so an administrator can grant and revoke a single
/// permission on a role (Story 08's PUT /api/roles/:id/permissions).
model RolePermission {
  roleId       Int
  permissionId Int

  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([permissionId])
  @@map("role_permissions")
}

/// A CRM login. Exactly one role per user (the work item lists six mutually exclusive
/// "Main Roles", not a role set). `customerId` is set only for CUSTOMER-role users and
/// is what scopes a customer to their own records in the API layer.
model User {
  id           Int        @id @default(autoincrement())
  name         String
  email        String     @unique
  passwordHash String
  isActive     Boolean    @default(true)
  roleId       Int
  departmentId Int?
  branchId     Int?
  customerId   Int?
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  role         Role        @relation(fields: [roleId], references: [id])
  department   Department? @relation(fields: [departmentId], references: [id])
  branch       Branch?     @relation(fields: [branchId], references: [id])
  customer     Customer?   @relation(fields: [customerId], references: [id])

  @@index([roleId])
  @@index([departmentId])
  @@index([branchId])
  @@index([customerId])
  @@map("users")
}
```

Constraints that are deliberate and **must not** be relaxed:

- **`roleId` is required.** Every user has exactly one role, so `requirePermission` never has to handle a role-less user.
- **`departmentId`, `branchId`, `customerId` are all nullable.** A `CUSTOMER`-role user belongs to no department or branch; a staff user belongs to no customer. Making any of them required would make one of the six seeded demo users unrepresentable.
- **`passwordHash`, never `password`.** The column name itself documents that no plain text is stored — same name the historical schema used.
- **`isActive` instead of a hard delete.** `users.id` is referenced by nothing today, but soft-deactivation is what Story 08's `DELETE /api/users/:id` performs, so a deactivated user's audit trail survives.
- **`onDelete: Cascade` on `RolePermission` only.** The `User → Role/Department/Branch/Customer` relations declare no `onDelete`, so Prisma defaults to `Restrict` — deleting a role that still has users fails at the database level instead of orphaning logins. That is the correct behaviour; there is no role-delete endpoint in this feature.

### 7 — Migration

From `backend/`:

```bash
npx prisma migrate dev --name auth_user_management
```

**Read the generated `backend/prisma/migrations/<timestamp>_auth_user_management/migration.sql` before continuing.** Confirm it:

- Creates `branches`, `departments`, `permissions`, `roles`, `role_permissions`, and `users`.
- Creates unique indexes on `branches.name`, `branches.code`, `permissions.key`, `roles.key`, `users.email`, and the composite `departments(branchId, name)`.
- Creates foreign keys `departments.branchId → branches.id`, `role_permissions.roleId → roles.id` (ON DELETE CASCADE), `role_permissions.permissionId → permissions.id` (ON DELETE CASCADE), `users.roleId → roles.id`, `users.departmentId → departments.id`, `users.branchId → branches.id`, and `users.customerId → customers.id`.
- **Contains no `ALTER TABLE customers`, no `ALTER TABLE tickets`, and no `ALTER TABLE interactions`** — the `Customer.users` change in task 6 is a relation field, so it must produce zero SQL against existing tables. If the migration touches an existing table, stop and re-read task 6.

This also regenerates `backend/src/generated/prisma/**`, adding `Branch`, `Department`, `Permission`, `Role`, `RolePermission`, and `User` to the barrel in `backend/src/generated/prisma/models.ts` and populating `prisma.branch`, `prisma.department`, `prisma.permission`, `prisma.role`, `prisma.rolePermission`, and `prisma.user`. **Never hand-edit anything under `backend/src/generated/`.** Story 08 imports these accessors — confirm the exact generated names by reading `backend/src/generated/prisma/models.ts` after regenerating rather than assuming them.

Commit the whole `backend/prisma/migrations/<timestamp>_auth_user_management/` directory. `backend/prisma/migrations/migration_lock.toml` stays unchanged (`provider = "postgresql"`).

### 8 — Seed data

**File: `backend/prisma/seed.ts`**

Add to the imports at the top (after the existing `channelAdapters` import on line 3):

```ts
import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../src/auth/permissions';
import { hashPassword } from '../src/auth/password';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '../src/auth/roles';
```

Insert the block below **inside `main()`**, after the channel-adapter interaction loop (ends line 49) and **before** the final `console.log` (line 51). It reuses the `customer` variable already bound at line 21 — do not re-query it.

```ts
// --- Branches ---
const headOffice = await prisma.branch.upsert({
  where: { code: 'HQ' },
  update: {},
  create: { name: 'Head Office', code: 'HQ' }
});
const riyadhBranch = await prisma.branch.upsert({
  where: { code: 'RUH' },
  update: {},
  create: { name: 'Riyadh Branch', code: 'RUH' }
});

// --- Departments (unique per branch + name) ---
const crmOperations = await prisma.department.upsert({
  where: { branchId_name: { branchId: headOffice.id, name: 'CRM Operations' } },
  update: {},
  create: { name: 'CRM Operations', branchId: headOffice.id }
});
const headOfficeSupport = await prisma.department.upsert({
  where: { branchId_name: { branchId: headOffice.id, name: 'Customer Support' } },
  update: {},
  create: { name: 'Customer Support', branchId: headOffice.id }
});
const riyadhSupport = await prisma.department.upsert({
  where: { branchId_name: { branchId: riyadhBranch.id, name: 'Customer Support' } },
  update: {},
  create: { name: 'Customer Support', branchId: riyadhBranch.id }
});

// --- Permissions ---
for (const key of PERMISSIONS) {
  await prisma.permission.upsert({
    where: { key },
    update: { description: PERMISSION_DESCRIPTIONS[key] },
    create: { key, description: PERMISSION_DESCRIPTIONS[key] }
  });
}

// --- Roles and their permissions. ROLE_PERMISSIONS is authoritative: reseeding
// --- resets any role-permission edits made through the API.
const roleIdByKey = new Map<string, number>();
for (const roleKey of ROLES) {
  const role = await prisma.role.upsert({
    where: { key: roleKey },
    update: { name: ROLE_LABELS[roleKey] },
    create: { key: roleKey, name: ROLE_LABELS[roleKey] }
  });
  roleIdByKey.set(roleKey, role.id);

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...ROLE_PERMISSIONS[roleKey]] } }
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id }))
  });
}

// --- Demo users: one per role, all sharing the same demo password.
// --- DEMO ONLY. Never ship this password or this seed to a production database.
const DEMO_PASSWORD = 'Passw0rd!';
const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

const demoUsers = [
  {
    name: 'System Administrator',
    email: 'admin@crm.local',
    roleKey: 'SYSTEM_ADMINISTRATOR',
    branchId: headOffice.id,
    departmentId: crmOperations.id,
    customerId: null
  },
  {
    name: 'CRM Manager',
    email: 'manager@crm.local',
    roleKey: 'CRM_MANAGER',
    branchId: headOffice.id,
    departmentId: crmOperations.id,
    customerId: null
  },
  {
    name: 'Support Supervisor',
    email: 'supervisor@crm.local',
    roleKey: 'SUPPORT_SUPERVISOR',
    branchId: headOffice.id,
    departmentId: headOfficeSupport.id,
    customerId: null
  },
  {
    name: 'Support Agent',
    email: 'agent@crm.local',
    roleKey: 'SUPPORT_AGENT',
    branchId: riyadhBranch.id,
    departmentId: riyadhSupport.id,
    customerId: null
  },
  {
    name: 'Reporting User',
    email: 'reports@crm.local',
    roleKey: 'REPORTING_USER',
    branchId: headOffice.id,
    departmentId: crmOperations.id,
    customerId: null
  },
  {
    name: 'Demo Customer',
    email: 'demo.customer@example.com',
    roleKey: 'CUSTOMER',
    branchId: null,
    departmentId: null,
    customerId: customer.id
  }
] as const;

for (const demoUser of demoUsers) {
  const roleId = roleIdByKey.get(demoUser.roleKey);
  if (roleId === undefined) throw new Error(`Seed error: role ${demoUser.roleKey} was not created`);

  await prisma.user.upsert({
    where: { email: demoUser.email },
    // passwordHash is deliberately absent from `update` so a password changed
    // through the API survives a reseed.
    update: {
      name: demoUser.name,
      roleId,
      branchId: demoUser.branchId,
      departmentId: demoUser.departmentId,
      customerId: demoUser.customerId,
      isActive: true
    },
    create: {
      name: demoUser.name,
      email: demoUser.email,
      passwordHash: demoPasswordHash,
      roleId,
      branchId: demoUser.branchId,
      departmentId: demoUser.departmentId,
      customerId: demoUser.customerId
    }
  });
}
```

Finally, replace the existing `console.log` on line 51 with:

```ts
console.log(
  'Seed complete: system_info, 1 customer, 1 ticket, 5 interactions (one per channel), ' +
    `2 branches, 3 departments, ${PERMISSIONS.length} permissions, ${ROLES.length} roles, ` +
    `${demoUsers.length} demo users (password: ${DEMO_PASSWORD})`
);
```

Notes:

- The `CUSTOMER` demo user's e-mail (`demo.customer@example.com`) intentionally matches the seeded `customers.email` from Story 04. `users` and `customers` are separate tables with separate unique indexes — the link is `users.customerId`, not the address.
- `branchId_name` is the compound-unique input name Prisma generates for `@@unique([branchId, name])`. If `npm run db:seed` reports an unknown argument, read the generated `backend/src/generated/prisma/models/Department.ts` for the exact key rather than guessing.
- `rolePermission.deleteMany` + `createMany` (rather than `upsert` per row) is what makes `ROLE_PERMISSIONS` authoritative and keeps the loop idempotent regardless of prior state.

### 9 — No route, controller, or frontend change

`No backend HTTP change required in this story.` Do not touch `backend/src/routes/`, `backend/src/controllers/`, `backend/src/services/`, `backend/src/middleware/`, `backend/src/app.ts`, `backend/src/config/env.ts`, or `backend/src/docs/openapi.ts` — Story 08 owns all of those.

`No frontend changes required.` Do not touch anything under `frontend/`.

---

## Edge Cases & Failure Modes

- **`npm run db:seed` run twice.** Every write in task 8 is an `upsert` keyed on a unique column, or a `deleteMany` + `createMany` pair scoped to one `roleId`. The second run creates zero new rows and produces the identical log line. Verify this explicitly (`## Verification Steps` item 4) — it is the same guarantee Story 04 established for the interaction seed.
- **A password changed through the API, then a reseed.** The `user.upsert` `update` branch omits `passwordHash` (task 8), so the changed password survives. `name`, `roleId`, `branchId`, `departmentId`, `customerId`, and `isActive` **are** reset to the seeded values — the seed is authoritative for org placement, not for credentials.
- **Role permissions edited through Story 08's API, then a reseed.** They are reset to `ROLE_PERMISSIONS` by the `deleteMany` in task 8. This is intentional (the seed is the demo's known-good baseline) and is why the JSDoc on `ROLE_PERMISSIONS` in task 4 says so out loud.
- **A permission key removed from `PERMISSIONS`.** The seed stops upserting it, but the existing `permissions` row and its `role_permissions` links **remain** — the loop only writes, never prunes orphans. Removing a permission therefore requires a manual `DELETE FROM permissions WHERE key = '…'` (the `ON DELETE CASCADE` on `role_permissions` cleans up the links). Flagged rather than solved: no permission is removed in this feature.
- **Two branches with the same department name.** Handled by design — `@@unique([branchId, name])` (task 6), not `@unique` on `name`. The seed relies on this: "Customer Support" exists in both Head Office and Riyadh Branch.
- **Creating a `CUSTOMER`-role user with no `customerId`.** The schema permits it (`customerId` is nullable). Such a user authenticates but Story 08's scope check denies every customer-scoped read, because there is no owned `customerId` to match. Story 08 must reject this combination at the API layer; the database deliberately does not, since a Prisma-level conditional-required constraint does not exist.
- **Deleting a `Customer` that has a linked `User`.** The `User.customer` relation declares no `onDelete`, so Prisma defaults to `Restrict` and the delete fails. No customer-delete endpoint exists; this is a latent constraint to be aware of, not something to handle now.
- **Migration run against a database that already has a `users` table.** Not possible in this repository — `git show 988127f:backend/prisma/schema.prisma` is history only, and the applied migrations are `20260825080353_init` (system_info) and `20260825092446_communication_channels`. If `prisma migrate dev` reports drift, stop and run `npx prisma migrate status` before doing anything else.
- **`bcryptjs` typings.** Task 2 forbids `@types/bcryptjs`. If `npm run typecheck` reports "Could not find a declaration file for module 'bcryptjs'", read `node_modules/bcryptjs/package.json` and confirm its `types` field points at a `.d.ts` that exists; a v2 install (which has no bundled types) is the failure being guarded against — reinstall with `npm install bcryptjs@^3`.

---

## Test Plan

All backend tests live in `backend/src/tests/` and are picked up by `testMatch: ['**/tests/**/*.spec.ts']` (`backend/jest.config.ts:7`).

1. **Create `backend/src/tests/auth.rbac.spec.ts`** (unit, no Prisma, no Supertest — follow `backend/src/tests/channels.spec.ts`):
   - `ROLES` has exactly six entries and contains each of `SYSTEM_ADMINISTRATOR`, `CRM_MANAGER`, `SUPPORT_SUPERVISOR`, `SUPPORT_AGENT`, `CUSTOMER`, `REPORTING_USER`.
   - `ROLE_LABELS` and `ROLE_PERMISSIONS` each have a key for every entry in `ROLES` (`Object.keys(...).sort()` equals `[...ROLES].sort()`).
   - `PERMISSION_DESCRIPTIONS` has a key for every entry in `PERMISSIONS`, and every description is a non-empty string.
   - Every permission listed in every `ROLE_PERMISSIONS` entry is a member of `PERMISSIONS` (no typo'd key can reach the seed).
   - `ROLE_PERMISSIONS.SYSTEM_ADMINISTRATOR` has the same length as `PERMISSIONS`.
   - `ROLE_PERMISSIONS.CUSTOMER` does **not** contain `customers:read`, `users:read`, or any `:manage` permission.
   - `ROLE_PERMISSIONS.REPORTING_USER` contains no permission ending in `:create`, `:associate`, or `:manage`.
   - `ROLE_PERMISSIONS.SUPPORT_AGENT` contains `interactions:create` and does **not** contain `users:manage` — the exact pair Story 09's demo contrasts.
2. **Create `backend/src/tests/password.spec.ts`** (unit, no Prisma):
   - `hashPassword('Passw0rd!')` resolves to a string that is **not** `'Passw0rd!'` and is longer than 20 characters.
   - `verifyPassword('Passw0rd!', await hashPassword('Passw0rd!'))` resolves `true`.
   - `verifyPassword('wrong', await hashPassword('Passw0rd!'))` resolves `false`.
   - Two `hashPassword` calls with the same input produce **different** hashes (per-hash salt).
   - These tests do real bcrypt work at 10 rounds; if the suite is slow, raise the per-test timeout with `jest.setTimeout(10_000)` at the top of the file rather than lowering `SALT_ROUNDS`.
3. **Manual seed verification** (not automated): after the migration and `npm run db:seed`, use `npx prisma studio` (or `psql -d CustomerCRM`) to confirm `branches` has 2 rows, `departments` 3, `permissions` 13, `roles` 6, `users` 6, and that `role_permissions` has 13 rows for the `SYSTEM_ADMINISTRATOR` role and 3 for `CUSTOMER`. Confirm the `CUSTOMER` user's `customerId` equals the `Demo Customer` id in `customers`.
4. **No existing test changes.** `customer.spec.ts`, `ticket.spec.ts`, `interaction.spec.ts`, `interaction.service.spec.ts`, `channels.spec.ts`, `health*.spec.ts`, and `openapi.spec.ts` must all still pass **unmodified** — this story adds no middleware and changes no route, so any failure means something outside this story's scope was touched. Story 08 is the story that updates those suites.

---

## Migration / Rollback

- The migration is **additive only** — six new tables, no `ALTER` against `system_info`, `customers`, `tickets`, or `interactions`, and no data change to existing rows.
- **Half-applied state:** if `prisma migrate dev` fails partway, `_prisma_migrations` records a failed migration and blocks every further Prisma command. On a development database, run `npx prisma migrate reset` — this **drops all data** (including the Story 04 customer/ticket/interactions) and re-applies every migration plus the seed.
- **Rollback:** delete the generated `backend/prisma/migrations/<timestamp>_auth_user_management/` directory, revert the `backend/prisma/schema.prisma` and `backend/prisma/seed.ts` edits, and run `npx prisma migrate reset`. Prisma has no `migrate down`.
- **Never hand-edit an applied migration's SQL** — Prisma checksums it. Fix forward with a new migration.
- Commit `backend/prisma/migrations/<timestamp>_auth_user_management/**`, `backend/package.json`, and `backend/package-lock.json`. **Never commit `backend/.env`.**

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Dependencies installed:** `npm ls jsonwebtoken bcryptjs` lists both; `npm ls @types/bcryptjs` reports it is **not** installed.
2. **Migration applies:** `npx prisma migrate dev --name auth_user_management` succeeds; `npx prisma migrate status` reports the schema up to date.
3. **Migration is additive:** `grep -i "ALTER TABLE" prisma/migrations/*_auth_user_management/migration.sql` returns only the `ADD CONSTRAINT` foreign-key lines for the six new tables — no `ALTER TABLE "customers"`, `"tickets"`, or `"interactions"`.
4. **Seed is idempotent:** `npm run db:seed` twice in a row; the second run logs the same message and adds zero rows (check `psql -d CustomerCRM -c 'SELECT count(*) FROM users;'` → `6` both times).
5. **Backend builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
6. **Tests pass:** `npm test` — green, including the two new spec files, with every pre-existing suite unmodified.
7. **No stray Prisma clients:** `grep -rn "new PrismaClient" src prisma` returns exactly two lines — `src/db/prisma.ts` and `prisma/seed.ts` (unchanged from Story 04).
8. **No plain-text password anywhere:** `grep -rn "password" src --include=*.ts` shows matches only in `src/auth/password.ts`; `grep -rn "Passw0rd" src` returns nothing (the demo password lives in `prisma/seed.ts` only).
9. **Regression:** with the backend running (`npm run dev`), `curl http://localhost:3000/api/health/db` still returns `"status":"up"`; `curl http://localhost:3000/api/customers/1/timeline` still returns the five seeded interactions **without** any Authorization header — nothing is protected yet, and that is correct for this story.

---

## Done Criteria

- [ ] `jsonwebtoken` and `bcryptjs` are in `backend/package.json` dependencies, `@types/jsonwebtoken` in devDependencies, and `@types/bcryptjs` is absent.
- [ ] `backend/src/auth/permissions.ts` declares `PERMISSIONS`, `Permission`, and `PERMISSION_DESCRIPTIONS`.
- [ ] `backend/src/auth/roles.ts` declares `ROLES` with exactly the six **Main Roles** from the work item, plus `ROLE_LABELS` and `ROLE_PERMISSIONS` (**"Roles and permissions"**).
- [ ] `backend/src/auth/password.ts` is the only module that hashes or compares a password (**"Authentication is handled securely"**).
- [ ] `Branch`, `Department`, `Permission`, `Role`, `RolePermission`, and `User` exist in `backend/prisma/schema.prisma` with the fields and constraints from task 6, and a committed migration applies them to `CustomerCRM` (**"Departments and branches"**).
- [ ] `npm run db:seed` is idempotent and produces 2 branches, 3 departments, 13 permissions, 6 roles with their permission links, and 6 demo users — one per role, with the `CUSTOMER` user linked to the seeded Demo Customer.
- [ ] No file under `backend/src/routes/`, `backend/src/controllers/`, `backend/src/middleware/`, `backend/src/docs/`, or `frontend/` was modified.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0 in `backend/`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 08.**
