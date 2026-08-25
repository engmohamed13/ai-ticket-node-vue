# Story 02 — PostgreSQL `CustomerCRM` and Prisma with an initial migration (Story: 1)

## Prerequisites

- Story 01 completed: [01-story-backend-bootstrap-1.md](01-story-backend-bootstrap-1.md). Specifically `backend/src/config/env.ts`, `backend/src/app.ts`, `backend/src/routes/index.ts`, `backend/src/services/health.service.ts`, and `backend/src/docs/openapi.ts` must exist and `npm test` must be green before you start.
- **A running PostgreSQL server is required.** `psql --version` on this machine reported `command not found` on 2026-08-25, so PostgreSQL is either not installed or not on `PATH`. Before starting, either install PostgreSQL 16 locally, or start a container (`docker run --name customercrm-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`). Record the credentials you end up using — task 2 needs them.
- Prisma migration commands write to a real database. Do not run them against any database other than **`CustomerCRM`**.

---

## Story Goal

Connect the backend to a PostgreSQL database named **`CustomerCRM`** through Prisma, ship the initial migration, and extend the health check so it proves the API → PostgreSQL link at runtime.

Outcomes:

1. `DATABASE_URL` is a validated, required environment variable; the API refuses to start without it.
2. `npx prisma migrate dev` creates the initial migration and applies it to `CustomerCRM`.
3. A single shared `PrismaClient` instance serves the whole process and disconnects cleanly on shutdown.
4. `GET /api/health` reports API **and** database status; `GET /api/health/db` is a dedicated readiness probe returning `503` when the database is unreachable.
5. `database/README.md` documents how to recreate `CustomerCRM` from scratch.

**Not in scope for this story:** CRM domain entities (`Customer`, `Ticket`, `Agent`, `User`), authentication, and any CRUD endpoint. The only table created here is the bootstrap `SystemInfo` table described in task 3 — domain modelling belongs to later stories. The frontend is Story 03.

---

## Context — Read These Files First

1. [.squad/stories/projectsetup/1/intake.md](.squad/stories/projectsetup/1/intake.md) — **lines 109–163**. The database decisions are explicit: PostgreSQL, database name **`CustomerCRM`**, ORM **Prisma**, and "Create initial database migration". Acceptance criteria at **lines 167–179** require "PostgreSQL CustomerCRM database is connected" and "Initial Prisma migration works".
2. [01-story-backend-bootstrap-1.md](01-story-backend-bootstrap-1.md) — re-read task 4 (`src/config/env.ts` is the only permitted `process.env` reader), task 7 (health service shape), and task 9 (`app.ts` registration order and the `shutdown` function in `server.ts`).
3. `backend/src/config/env.ts` — read the whole file. You are adding one required field to `envSchema`.
4. `backend/src/services/health.service.ts` — read the whole file. `getApiHealth` stays as-is; you are adding a second, async function beside it.
5. `backend/src/routes/index.ts` and `backend/src/routes/health.routes.ts` — read both; the new readiness route mounts here.
6. Historical Prisma precedent — run and read before writing:
   - `git show 988127f:backend/prisma/schema.prisma` — **42 lines**. Note `generator client { provider = "prisma-client-js" }` and `datasource db { provider = "postgresql"; url = env("DATABASE_URL") }`. That datasource block is exactly what this story needs; the `User` / `Ticket` / `Comment` models in it are **out of scope here**.
   - `git show 988127f:backend/prisma/migrations/migration_lock.toml` — 3 lines, `provider = "postgresql"`. This file must be committed.
   - `git show 988127f:backend/prisma/migrations/20260708124818_init/migration.sql` — an example of what `prisma migrate dev` generates (`CREATE TABLE`, `CREATE UNIQUE INDEX`, `ALTER TABLE … ADD CONSTRAINT`). **Do not hand-write migration SQL** — generate it and read it back.
   - `git show 988127f:backend/prisma/seed.ts` and `git show 988127f:backend/package.json` (the `"prisma": { "seed": "ts-node prisma/seed.ts" }` block at the top level) — the seed wiring precedent. This story wires the seed through `tsx` instead of `ts-node`.
   - `git show 988127f:database/README.md` — the recreate-the-database document to model `database/README.md` on. Note that the historical database was named `ticketdb`; the new name is **`CustomerCRM`**.

