# Story 01 — Backend bootstrap: Express + TypeScript API skeleton (Story: 1)

## Prerequisites

- None. This is the first story in the repository; the working tree currently contains only `.gitignore` and the `.squad/` folder (verified with `git ls-files`).
- **Node.js 24 LTS must be installed before starting.** `node -v` on this machine returned `v22.20.0` on 2026-08-25. Install Node 24 LTS (nvm-windows: `nvm install 24 && nvm use 24`) and re-check `node -v` before running any `npm` command.
- A prior Node + Vue implementation lived in this repository and was deleted in commit `b1f0b9c`. Its files are still readable from git history at commit `988127f` and are the **style precedent** for this story. They are **not** on disk — read them with `git show`, do not expect to find them in the working tree.
- No sibling plans exist yet: [.squad/plans/projectsetup/00-overview.md](.squad/plans/projectsetup/00-overview.md) and [.squad/plans/00-index.md](.squad/plans/00-index.md) were the unfilled squad-kit templates before this story was planned.

---

## Story Goal

Create the `backend/` project so that a Node.js 24 + TypeScript + Express 5 API starts, validates its environment, logs structured requests, serves Swagger/OpenAPI documentation, and answers a health-check endpoint.

Outcomes:

1. `npm run dev` in `backend/` starts the API on port **3000** and logs a structured startup line.
2. `GET /api/health` returns `200` with `{ "success": true, "message": "...", "data": { … } }`.
3. `GET /api/docs` serves Swagger UI; `GET /api/docs.json` serves the raw OpenAPI document.
4. A missing or malformed environment variable aborts startup with a readable error instead of failing later at runtime.
5. `npm run build` and `npm test` both pass in `backend/`.

**Not in scope for this story:** PostgreSQL, Prisma, migrations, and the database readiness probe (Story 02). The frontend (Story 03). Authentication, users, tickets, and any CRM domain entity (later stories).

---

## Context — Read These Files First

1. [.squad/stories/projectsetup/1/intake.md](.squad/stories/projectsetup/1/intake.md) — the source work item. Read **lines 109–163** (`## Description`, the stack decisions) and **lines 167–179** (`## Acceptance criteria`). The acceptance list drives `## Done Criteria` below.
2. [.gitignore](.gitignore) — only **5 lines**, all inside the `# Managed by squad-kit — do not edit this block` / `# End squad-kit block` markers. You will append below line 5; **do not** edit lines 1–5.
3. [.squad/config.yaml](.squad/config.yaml) — project name is **`CustomerSupportCRM`**, `primaryLanguage: typescript`, project root `.`. Use `CustomerSupportCRM` wording in `package.json` descriptions and in the OpenAPI `info.title`.
4. Historical backend precedent — run each command and read the output before writing the equivalent new file:
   - `git show 988127f:backend/src/index.ts` — **42 lines**. Note the response envelope `{ success, message, data }`, `cors` restricted to `http://localhost:5173`, and the `NODE_ENV !== 'test'` guard around `app.listen` that lets supertest import the app. **Keep all three conventions.**
   - `git show 988127f:backend/src/middleware/error.middleware.ts` — **18 lines**. `globalErrorHandler` resolves the status as `err.status || err.statusCode || 500` and masks 500 messages as `'Internal server error'`. **Keep this behaviour**; you are adding a typed `AppError` in front of it.
   - `git show 988127f:backend/tsconfig.json` — **14 lines**. `target: es2022`, `module: commonjs`, `rootDir: ./src`, `outDir: ./dist`, `strict: true`. **Reuse this shape.**
   - `git show 988127f:backend/package.json` — **52 lines**. Note the script names `start` / `dev` / `build` / `test` and `express@^5`. The historical `dev` used `nodemon` + `ts-node`; this story replaces both with `tsx`.
   - `git show 988127f:backend/jest.config.ts` — **14 lines**. `preset: 'ts-jest'`, `testEnvironment: 'node'`, `testMatch: ['**/tests/**/*.spec.ts']`. **Reuse verbatim**, so tests live in `backend/src/tests/`.
   - `git show 988127f:backend/.gitignore` — the ignore set for `node_modules/`, `dist/`, `.env`, `logs/`.
