# PostgreSQL Database — CustomerCRM

This directory documents how to recreate the PostgreSQL database for the **CustomerSupportCRM** project.

## Prerequisites

- **PostgreSQL 16** (or compatible — this project was verified against PostgreSQL 17).
- **Database name**: `CustomerCRM` (exact casing — see the warning below).
- On Windows, `psql` is often not on `PATH`. Its default location is:
  ```
  C:\Program Files\PostgreSQL\16\bin\psql.exe
  ```
  (or `...\17\bin\psql.exe` depending on the installed version). Either add that folder to `PATH` or invoke the full path directly.

---

## Method 1 (recommended): Prisma

1. Set `DATABASE_URL` in `backend/.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/CustomerCRM?schema=public"
   ```
   If your password contains special characters (`@`, `:`, `/`, `#`), percent-encode them — e.g. `@` becomes `%40`.

2. From `backend/`, apply the migrations:
   ```bash
   npx prisma migrate dev
   ```

3. Seed the bootstrap data:
   ```bash
   npm run db:seed
   ```

---

## Method 2 (fallback): raw SQL

1. Create the database. **The quotes are mandatory** — `CustomerCRM` contains capital letters, and an unquoted `CREATE DATABASE CustomerCRM;` silently creates a database literally named `customercrm`, which then fails to match `DATABASE_URL`:
   ```sql
   CREATE DATABASE "CustomerCRM";
   ```

2. Apply the initial migration SQL directly:
   ```bash
   psql -d CustomerCRM -f backend/prisma/migrations/<timestamp>_init/migration.sql
   ```
   (replace `<timestamp>_init` with the actual migration folder name under `backend/prisma/migrations/`).

---

## Reset

```bash
npx prisma migrate reset
```

**This drops all data** in the database and re-applies every migration from scratch, followed by the seed script. Only use it in development.

---

## Verify

With the backend running (`npm run dev` from `backend/`):

```bash
curl http://localhost:3000/api/health/db
```

A healthy setup returns `"status":"up"` with a non-null `schemaVersion`. If PostgreSQL is unreachable or the migration hasn't been applied, this returns HTTP `503` with `"status":"down"` and a readable error message instead of crashing the API.