---

## Implementation tasks

### 1 — Install Prisma

From `backend/`:

```bash
npm install @prisma/client
npm install --save-dev prisma
npx prisma init --datasource-provider postgresql
```

`prisma init` scaffolds `backend/prisma/schema.prisma` and appends `DATABASE_URL` to `backend/.env`. **Read the generated `schema.prisma` before editing it** — keep whatever `generator` block the installed Prisma major scaffolds (recent majors require an explicit `output` path; the historical schema at `988127f` had none). If the generator declares an `output`, import `PrismaClient` from that generated path in task 4 rather than from `@prisma/client`.

Add the seed hook to `backend/package.json` — a **top-level** `"prisma"` key, sibling to `"scripts"`, plus one new script:

```json
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
```

```json
    "db:seed": "prisma db seed",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:studio": "prisma studio"
```

Confirm `backend/.gitignore` already ignores `.env` (it does, from Story 01 task 3) and that `prisma/migrations/` is **not** ignored — migrations are committed.

### 2 — Environment variable

**File: `backend/.env.example`**

Append:

```env
# Database — PostgreSQL. The database name must be exactly CustomerCRM.
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/CustomerCRM?schema=public"
```

**File: `backend/.env`** — set the same key with your real credentials. This file is git-ignored; never commit it.

**File: `backend/src/config/env.ts`**

Add one required field to `envSchema`, alongside the existing `NODE_ENV` / `PORT` / `LOG_LEVEL` / `CORS_ORIGIN` entries:

```ts
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required, e.g. postgresql://user:pass@localhost:5432/CustomerCRM?schema=public')
    .refine((value) => value.startsWith('postgresql://') || value.startsWith('postgres://'), {
      message: 'DATABASE_URL must be a PostgreSQL connection string'
    }),
```

It is **deliberately required with no default** — a silently-wrong database URL is worse than a startup crash.

**File: `backend/src/tests/setup.ts`** — add a `DATABASE_URL` default so unit tests keep running without a live database:

```ts
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/CustomerCRM?schema=public';
```

### 3 — Prisma schema: the bootstrap table

**File: `backend/prisma/schema.prisma`**

Keep the scaffolded `generator` block and set the datasource exactly as in the historical schema:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Add one model. It exists so the initial migration is real and so the health probe can prove a genuine table read — **not** as a domain entity:

```prisma
/// Bootstrap metadata table. Proves the schema/migration/connection path end to end.
/// Domain models (Customer, Ticket, Agent, User) are intentionally deferred to later stories.
model SystemInfo {
  id        Int      @id @default(autoincrement())
  key       String   @unique
  value     String
  updatedAt DateTime @updatedAt

  @@map("system_info")
}
```

### 4 — Shared Prisma client

**Create file: `backend/src/db/prisma.ts`**

One client per process, log level driven by `env`, and a `disconnectPrisma` helper for shutdown:

```ts
import { PrismaClient } from '@prisma/client';
import { env, isProduction } from '../config/env';
import { logger } from '../config/logger';

export const prisma = new PrismaClient({
  log: isProduction ? ['error'] : ['warn', 'error'],
  datasources: { db: { url: env.DATABASE_URL } }
});

export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect();
  logger.info('Prisma client disconnected');
};
```

If the installed Prisma major rejects the `datasources` override, drop that option — the schema already reads `env("DATABASE_URL")`. Keep the import path aligned with whatever the generator block in task 1 produced.

**Do not** instantiate `PrismaClient` anywhere else. Grep for `new PrismaClient` before finishing: exactly one hit, in this file.

### 5 — Initial migration and seed

Create the database first if it does not exist. **`CustomerCRM` contains capital letters, so PostgreSQL requires it double-quoted**:

```sql
CREATE DATABASE "CustomerCRM";
```

Then, from `backend/`:

```bash
npx prisma migrate dev --name init
```