5. `git show 988127f:.claude/standards/coding-standards.md` — 10 lines of house rules: thin controllers, business logic in services, async/await, strong typing, input validation, global error handling. The folder layout below follows them.

---

## Implementation tasks

### 1 — Repository skeleton and root ignore rules

**File: `.gitignore`**

Append the following **after line 5** (`# End squad-kit block`). Leave the squad-kit block untouched.

```gitignore

# Node
node_modules/
dist/
*.tsbuildinfo

# Environment
.env
.env.local
.env.*.local

# Logs
logs/
*.log
npm-debug.log*

# Editors / OS
.DS_Store
Thumbs.db
```

Create the directory `backend/`. Everything else in this story lives under it.

### 2 — `backend/package.json`

**Create file: `backend/package.json`**

```json
{
  "name": "customer-support-crm-backend",
  "version": "1.0.0",
  "private": true,
  "description": "Node.js 24, Express 5, and TypeScript backend for the CustomerSupportCRM project.",
  "main": "dist/server.js",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest --runInBand",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["customer-support-crm", "node", "express", "typescript", "postgresql", "prisma"],
  "license": "MIT"
}
```

Install dependencies from inside `backend/`. **Do not hand-write version numbers into `dependencies`** — let npm resolve current versions and commit the resulting `package-lock.json`:

```bash
npm install express@^5 cors dotenv zod pino pino-http swagger-ui-express
npm install --save-dev typescript tsx @types/node @types/express @types/cors @types/swagger-ui-express jest ts-jest @types/jest supertest @types/supertest pino-pretty
```

Also create **`backend/.nvmrc`** containing a single line: `24`.

### 3 — TypeScript, Jest, and ignore config

**Create file: `backend/tsconfig.json`** — the same shape as the historical file, with `types` narrowed to what this story installs:

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "rootDir": "./src",
    "outDir": "./dist",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "types": ["node", "jest"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Create file: `backend/jest.config.ts`** — copy the 14-line historical file verbatim (`git show 988127f:backend/jest.config.ts`), then add one entry inside the config object:

```ts
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
```

**Create file: `backend/.gitignore`** — copy `git show 988127f:backend/.gitignore` verbatim.

### 4 — Environment configuration (fail fast)

**Create file: `backend/.env.example`**

```env
# Runtime
NODE_ENV=development
PORT=3000
LOG_LEVEL=info

# CORS — the Vite dev server origin (Story 03)
CORS_ORIGIN=http://localhost:5173
```

**Create file: `backend/src/config/env.ts`**

This module is the **only** place in the codebase allowed to read `process.env`. It calls `dotenv.config()` first, parses with zod, and exits with a readable message on failure.

```ts
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:5173')
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Do not use the logger here: the logger depends on this module.
  console.error('CRITICAL ERROR: invalid environment configuration.');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env: Env = parsed.data;
export const isTest = env.NODE_ENV === 'test';
export const isProduction = env.NODE_ENV === 'production';
export const API_PREFIX = '/api';
```

**Constraint:** every other file imports `env` from here. Grep for `process.env` before finishing task 9 — the only permitted hits are `src/config/env.ts` and `src/tests/setup.ts`.

If the installed zod major exposes a different flatten API, iterate `parsed.error.issues` and print `issue.path.join('.')` plus `issue.message`. The requirement is a readable per-field error list, not one specific zod call.

### 5 — Structured logging

**Create file: `backend/src/config/logger.ts`**

```ts
import pino from 'pino';
import { env, isProduction, isTest } from './env';

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'customer-support-crm-api' },
  transport:
    isProduction || isTest
      ? undefined
      : { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
});
```

**Create file: `backend/src/middleware/requestLogger.ts`** — wraps `pino-http` around the shared `logger`, redacts the `authorization` and `cookie` headers, and skips logging for `/api/docs*` so Swagger UI asset requests do not flood the log:

```ts
import pinoHttp from 'pino-http';
import { logger } from '../config/logger';

export const requestLogger = pinoHttp({
  logger,
  redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], censor: '[redacted]' },
  autoLogging: {
    ignore: (req) => (req.url ?? '').startsWith('/api/docs')
  }
});
```

### 6 — Errors, responses, and validation

**Create file: `backend/src/utils/AppError.ts`**

```ts
export class AppError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}
```

**Create file: `backend/src/utils/apiResponse.ts`** — the `{ success, message, data }` envelope from the historical `src/index.ts`, typed:

```ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export const ok = <T>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, data });
export const fail = (message: string): ApiResponse<never> => ({ success: false, message, data: null });
```

**Create file: `backend/src/middleware/error.middleware.ts`** — start from the 18-line historical file (`git show 988127f:backend/src/middleware/error.middleware.ts`), keeping the `err.status || err.statusCode || 500` resolution and the 500-message masking. Two changes: log through `logger` instead of `console.error`, and include a `details` field on the response when the error is an `AppError` whose status is below 500.

**Create file: `backend/src/middleware/notFound.middleware.ts`** — a handler that calls `next(new AppError(404, ...))` with a message naming `req.method` and `req.originalUrl`, so unknown routes flow through the same envelope. Register it **after** all routes and **before** the error handler.

**Create file: `backend/src/middleware/validate.middleware.ts`**

A factory that validates `body`, `params`, and `query` against optional zod schemas, writes the parsed values back onto the request, and produces `AppError(400, 'Validation failed', issues)` on failure:

```ts
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodTypeAny } from 'zod';
import { AppError } from '../utils/AppError';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export const validate =
  (schemas: ValidationSchemas): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const key of ['body', 'params', 'query'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const details = result.error.issues.map((issue) => ({
          path: `${key}.${issue.path.join('.')}`,
          message: issue.message
        }));
        return next(new AppError(400, 'Validation failed', details));
      }
      Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
    }
    next();
  };
```

**Express 5 note:** `req.query` is a prototype getter in Express 5 — plain assignment (`req.query = result.data`) throws at runtime. Use `Object.defineProperty` exactly as above.

### 7 — Health check route

**Create file: `backend/src/services/health.service.ts`** — returns the API's own liveness data. Keep it free of `express` imports so it stays unit-testable:

```ts
import { env } from '../config/env';

export interface ApiHealth {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface VerboseApiHealth extends ApiHealth {
  nodeVersion: string;
  memoryRssBytes: number;
}

export const getApiHealth = (verbose: boolean): ApiHealth | VerboseApiHealth => {
  const base: ApiHealth = {
    status: 'ok',
    environment: env.NODE_ENV,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  };
  if (!verbose) return base;
  return { ...base, nodeVersion: process.version, memoryRssBytes: process.memoryUsage().rss };
};
```

**Create file: `backend/src/controllers/health.controller.ts`** — a thin controller: read the validated `verbose` flag off `req.query`, call `getApiHealth`, respond with `ok(...)`. No business logic here.

**Create file: `backend/src/routes/health.routes.ts`** — an `express.Router()` with `GET /` wired through `validate({ query: healthQuerySchema })`, where:

```ts
export const healthQuerySchema = z.object({ verbose: z.enum(['true', 'false']).optional() }).strict();
```

Export the schema from this file so the OpenAPI document and the tests reference the same shape.

**Create file: `backend/src/routes/index.ts`** — the single mount point for feature routers:

```ts
import { Router } from 'express';
import healthRoutes from './health.routes';

const router = Router();
router.use('/health', healthRoutes);

export default router;
```

Story 02 extends this file; keep it as the only place routers are mounted.

### 8 — OpenAPI document and Swagger UI

**Create file: `backend/src/docs/openapi.ts`**

Export a plain OpenAPI **3.0.3** document object — hand-authored, no code generation. Include:

- `info`: title `"CustomerSupportCRM API"`, version `"1.0.0"`, and a one-line description.
- `servers`: `[{ url: 'http://localhost:3000/api', description: 'Local development' }]`.
- `components.schemas.ApiResponse` — the `{ success, message, data }` envelope.
- `paths['/health'].get` — summary `"API liveness check"`, the optional `verbose` query parameter, and a `200` response referencing `ApiResponse`.

Lead the file with this comment:

```ts
// TODO: generate this document from the zod route schemas once more endpoints exist.
// Hand-authored for now so the docs have zero codegen dependencies.
```

Mount it from `src/app.ts` (task 9) as:

```ts
app.use(`${API_PREFIX}/docs`, swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.get(`${API_PREFIX}/docs.json`, (_req, res) => {
  res.json(openApiDocument);
});
```

Register the docs routes **before** the not-found middleware.

### 9 — App factory and server entrypoint

**Create file: `backend/src/app.ts`** — builds and returns the configured Express app. **No `app.listen` here** — that separation is what makes supertest work, and it replaces the historical `NODE_ENV !== 'test'` guard in `src/index.ts`.

Registration order, exactly:

1. `requestLogger`
2. `cors({ origin: env.CORS_ORIGIN })`
3. `express.json()`
4. `GET /` responding `ok(null, 'CustomerSupportCRM API')`
5. `app.use(API_PREFIX, routes)`
6. Swagger UI and `docs.json`
7. `notFoundMiddleware`
8. `globalErrorHandler`

Export both `export const createApp = (): Express => { … }` and `export default createApp()`.

**Create file: `backend/src/server.ts`**

```ts
import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'CustomerSupportCRM API started');
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Shutting down');
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

`server.ts` is the only file that listens; `app.ts` is the only file that composes middleware. Story 02 adds a Prisma disconnect inside `shutdown`.

---

## Edge Cases & Failure Modes

- **Node version mismatch.** `node -v` returned **v22.20.0** on this machine on 2026-08-25, but `engines.node` declares `>=24.0.0`. npm only *warns* by default, so a build on Node 22 looks like a success. Do **not** add `engine-strict=true` to an `.npmrc` to force it — instead verification step 1 asserts `node -v` prints `v24.x`. If Node 24 cannot be installed, stop and report rather than quietly lowering `engines`.
- **Missing `.env`.** With no `.env` file at all the API must still start: every variable in `src/config/env.ts` has a `.default(...)`. Enforced in task 4.
- **Malformed `PORT`** (e.g. `PORT=abc`). `z.coerce.number()` fails, `process.exit(1)` runs, and the printed field list names `PORT`. Enforced in `src/config/env.ts`.
- **Unknown query parameter on `/api/health`** (e.g. `?verbse=true`). The `.strict()` zod object rejects it with `400 Validation failed` plus a `details` array. Enforced by `validate` in `src/middleware/validate.middleware.ts`.
- **`req.query` assignment under Express 5.** Direct assignment throws `TypeError`. The `Object.defineProperty` form in task 6 is required, not stylistic.
- **Unknown route.** `GET /api/nope` returns `404` in the `{ success: false, … }` envelope, not Express's default HTML error page. Enforced by `notFound.middleware.ts` registered before the error handler.
- **Internal errors leak nothing.** Any thrown error without an explicit status returns `500` with the literal message `'Internal server error'`; the real error reaches the log only. Behaviour inherited from the historical `error.middleware.ts`.
- **Port already in use.** `npm run dev` fails with `EADDRINUSE`. Change `PORT` in `.env` — and remember Story 03's API client base URL must then match.
- **`pino-pretty` in production.** The transport is disabled when `NODE_ENV` is `production` or `test`, so `pino-pretty` stays a devDependency and `npm start` on a production install does not crash looking for it.
- **Arabic characters in the repository path.** The absolute project path contains non-ASCII characters. Always quote paths in shell commands (`cd "d:/…/Ticket Mini Module/backend"`). If an npm or `tsc` invocation misbehaves on the path, run it from inside `backend/` using relative paths only.
- **Unverified dependency majors.** This plan pins only `express@^5`; everything else installs at whatever npm resolves. If a package's current major has moved its API (most likely `zod`'s error helpers), adapt the call site and preserve the documented *behaviour* — do not downgrade the package to match the snippet.

---

## Test Plan

All tests live in `backend/src/tests/`, matching `testMatch: ['**/tests/**/*.spec.ts']` from the historical `jest.config.ts`.

1. **Create `backend/src/tests/setup.ts`** (referenced by `setupFiles`) — sets `process.env.NODE_ENV = 'test'` and `process.env.LOG_LEVEL = 'silent'` **before** any module imports `src/config/env.ts`. This is the second and last permitted `process.env` write site.
2. **Create `backend/src/tests/health.spec.ts`** (integration, supertest against the app imported from `../app`):
   - `GET /api/health` → `200`, `body.success === true`, `body.data.status === 'ok'`, `body.data.environment === 'test'`.
   - `GET /api/health?verbose=true` → `200` and `body.data.nodeVersion` is a non-empty string.
   - `GET /api/health?verbse=true` → `400`, `body.success === false`, `body.message === 'Validation failed'`.
   - `GET /api/unknown` → `404` and `body.success === false`.
   - `GET /api/docs.json` → `200` and `body.info.title === 'CustomerSupportCRM API'`.
3. **Create `backend/src/tests/health.service.spec.ts`** (unit) — `getApiHealth(false)` omits `nodeVersion`; `getApiHealth(true)` includes `nodeVersion` and `memoryRssBytes`; `timestamp` parses as a valid ISO date.
4. **Create `backend/src/tests/error.middleware.spec.ts`** (unit) — call `globalErrorHandler` with a mocked `Response`: an `AppError(400, 'Bad thing', [{ path: 'body.x' }])` responds `400` with that message and the details; a bare `new Error('boom')` responds `500` with the message `'Internal server error'` and **no** `details`.

No tests are modified or removed — the repository currently has none.

---

## Verification Steps

Run everything from `backend/` unless stated otherwise.

1. **Toolchain:** `node -v` prints a `v24.` version and `npm -v` succeeds. Stop here if Node is not 24.
2. **Install:** `npm install` completes and writes `backend/package-lock.json`.
3. **Backend builds:** `npm run build` exits 0 and produces `backend/dist/server.js`.
4. **Typecheck:** `npm run typecheck` exits 0.
5. **Tests pass:** `npm test` — all four spec files green.
6. **Backend runs:** `npm run dev`, then from a second shell:
   - `curl http://localhost:3000/api/health` → `{"success":true,...,"data":{"status":"ok",...}}`
   - `curl "http://localhost:3000/api/health?verbose=true"` → payload includes `nodeVersion`
   - `curl "http://localhost:3000/api/health?verbse=true"` → HTTP 400 with `"message":"Validation failed"`
   - `curl http://localhost:3000/api/docs.json` → OpenAPI JSON containing `"title":"CustomerSupportCRM API"`
   - Open `http://localhost:3000/api/docs` in a browser → Swagger UI renders the `/health` operation.
7. **Fail-fast check:** `PORT=abc npm run dev` exits non-zero and prints a field error naming `PORT`. Unset it afterwards.
8. **Regression:** `git status --short` shows no changes under `.squad/` and no `.env` staged; `git check-ignore -v backend/node_modules backend/.env` reports both as ignored.

---

## Done Criteria

- [ ] `backend/` exists with `src/config`, `src/controllers`, `src/services`, `src/routes`, `src/middleware`, `src/docs`, `src/utils`, and `src/tests`.
- [ ] `npm run dev` starts the API on port 3000 and logs a structured startup line (**Backend project runs successfully**).
- [ ] `GET /api/health` returns 200 in the `{ success, message, data }` envelope (**Health-check API is available**).
- [ ] `GET /api/docs` serves Swagger UI and `GET /api/docs.json` serves the OpenAPI document.
- [ ] Environment variables are declared in `backend/.env.example` and validated in `src/config/env.ts`; invalid config exits with a readable per-field error.
- [ ] Request logging is structured (pino) with `authorization` and `cookie` redacted and `/api/docs` requests skipped.
- [ ] Input-validation middleware exists and is exercised by the `/api/health` query schema.
- [ ] Unknown routes and thrown errors both return the error envelope; 500s never leak an internal message.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0.
- [ ] `process.env` appears only in `src/config/env.ts` and `src/tests/setup.ts`.
- [ ] Root `.gitignore` ignores `node_modules/`, `dist/`, and `.env`, with the squad-kit block (lines 1–5) unmodified.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 02.**