This generates `backend/prisma/migrations/<timestamp>_init/migration.sql`, applies it, and regenerates the client. **Read the generated SQL** and confirm it creates `system_info` with a unique index on `key`. Commit the migration directory and `migration_lock.toml`.

**Create file: `backend/prisma/seed.ts`** — idempotent, following the historical seed's `upsert` style:

```ts
import { prisma } from '../src/db/prisma';

const main = async (): Promise<void> => {
  await prisma.systemInfo.upsert({
    where: { key: 'schemaVersion' },
    update: { value: '1' },
    create: { key: 'schemaVersion', value: '1' }
  });
  await prisma.systemInfo.upsert({
    where: { key: 'appName' },
    update: { value: 'CustomerSupportCRM' },
    create: { key: 'appName', value: 'CustomerSupportCRM' }
  });
  console.log('Seed complete: system_info');
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Run `npm run db:seed` and confirm it is safe to run twice.

### 6 — Database health probe

**File: `backend/src/services/health.service.ts`**

Leave `getApiHealth` untouched. Add:

```ts
export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number | null;
  schemaVersion: string | null;
  error: string | null;
}

export const getDatabaseHealth = async (): Promise<DatabaseHealth> => {
  const startedAt = process.hrtime.bigint();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const row = await prisma.systemInfo.findUnique({ where: { key: 'schemaVersion' } });
    const latencyMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
    return { status: 'up', latencyMs, schemaVersion: row?.value ?? null, error: null };
  } catch (error) {
    logger.error({ err: error }, 'Database health probe failed');
    return {
      status: 'down',
      latencyMs: null,
      schemaVersion: null,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
};
```

**The probe never throws.** It reports `status: 'down'` instead, so a dead database produces a readable health payload rather than a 500 from the global error handler.

`$queryRaw` proves connectivity; the `systemInfo` read proves the migration was applied. Both are needed — a connection to a database with no tables is not a working setup.

**File: `backend/src/controllers/health.controller.ts`**

- Extend the existing handler so the `/api/health` payload becomes `{ status, api, database }`, where the top-level `status` is `'ok'` when `database.status === 'up'` and `'degraded'` otherwise. Respond `200` when ok, **`503`** when degraded. Keep the `verbose` query flag working on the `api` sub-object.
- Add a second handler for the readiness probe returning `{ database }` only, with the same 200/503 rule.

**File: `backend/src/routes/health.routes.ts`** — add `GET /db` mapped to the new handler. Keep `healthQuerySchema` on `GET /` only.

**File: `backend/src/docs/openapi.ts`** — update `paths['/health']` to document the `{ status, api, database }` payload plus the `503` response, and add `paths['/health/db']` with its `200` and `503` responses. Add a `components.schemas.DatabaseHealth` entry mirroring the `DatabaseHealth` interface.

### 7 — Clean shutdown

**File: `backend/src/server.ts`**

Import `disconnectPrisma` and await it inside `shutdown`, before `process.exit(0)`:

```ts
const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
};
```

### 8 — Database documentation

**Create file: `database/README.md`**

Model it on `git show 988127f:database/README.md`, updated for this project:

- **Prerequisites** — PostgreSQL 16, database name **`CustomerCRM`**, and the note that `psql` may not be on `PATH` on Windows (its default location is `C:\Program Files\PostgreSQL\16\bin\psql.exe`).
- **Method 1 (recommended): Prisma.** Set `DATABASE_URL` in `backend/.env`, then `npx prisma migrate dev` and `npm run db:seed` from `backend/`.
- **Method 2 (fallback): raw SQL.** `CREATE DATABASE "CustomerCRM";` — with an explicit warning that the quotes are mandatory — followed by applying `backend/prisma/migrations/<timestamp>_init/migration.sql` with `psql -d CustomerCRM -f <path>`.
- **Reset** — `npx prisma migrate reset` and a plain statement that it **drops all data**.
- **Verify** — `curl http://localhost:3000/api/health/db` returns `"status":"up"`.

---

## Edge Cases & Failure Modes

- **PostgreSQL not running.** `prisma migrate dev` fails with `P1001: Can't reach database server`. Start the server or container first (see Prerequisites). Once the API is running, the same condition surfaces as `GET /api/health/db` → `503` with `database.status: "down"` — handled by the try/catch in `getDatabaseHealth` (task 6).
- **Database name casing.** `CREATE DATABASE CustomerCRM;` (unquoted) creates a database literally named `customercrm`, and `DATABASE_URL` pointing at `CustomerCRM` then fails with `P1003`. The quoted form in task 5 is mandatory; `database/README.md` must repeat the warning.
- **`DATABASE_URL` missing.** Startup exits non-zero with the field message from task 2 — never a lazy failure on the first query.
- **`DATABASE_URL` present but pointing at a database with no tables** (created but not migrated). `$queryRaw \`SELECT 1\`` succeeds while the `systemInfo` read fails with `P2021: table does not exist`. The probe reports `status: 'down'` with that message — this is exactly why the probe does both calls.
- **Special characters in the database password.** `@`, `:`, `/`, and `#` in a password break the connection URL. Percent-encode them (`@` → `%40`) inside `DATABASE_URL`, and note this in `database/README.md`.
- **Unit tests without a database.** `src/tests/setup.ts` supplies a `DATABASE_URL` default so env validation passes; `PrismaClient` connects lazily, so no connection is opened until a query runs. Tests that touch the probe mock the Prisma client (see Test Plan item 2) — `npm test` must never require a live database.
- **Concurrent `PrismaClient` instances.** Instantiating a second client (e.g. in `prisma/seed.ts`) doubles the connection pool and exhausts PostgreSQL's default 100-connection limit under `tsx watch` reloads. The seed imports the shared client from `src/db/prisma.ts`; enforced by the single-`new PrismaClient` grep in task 4.
- **Half-applied migration.** If `migrate dev` fails midway, Prisma marks the migration failed in the `_prisma_migrations` table and refuses to proceed. See `## Migration / Rollback` below.
- **Prisma major differences.** Recent Prisma majors require an explicit `output` in the `generator` block and change the generated import path. Follow whatever `prisma init` scaffolds in task 1 and keep the import in `src/db/prisma.ts` consistent with it; do not force the historical `prisma-client-js` shape if the installed CLI generates something else.

---

## Test Plan

1. **Modify `backend/src/tests/setup.ts`** — add the `DATABASE_URL` default (task 2). No other change.
2. **Create `backend/src/tests/health.db.spec.ts`** (unit, Prisma mocked with `jest.mock('../db/prisma')`):
   - `$queryRaw` resolves and `systemInfo.findUnique` returns `{ value: '1' }` → `getDatabaseHealth()` yields `status: 'up'`, a numeric `latencyMs`, `schemaVersion: '1'`, `error: null`.
   - `$queryRaw` rejects with `new Error('P1001')` → `status: 'down'`, `latencyMs: null`, and `error` contains `'P1001'`. **Assert the function resolves rather than throwing.**
   - `$queryRaw` resolves but `systemInfo.findUnique` rejects → `status: 'down'` (the unmigrated-database case).
3. **Modify `backend/src/tests/health.spec.ts`** — same Prisma mock; update the existing `GET /api/health` assertions for the new `{ status, api, database }` shape, and add:
   - database up → `200`, `body.data.status === 'ok'`, `body.data.database.status === 'up'`.
   - database down → **`503`**, `body.data.status === 'degraded'`.
   - `GET /api/health/db` up → `200`; down → `503`.
   - The `?verbse=true` 400 case and the `/api/unknown` 404 case must still pass unchanged.
4. **Create `backend/src/tests/openapi.spec.ts`** (unit) — the exported document has `paths['/health/db']` and `components.schemas.DatabaseHealth`.
5. **Manual integration smoke** (not automated, no live-DB dependency in CI): with PostgreSQL running and the migration applied, `curl http://localhost:3000/api/health/db` returns `"status":"up"` and a non-null `schemaVersion`. Recorded in `## Verification Steps`.

---

## Migration / Rollback

- The migration is **additive only** — it creates `system_info` and touches nothing else. There is no data to lose on a fresh database.
- **Half-applied state:** if `prisma migrate dev` fails partway, `_prisma_migrations` holds a row with a non-null `failed_at`, and every later Prisma command refuses to run. On a development database the fix is `npx prisma migrate reset` (**drops all data and re-applies from scratch**). Do not hand-edit `_prisma_migrations`.
- **Rollback:** delete the generated `backend/prisma/migrations/<timestamp>_init/` directory and run `npx prisma migrate reset`. Prisma has no `migrate down`; a rollback is always reset-and-reapply.
- **Never edit an applied migration's SQL.** Prisma checksums migration files; an edited file fails on the next `migrate dev` with a drift error. Add a new migration instead.
- Commit `prisma/migrations/**` and `prisma/migrations/migration_lock.toml`. Never commit `backend/.env`.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Database exists:** connect to PostgreSQL and confirm `CustomerCRM` is listed with exact casing (`\l` in `psql`, or `SELECT datname FROM pg_database WHERE datname = 'CustomerCRM';`).
2. **Migration applies:** `npx prisma migrate dev` reports the migration as applied and `npx prisma migrate status` prints "Database schema is up to date".
3. **Table exists:** `npx prisma studio` (or `psql -d CustomerCRM -c '\d system_info'`) shows the `system_info` table with a unique index on `key`.
4. **Seed runs twice:** `npm run db:seed` twice in a row; both succeed and `system_info` holds exactly two rows.
5. **Backend builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
6. **Tests pass:** `npm test` — green **with PostgreSQL stopped**, proving no test needs a live database.
7. **Backend runs:** `npm run dev`, then from a second shell:
   - `curl http://localhost:3000/api/health` → HTTP 200, `"status":"ok"`, `"database":{"status":"up","schemaVersion":"1",…}`
   - `curl http://localhost:3000/api/health/db` → HTTP 200, `"status":"up"`
   - `curl http://localhost:3000/api/docs.json` → contains `"/health/db"`
8. **Failure path:** stop PostgreSQL (or the container), then `curl -i http://localhost:3000/api/health/db` → **HTTP 503** with `"status":"down"` and a readable `error`. The process must still be running afterwards. Restart PostgreSQL.
9. **Fail-fast check:** with `DATABASE_URL` removed from `.env`, `npm run dev` exits non-zero and names `DATABASE_URL`. Restore it.
10. **Regression:** Story 01's checks still hold — `GET /api/health?verbse=true` → 400, `GET /api/unknown` → 404, Swagger UI renders at `/api/docs`.
11. **Single client:** `grep -rn "new PrismaClient" backend/src backend/prisma` returns exactly one line, in `backend/src/db/prisma.ts`.

---

## Done Criteria

- [ ] `@prisma/client` and `prisma` are installed and `backend/prisma/schema.prisma` declares the `postgresql` datasource reading `env("DATABASE_URL")`.
- [ ] `DATABASE_URL` is documented in `backend/.env.example` and **required** in `src/config/env.ts`; startup fails readably without it.
- [ ] `backend/prisma/migrations/<timestamp>_init/migration.sql` and `migration_lock.toml` are committed, and `npx prisma migrate status` reports the schema up to date against **`CustomerCRM`** (**Initial Prisma migration works**).
- [ ] `system_info` exists in `CustomerCRM` with a unique index on `key` (**PostgreSQL CustomerCRM database is connected**).
- [ ] `npm run db:seed` is idempotent and populates `schemaVersion` and `appName`.
- [ ] Exactly one `PrismaClient` is instantiated, in `src/db/prisma.ts`, and it disconnects on `SIGINT`/`SIGTERM`.
- [ ] `GET /api/health` returns `{ status, api, database }` — 200 when the database is up, 503 when it is down — and `GET /api/health/db` is the dedicated readiness probe.
- [ ] A dead database yields a 503 health payload, not an unhandled 500, and the process stays alive.
- [ ] `src/docs/openapi.ts` documents `/health` and `/health/db` including the 503 responses.
- [ ] `database/README.md` documents recreating `CustomerCRM` by both Prisma and raw SQL, with the quoted-`CREATE DATABASE` warning.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0 with PostgreSQL stopped.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 03.**
