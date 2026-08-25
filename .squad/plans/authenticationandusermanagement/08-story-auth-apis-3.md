# Story 08 — JWT login/logout, permission-protected APIs, and user management endpoints (Story: 3)

## Prerequisites

- Story 07 completed: [07-story-auth-data-model-3.md](07-story-auth-data-model-3.md). Specifically: `Branch`, `Department`, `Permission`, `Role`, `RolePermission`, and `User` exist in `backend/prisma/schema.prisma` and are migrated into `CustomerCRM`; `backend/src/auth/permissions.ts` (`PERMISSIONS`, `Permission`, `PERMISSION_DESCRIPTIONS`), `backend/src/auth/roles.ts` (`ROLES`, `RoleKey`, `ROLE_LABELS`, `ROLE_PERMISSIONS`), and `backend/src/auth/password.ts` (`hashPassword`, `verifyPassword`) exist; `jsonwebtoken` and `@types/jsonwebtoken` are installed; `npm run db:seed` has been run so the six demo users (password `Passw0rd!`) exist.
- Story 05 completed: [../communicationchannels/05-story-communication-apis-2.md](../communicationchannels/05-story-communication-apis-2.md). This story **modifies** the routers it created (`backend/src/routes/customer.routes.ts`, `ticket.routes.ts`, `interaction.routes.ts`) and **modifies the tests it created** (`backend/src/tests/customer.spec.ts`, `ticket.spec.ts`, `interaction.spec.ts`) — those three suites will fail until task 12 is done.
- A running PostgreSQL server with the migrated `CustomerCRM` database, per [database/README.md](../../../database/README.md).
- **Breaking change warning.** After task 10, every `/api/customers`, `/api/tickets`, and `/api/interactions` request without a valid `Authorization: Bearer <token>` header returns `401`. `frontend/src/services/api.ts` sends no such header today, so the **Communications screen from Story 06 stops working until Story 09 lands**. Do not deploy Story 08 without Story 09.

---

## Story Goal

Turn the Story 07 data model into a working authentication and authorisation layer, and expose the administration endpoints an administrator needs.

Outcomes:

1. `POST /api/auth/login` verifies e-mail + password against `users.passwordHash` and returns a signed JWT plus the authenticated user (role, permissions, department, branch). `POST /api/auth/logout` and `GET /api/auth/me` complete the session lifecycle.
2. `authenticate` and `requirePermission(...)` middleware protect every non-health, non-auth route. Missing/invalid/expired token → `401`; valid token without the required permission → `403`.
3. A `CUSTOMER`-role user is additionally scoped to their **own** customer records — a permission alone cannot express "only mine".
4. User management: list, read, create, update, change password, deactivate — all behind `users:read` / `users:manage`.
5. Roles and permissions are readable, and an administrator can change which permissions a role grants.
6. Departments and branches are readable and creatable, so a user can be assigned to one.
7. Every new endpoint is documented in `backend/src/docs/openapi.ts` with a `bearerAuth` security scheme, and covered by Jest + Supertest tests following the existing patterns.

**Not in scope for this story:** the frontend (Story 09), refresh tokens, server-side token revocation (see `## Edge Cases & Failure Modes`), password-reset e-mails, MFA, OAuth/SSO, rate limiting on login, ticket-mutation endpoints (`tickets:manage` is seeded but has no route yet), and reporting endpoints (`reports:read` likewise).

---

## Context — Read These Files First

1. [.squad/stories/authenticationandusermanagement/3/intake.md](../../stories/authenticationandusermanagement/3/intake.md) — `## Acceptance criteria`: "User can login and logout", "Authentication is handled securely", "Protected APIs reject unauthorized requests", "Roles and permissions are enforced", "Users can be created and managed by an administrator". Tasks 5–10 below map onto those five criteria one-for-one.
2. [07-story-auth-data-model-3.md](07-story-auth-data-model-3.md) — re-read task 4 (the exact `ROLE_PERMISSIONS` map — which role gets `users:manage`, why `CUSTOMER` has no `customers:read`, why `REPORTING_USER` is read-only), task 6 (the `User` model's `roleId` required / `departmentId`+`branchId`+`customerId` nullable split), and task 8 (the six seeded demo accounts and their e-mails).
3. `backend/src/config/env.ts` (33 lines) — read the whole file. `envSchema` (6–17) is a Zod object parsed once at import time; on failure the module **calls `process.exit(1)`** (23–28). That means a missing `JWT_SECRET` kills every Jest worker with no useful output — which is why task 1 edits `backend/src/tests/setup.ts` in the same change.
4. `backend/src/tests/setup.ts` (3 lines) — `setupFiles` in `backend/jest.config.ts` (line 12) runs this **before** any module import, so `process.env` assignments here are visible to `env.ts`. Follow the existing `??=` idiom so a real environment value still wins.
5. `backend/src/middleware/validate.middleware.ts` (28 lines) — `validate({ body, params, query })` runs `safeParse` per key, raises `AppError(400, 'Validation failed', details)` on failure (line 23), and **replaces** `req[key]` with the parsed, coerced result (line 25). Every schema in this story is `.strict()`, matching `healthQuerySchema` (`backend/src/routes/health.routes.ts:6`) and `createInteractionSchema` (`backend/src/routes/interaction.routes.ts:12-22`).
6. `backend/src/utils/AppError.ts` (12 lines) and `backend/src/middleware/error.middleware.ts` (23 lines) — `AppError(status, message, details?)`. `globalErrorHandler` reads `err.status`, masks the message for `500`, and attaches `details` only for `AppError` instances with `status < 500` (line 18). **Every** auth failure in this story goes through `AppError` + `next(...)`, never `res.status(401).json(...)` directly, so the `{ success, message, data }` envelope stays uniform.
7. `backend/src/utils/apiResponse.ts` (8 lines) — `ok(data, message)` / `fail(message)`. Every success response in this story is `res.json(ok(...))`.
8. `backend/src/routes/index.ts` (13 lines) — read the whole file. Currently four `router.use('/<resource>', …)` mounts. Task 10 inserts `router.use(authenticate)` **between** the public mounts and the protected ones; mount order is the entire mechanism, so get it exactly right.
9. `backend/src/app.ts` (36 lines) — `app.use(API_PREFIX, routes)` on line 23, then Swagger UI on 25–28, then `notFoundMiddleware` and `globalErrorHandler` on 30–31. `express.json()` (line 17) is already mounted, so `req.body` parsing needs nothing new. Note `/api/docs` and `/api/docs.json` are mounted **outside** `routes` — they stay public.
10. `backend/src/routes/customer.routes.ts` (11 lines), `backend/src/routes/ticket.routes.ts` (15 lines), `backend/src/routes/interaction.routes.ts` (34 lines) — the three routers task 11 adds `requirePermission(...)` to. Read all three; note the existing `validate({ params: idParamSchema })` placement so the new middleware goes **before** it.
11. `backend/src/controllers/ticket.controller.ts` (21 lines) and `backend/src/controllers/customer.controller.ts` — the thin `async (req, res) => …` shape with **no try/catch**: Express 5 (`"express": "^5.2.1"`) forwards a rejected async handler to `globalErrorHandler` automatically. Every new controller in this story follows that exactly.
12. `backend/src/services/interaction.service.ts` — `AppError(404, …)` for missing rows and `AppError(400, …)` for a cross-customer ticket, raised from the service, not the controller. The new services follow the same split: plain exported `async` functions, no classes.
13. `backend/src/tests/customer.spec.ts` (56 lines) — read the whole file. Note that `jest.mock('../db/prisma', …)` is declared on **line 1, before** the `import request from 'supertest'` / `import app from '../app'` lines, and the mock factory references nothing out of scope. Task 12 adds an `Authorization` header to every request in this file and its two siblings.
14. `backend/src/tests/interaction.spec.ts` (259 lines) and `backend/src/tests/ticket.spec.ts` (85 lines) — the other two suites task 12 modifies. Read the `jest.mock` blocks at the top of each to see which Prisma accessors are already stubbed.
15. `backend/src/docs/openapi.ts` (405 lines) — `components.schemas` (12–82) and `paths` (83–403). `paths['/health']` (84–114) shows the `parameters` array shape; `paths['/interactions']` (269–318) shows the `requestBody` shape. Task 9 adds `components.securitySchemes` — a **sibling of `schemas` inside `components`**, not inside it.
16. `backend/src/tests/openapi.spec.ts` (37 lines) — asserts specific `paths[...]` and `components.schemas[...]` keys exist. Extend it the same way.
17. `git show 988127f:backend/src/middleware/auth.middleware.ts` — the historical `authenticate`. Reuse its **structure** (Bearer prefix check, `jwt.verify`, `TokenExpiredError` special case, `declare global` augmentation of `Express.Request`) but **not** its error handling: it wrote `res.status(401).json({ success, message })` inline and read `process.env.JWT_SECRET` directly with a module-level `throw`. This story routes errors through `AppError` and reads the validated `env` object instead.
18. `git show 988127f:backend/src/services/auth.service.ts` and `git show 988127f:backend/src/controllers/auth.controller.ts` — the historical login flow (`findUnique` by email → `bcrypt.compare` → `jwt.sign`). Same sequence, but as plain functions on the shared `prisma` client, with a real Zod-validated body and no `'fallback-secret-do-not-use'` default.
19. `backend/tsconfig.json` (19 lines) — `"strict"`, `"noUnusedLocals"`, and `"noUnusedParameters"` are all on. Unused middleware parameters must be `_`-prefixed (see `backend/src/controllers/health.controller.ts:13`, `_req`).

---

## Backend Tasks

### 1 — Environment configuration

**File: `backend/src/config/env.ts`**

Add two fields to `envSchema` (currently lines 6–17), after `CORS_ORIGIN`:

```ts
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters — generate one with `openssl rand -base64 48`'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().positive().default(28800),
```

`JWT_EXPIRES_IN_SECONDS` is a **number of seconds** (default `28800` = 8 hours), deliberately not a duration string. `@types/jsonwebtoken` types `SignOptions.expiresIn` as `number | StringValue`, and a plain `string` read from `process.env` does not satisfy `StringValue` — a numeric env field keeps `signAuthToken` (task 3) free of casts.

`JWT_SECRET` has **no default**. A fallback secret is what the historical `auth.service.ts` did (`'fallback-secret-do-not-use'`) and it is exactly the failure mode "Authentication is handled securely" forbids: a deploy that silently signs tokens anyone can forge. With no default, a missing secret trips the existing `process.exit(1)` path at lines 23–28.

**File: `backend/.env.example`**

Append:

```dotenv
# Auth — JWT signing secret. REQUIRED, minimum 32 characters.
# Generate a fresh one per environment: openssl rand -base64 48
JWT_SECRET="change-me-to-a-random-48-byte-base64-string-min-32-chars"
# Access-token lifetime in seconds. Default 28800 (8 hours).
JWT_EXPIRES_IN_SECONDS=28800
```

Then add the same `JWT_SECRET` line to your local `backend/.env`. **Never commit `backend/.env`.**

**File: `backend/src/tests/setup.ts`**

Append a third line, following the existing `??=` idiom:

```ts
process.env.JWT_SECRET ??= 'test-only-jwt-secret-at-least-32-characters-long';
```

**This edit must land in the same commit as the `env.ts` edit.** Without it, `env.ts` fails validation at import time and calls `process.exit(1)`, so every Jest suite in the repository dies before its first assertion.

### 2 — Auth context and JWT helpers

**Create file: `backend/src/auth/jwt.ts`**

```ts
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { Permission } from './permissions';
import type { RoleKey } from './roles';

/**
 * The JWT payload — also the request-scoped auth context. Permissions are baked into
 * the token at login so `requirePermission` needs no database round-trip per request.
 * The trade-off: a permission change takes effect on the user's next login, not
 * immediately. See `## Edge Cases & Failure Modes`.
 */
export interface AuthTokenPayload {
  userId: number;
  email: string;
  roleKey: RoleKey;
  /** Set only for CUSTOMER-role users; scopes them to their own records. */
  customerId: number | null;
  permissions: Permission[];
}

export const signAuthToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN_SECONDS });

export const verifyAuthToken = (token: string): AuthTokenPayload =>
  jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
```

The payload carries **no password hash and no mutable profile data** — only what authorisation decisions need.

### 3 — Authentication and authorisation middleware

**Create file: `backend/src/middleware/auth.middleware.ts`**

```ts
import { NextFunction, Request, RequestHandler, Response } from 'express';
import { verifyAuthToken } from '../auth/jwt';
import type { AuthTokenPayload } from '../auth/jwt';
import type { Permission } from '../auth/permissions';
import { AppError } from '../utils/AppError';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('Authorization');
  if (!header || !header.startsWith(BEARER_PREFIX)) {
    next(new AppError(401, 'Access denied. Missing or invalid Authorization header.'));
    return;
  }

  const token = header.slice(BEARER_PREFIX.length).trim();
  if (token.length === 0) {
    next(new AppError(401, 'Access denied. Token missing.'));
    return;
  }

  try {
    req.auth = verifyAuthToken(token);
  } catch (error) {
    const expired = error instanceof Error && error.name === 'TokenExpiredError';
    next(new AppError(401, expired ? 'Token expired' : 'Invalid token'));
    return;
  }

  next();
};

export const requirePermission =
  (...required: Permission[]): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const auth = req.auth;
    if (!auth) {
      next(new AppError(401, 'Not authenticated'));
      return;
    }

    const missing = required.filter((permission) => !auth.permissions.includes(permission));
    if (missing.length > 0) {
      next(new AppError(403, 'Forbidden: insufficient permissions', { missing }));
      return;
    }

    next();
  };

/** Narrow `req.auth` for controllers that run behind `authenticate`. */
export const getAuth = (req: Request): AuthTokenPayload => {
  if (!req.auth) throw new AppError(401, 'Not authenticated');
  return req.auth;
};
```

`requirePermission` takes a **variadic** list and requires **all** of them (`missing.length > 0` fails). The `403` carries `details: { missing }`, which `globalErrorHandler` passes through for `status < 500` (`backend/src/middleware/error.middleware.ts:18`) — that is what makes a permission failure debuggable from the response alone.

`getAuth` exists because `req.auth` is optional in the type (the augmentation cannot know a route is behind `authenticate`), and every controller behind `authenticate` would otherwise need its own non-null assertion.

### 4 — Customer-ownership scoping

**Create file: `backend/src/auth/scope.ts`**

```ts
import type { AuthTokenPayload } from './jwt';
import { AppError } from '../utils/AppError';

/** True when this token belongs to an external customer rather than a staff user. */
export const isCustomerScoped = (auth: AuthTokenPayload): boolean => auth.roleKey === 'CUSTOMER';

/**
 * Deny a CUSTOMER-role user access to another customer's records. Staff roles pass through.
 * A CUSTOMER-role user with no linked `customerId` is denied outright — the schema allows
 * that combination (Story 07 task 6) but it can never own anything.
 */
export const assertCustomerScope = (auth: AuthTokenPayload, customerId: number): void => {
  if (!isCustomerScoped(auth)) return;
  if (auth.customerId === null) {
    throw new AppError(403, 'This account is not linked to a customer record');
  }
  if (auth.customerId !== customerId) {
    throw new AppError(403, 'You can only access your own records');
  }
};

/** The customerId a list query must be forced to, or `undefined` for staff (no restriction). */
export const scopedCustomerId = (auth: AuthTokenPayload): number | undefined =>
  isCustomerScoped(auth) ? (auth.customerId ?? -1) : undefined;
```

`scopedCustomerId` returns `-1` for a customer-scoped token with no linked customer: a list query filtered on a non-existent id returns an empty array, which is the correct fail-closed answer for a list endpoint (throwing `403` from a list is a worse experience and leaks that the account is misconfigured).

### 5 — Auth service, controller, and routes

**Create file: `backend/src/services/auth.service.ts`**

```ts
import { signAuthToken } from '../auth/jwt';
import type { AuthTokenPayload } from '../auth/jwt';
import type { Permission } from '../auth/permissions';
import { verifyPassword } from '../auth/password';
import type { RoleKey } from '../auth/roles';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

/** Everything the frontend needs about the signed-in user. Never includes `passwordHash`. */
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  roleKey: RoleKey;
  roleName: string;
  permissions: Permission[];
  customerId: number | null;
  department: { id: number; name: string } | null;
  branch: { id: number; name: string; code: string } | null;
}

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
  department: true,
  branch: true
} as const;

type UserWithRelations = Awaited<
  ReturnType<typeof prisma.user.findUniqueOrThrow<{ include: typeof userInclude }>>
>;

export const toAuthUser = (user: UserWithRelations): AuthUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  isActive: user.isActive,
  roleKey: user.role.key as RoleKey,
  roleName: user.role.name,
  permissions: user.role.permissions.map((link) => link.permission.key as Permission),
  customerId: user.customerId,
  department: user.department ? { id: user.department.id, name: user.department.name } : null,
  branch: user.branch
    ? { id: user.branch.id, name: user.branch.name, code: user.branch.code }
    : null
});

export const login = async (
  email: string,
  password: string
): Promise<{ token: string; user: AuthUser }> => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: userInclude
  });

  // Same message and same code path for "no such user" and "wrong password" so the
  // response cannot be used to enumerate valid e-mail addresses.
  if (!user) throw new AppError(401, 'Invalid email or password');

  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) throw new AppError(401, 'Invalid email or password');

  if (!user.isActive) throw new AppError(403, 'This account has been deactivated');

  const authUser = toAuthUser(user);
  const payload: AuthTokenPayload = {
    userId: authUser.id,
    email: authUser.email,
    roleKey: authUser.roleKey,
    customerId: authUser.customerId,
    permissions: authUser.permissions
  };

  return { token: signAuthToken(payload), user: authUser };
};

export const getAuthUserById = async (userId: number): Promise<AuthUser> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: userInclude });
  if (!user) throw new AppError(404, `User ${userId} not found`);
  return toAuthUser(user);
};
```

Notes:

- The `isActive` check runs **after** password verification on purpose: a deactivated user learns their account is disabled only if they present the right credentials, so the endpoint still cannot be used to probe which accounts exist.
- `email.toLowerCase()` pairs with task 6's `z.string().email().toLowerCase()` on user creation, so `users.email` is always stored and looked up lowercase. `users.email` has a plain `@unique` index (Story 07 task 6), which is case-**sensitive** in PostgreSQL — normalising in application code is what prevents `Admin@crm.local` and `admin@crm.local` from becoming two accounts.
- If `UserWithRelations` fails to typecheck against the generated client, replace it with the explicit `Prisma.UserGetPayload<{ include: typeof userInclude }>` form after reading the actual exports in `backend/src/generated/prisma/models.ts` — the generated helper names are only knowable from that file.

**Create file: `backend/src/controllers/auth.controller.ts`**

```ts
import { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.middleware';
import { getAuthUserById, login } from '../services/auth.service';
import { ok } from '../utils/apiResponse';

export const loginHandler = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email: string; password: string };
  const result = await login(email, password);
  res.json(ok(result, 'Login successful'));
};

export const logoutHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(null, 'Logout successful'));
};

export const meHandler = async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  const user = await getAuthUserById(auth.userId);
  res.json(ok(user));
};
```

**Create file: `backend/src/routes/auth.routes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { loginHandler, logoutHandler, meHandler } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const loginSchema = z
  .object({
    email: z.string().email().toLowerCase(),
    password: z.string().min(1)
  })
  .strict();

const router = Router();

router.post('/login', validate({ body: loginSchema }), loginHandler);
router.post('/logout', logoutHandler);
router.get('/me', authenticate, meHandler);

export default router;
```

`POST /api/auth/logout` is **stateless**: the JWT is self-contained, so the server has nothing to invalidate. The endpoint returns `200` unconditionally (it is not behind `authenticate`, so logging out with an already-expired token still succeeds) and the client's job is to discard the token — which Story 09's auth store does. The consequence is spelled out in `## Edge Cases & Failure Modes`; a token denylist is deliberately not built, because it needs shared server-side state this single-process demo does not have.

`/me` mounts `authenticate` **per route** rather than relying on the router-level guard, because `/api/auth` is mounted *before* the global `authenticate` in task 10.

### 6 — User management service, controller, and routes

**Create file: `backend/src/services/user.service.ts`**

```ts
import { hashPassword } from '../auth/password';
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';
import { toAuthUser } from './auth.service';
import type { AuthUser } from './auth.service';

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  roleId: number;
  departmentId?: number;
  branchId?: number;
  customerId?: number;
}

export interface UpdateUserInput {
  name?: string;
  roleId?: number;
  departmentId?: number | null;
  branchId?: number | null;
  customerId?: number | null;
  isActive?: boolean;
}

const userInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
  department: true,
  branch: true
} as const;

const findUserOrThrow = async (id: number) => {
  const user = await prisma.user.findUnique({ where: { id }, include: userInclude });
  if (!user) throw new AppError(404, `User ${id} not found`);
  return user;
};

const assertReferencesExist = async (input: {
  roleId?: number;
  departmentId?: number | null;
  branchId?: number | null;
  customerId?: number | null;
}): Promise<void> => {
  if (input.roleId !== undefined) {
    const role = await prisma.role.findUnique({ where: { id: input.roleId } });
    if (!role) throw new AppError(400, `Role ${input.roleId} does not exist`);
  }
  if (input.departmentId !== undefined && input.departmentId !== null) {
    const department = await prisma.department.findUnique({ where: { id: input.departmentId } });
    if (!department) throw new AppError(400, `Department ${input.departmentId} does not exist`);
  }
  if (input.branchId !== undefined && input.branchId !== null) {
    const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
    if (!branch) throw new AppError(400, `Branch ${input.branchId} does not exist`);
  }
  if (input.customerId !== undefined && input.customerId !== null) {
    const customer = await prisma.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new AppError(400, `Customer ${input.customerId} does not exist`);
  }
};

export const listUsers = async (): Promise<AuthUser[]> => {
  const users = await prisma.user.findMany({ include: userInclude, orderBy: { name: 'asc' } });
  return users.map(toAuthUser);
};

export const getUserById = async (id: number): Promise<AuthUser> => toAuthUser(await findUserOrThrow(id));

export const createUser = async (input: CreateUserInput): Promise<AuthUser> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, `A user with email ${input.email} already exists`);

  await assertReferencesExist(input);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      roleId: input.roleId,
      departmentId: input.departmentId ?? null,
      branchId: input.branchId ?? null,
      customerId: input.customerId ?? null
    },
    include: userInclude
  });

  return toAuthUser(user);
};

export const updateUser = async (id: number, input: UpdateUserInput): Promise<AuthUser> => {
  await findUserOrThrow(id);
  await assertReferencesExist(input);

  const user = await prisma.user.update({ where: { id }, data: input, include: userInclude });
  return toAuthUser(user);
};

export const changeUserPassword = async (id: number, newPassword: string): Promise<void> => {
  await findUserOrThrow(id);
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(newPassword) } });
};

/**
 * Soft delete. Two guards: an administrator cannot lock themselves out, and the last
 * active SYSTEM_ADMINISTRATOR cannot be removed — otherwise no account can ever manage
 * users again and the only recovery is a reseed.
 */
export const deactivateUser = async (id: number, actingUserId: number): Promise<AuthUser> => {
  if (id === actingUserId) throw new AppError(400, 'You cannot deactivate your own account');

  const user = await findUserOrThrow(id);

  if (user.role.key === 'SYSTEM_ADMINISTRATOR') {
    const remainingAdmins = await prisma.user.count({
      where: { isActive: true, role: { key: 'SYSTEM_ADMINISTRATOR' }, id: { not: id } }
    });
    if (remainingAdmins === 0) {
      throw new AppError(400, 'Cannot deactivate the last active System Administrator');
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    include: userInclude
  });
  return toAuthUser(updated);
};
```

**Create file: `backend/src/controllers/user.controller.ts`**

```ts
import { Request, Response } from 'express';
import { getAuth } from '../middleware/auth.middleware';
import {
  changeUserPassword,
  createUser,
  deactivateUser,
  getUserById,
  listUsers,
  updateUser
} from '../services/user.service';
import { ok } from '../utils/apiResponse';

export const listUsersHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listUsers()));
};

export const getUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await getUserById(id)));
};

export const createUserHandler = async (req: Request, res: Response): Promise<void> => {
  const user = await createUser(req.body);
  res.status(201).json(ok(user, 'User created'));
};

export const updateUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  res.json(ok(await updateUser(id, req.body), 'User updated'));
};

export const changeUserPasswordHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { password } = req.body as { password: string };
  await changeUserPassword(id, password);
  res.json(ok(null, 'Password updated'));
};

export const deactivateUserHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const auth = getAuth(req);
  res.json(ok(await deactivateUser(id, auth.userId), 'User deactivated'));
};
```

**Create file: `backend/src/routes/user.routes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import {
  changeUserPasswordHandler,
  createUserHandler,
  deactivateUserHandler,
  getUserHandler,
  listUsersHandler,
  updateUserHandler
} from '../controllers/user.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
const optionalId = z.coerce.number().int().positive();

const createUserSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().toLowerCase(),
    password: passwordSchema,
    roleId: optionalId,
    departmentId: optionalId.optional(),
    branchId: optionalId.optional(),
    customerId: optionalId.optional()
  })
  .strict();

const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    roleId: optionalId.optional(),
    departmentId: optionalId.nullable().optional(),
    branchId: optionalId.nullable().optional(),
    customerId: optionalId.nullable().optional(),
    isActive: z.boolean().optional()
  })
  .strict();

const changePasswordSchema = z.object({ password: passwordSchema }).strict();

const router = Router();

router.get('/', requirePermission('users:read'), listUsersHandler);
router.get('/:id', requirePermission('users:read'), validate({ params: idParamSchema }), getUserHandler);
router.post('/', requirePermission('users:manage'), validate({ body: createUserSchema }), createUserHandler);
router.patch(
  '/:id',
  requirePermission('users:manage'),
  validate({ params: idParamSchema, body: updateUserSchema }),
  updateUserHandler
);
router.patch(
  '/:id/password',
  requirePermission('users:manage'),
  validate({ params: idParamSchema, body: changePasswordSchema }),
  changeUserPasswordHandler
);
router.delete(
  '/:id',
  requirePermission('users:manage'),
  validate({ params: idParamSchema }),
  deactivateUserHandler
);

export default router;
```

`updateUserSchema` deliberately has **no `email` and no `password`** field. E-mail is the login identity and the `@unique` key — changing it is a separate concern with its own uniqueness handling, and password changes go through the dedicated `PATCH /:id/password` route so the `AuthUser` DTO never has to carry a credential. Both are documented follow-ups, not omissions.

`DELETE /api/users/:id` performs a **soft** delete (`isActive: false`), matching the `isActive` column from Story 07 task 6. Nothing in this codebase hard-deletes a user.

### 7 — Roles and permissions endpoints

**Create file: `backend/src/services/role.service.ts`**

```ts
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listRoles = async () => {
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { id: 'asc' }
  });

  return roles.map((role) => ({
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map((link) => link.permission.key)
  }));
};

export const listPermissions = () =>
  prisma.permission.findMany({ orderBy: { key: 'asc' } });

/** Replaces a role's permission set wholesale — the request body is the new complete list. */
export const setRolePermissions = async (roleId: number, permissionKeys: string[]) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw new AppError(404, `Role ${roleId} not found`);

  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });
  const found = new Set(permissions.map((permission) => permission.key));
  const unknown = permissionKeys.filter((key) => !found.has(key));
  if (unknown.length > 0) {
    throw new AppError(400, 'Unknown permission keys', { unknown });
  }

  // The System Administrator role must keep the permissions that let it recover from a
  // bad edit; without this guard an administrator can permanently lock every account out
  // of user and role management, recoverable only by reseeding.
  if (role.key === 'SYSTEM_ADMINISTRATOR') {
    const required = ['users:manage', 'roles:manage'];
    const stripped = required.filter((key) => !found.has(key));
    if (stripped.length > 0) {
      throw new AppError(400, 'The System Administrator role cannot lose these permissions', {
        stripped
      });
    }
  }

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId, permissionId: permission.id }))
  });

  return listRoles().then((roles) => roles.find((entry) => entry.id === roleId));
};
```

**Create file: `backend/src/controllers/role.controller.ts`**

```ts
import { Request, Response } from 'express';
import { listPermissions, listRoles, setRolePermissions } from '../services/role.service';
import { ok } from '../utils/apiResponse';

export const listRolesHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listRoles()));
};

export const listPermissionsHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json(ok(await listPermissions()));
};

export const setRolePermissionsHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const { permissions } = req.body as { permissions: string[] };
  res.json(ok(await setRolePermissions(id, permissions), 'Role permissions updated'));
};
```

**Create file: `backend/src/routes/role.routes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '../auth/permissions';
import { listRolesHandler, setRolePermissionsHandler } from '../controllers/role.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const setPermissionsSchema = z
  .object({ permissions: z.array(z.enum(PERMISSIONS)).min(1) })
  .strict();

const router = Router();

router.get('/', requirePermission('roles:read'), listRolesHandler);
router.put(
  '/:id/permissions',
  requirePermission('roles:manage'),
  validate({ params: idParamSchema, body: setPermissionsSchema }),
  setRolePermissionsHandler
);

export default router;
```

**Create file: `backend/src/routes/permission.routes.ts`**

```ts
import { Router } from 'express';
import { listPermissionsHandler } from '../controllers/role.controller';
import { requirePermission } from '../middleware/auth.middleware';

const router = Router();

router.get('/', requirePermission('roles:read'), listPermissionsHandler);

export default router;
```

`/api/permissions` is its own router rather than a `GET /roles/permissions` route: `role.routes.ts` validates `:id` with `idParamSchema` (`z.coerce.number()`), so a literal `/roles/permissions` path would have to be registered before `/:id/…` to avoid a `400` — a mount-order dependency not worth introducing for one read endpoint.

`z.enum(PERMISSIONS)` on the request body means an unknown permission key is rejected with `400` by `validate` before `setRolePermissions` runs; the `unknown` check inside the service is the second line of defence for keys that exist in the tuple but were never seeded.

### 8 — Departments and branches endpoints

**Create file: `backend/src/services/orgUnit.service.ts`**

```ts
import { prisma } from '../db/prisma';
import { AppError } from '../utils/AppError';

export const listBranches = () => prisma.branch.findMany({ orderBy: { name: 'asc' } });

export const createBranch = async (input: { name: string; code: string }) => {
  const existing = await prisma.branch.findFirst({
    where: { OR: [{ name: input.name }, { code: input.code }] }
  });
  if (existing) throw new AppError(409, 'A branch with that name or code already exists');
  return prisma.branch.create({ data: input });
};

export const listDepartments = (branchId?: number) =>
  prisma.department.findMany({
    where: branchId === undefined ? undefined : { branchId },
    include: { branch: true },
    orderBy: [{ branchId: 'asc' }, { name: 'asc' }]
  });

export const createDepartment = async (input: { name: string; branchId: number }) => {
  const branch = await prisma.branch.findUnique({ where: { id: input.branchId } });
  if (!branch) throw new AppError(400, `Branch ${input.branchId} does not exist`);

  const existing = await prisma.department.findUnique({
    where: { branchId_name: { branchId: input.branchId, name: input.name } }
  });
  if (existing) throw new AppError(409, `${branch.name} already has a "${input.name}" department`);

  return prisma.department.create({ data: input, include: { branch: true } });
};
```

**Create file: `backend/src/controllers/orgUnit.controller.ts`** — four thin handlers (`listBranchesHandler`, `createBranchHandler`, `listDepartmentsHandler`, `createDepartmentHandler`) following the exact shape of `backend/src/controllers/ticket.controller.ts`: read `req.params` / `req.query` / `req.body` with the `as unknown as { … }` cast, call the service, `res.json(ok(...))`, and `res.status(201).json(ok(..., 'Branch created'))` / `'Department created'` for the two `POST`s. No try/catch.

**Create file: `backend/src/routes/branch.routes.ts`**

```ts
import { Router } from 'express';
import { z } from 'zod';
import { createBranchHandler, listBranchesHandler } from '../controllers/orgUnit.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';

const createBranchSchema = z
  .object({ name: z.string().min(1), code: z.string().min(1).max(10) })
  .strict();

const router = Router();

router.get('/', requirePermission('orgunits:read'), listBranchesHandler);
router.post(
  '/',
  requirePermission('orgunits:manage'),
  validate({ body: createBranchSchema }),
  createBranchHandler
);

export default router;
```

**Create file: `backend/src/routes/department.routes.ts`** — same shape: `GET /` behind `orgunits:read` with `validate({ query: z.object({ branchId: z.coerce.number().int().positive().optional() }).strict() })`, and `POST /` behind `orgunits:manage` with `validate({ body: z.object({ name: z.string().min(1), branchId: z.coerce.number().int().positive() }).strict() })`.

### 9 — OpenAPI documentation

**File: `backend/src/docs/openapi.ts`**

1. Add `securitySchemes` as a **sibling of `schemas` inside `components`** (i.e. immediately after the `schemas` object closes at line 81):

```ts
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
```

2. Add a document-level default so every path inherits it, as a new top-level key after `components` (before `paths`):

```ts
  security: [{ bearerAuth: [] }],
```

Then add `security: []` to the `get` object of `paths['/health']` (line 85), `paths['/health/db']` (line 116), and to `post` on `/auth/login` and `/auth/logout` — an empty array is how OpenAPI 3 marks a path as public despite the document default.

3. Add to `components.schemas`, following the existing flat `type: 'object'` + `properties` + `required` shape used by `Customer` (33–43):
   - `AuthUser` — `id`, `name`, `email`, `isActive`, `roleKey` (enum of the six `ROLES` values), `roleName`, `permissions` (`array` of `string`), `customerId` (nullable integer), `department` (nullable object with `id`, `name`), `branch` (nullable object with `id`, `name`, `code`).
   - `LoginResult` — `token` (string), `user` (`$ref` `#/components/schemas/AuthUser`).
   - `Role` — `id`, `key`, `name`, `description` (nullable), `permissions` (array of string).
   - `Permission` — `id`, `key`, `description`.
   - `Branch` — `id`, `name`, `code`, `createdAt`.
   - `Department` — `id`, `name`, `branchId`, `createdAt`.

4. Add to `paths`:

| Path | Method | Auth | Responses |
|---|---|---|---|
| `/auth/login` | `post` | public (`security: []`) | `200` `LoginResult`, `400` validation, `401` bad credentials, `403` deactivated |
| `/auth/logout` | `post` | public (`security: []`) | `200` |
| `/auth/me` | `get` | bearer | `200` `AuthUser`, `401` |
| `/users` | `get` | `users:read` | `200` `AuthUser[]`, `401`, `403` |
| `/users` | `post` | `users:manage` | `201` `AuthUser`, `400`, `401`, `403`, `409` duplicate e-mail |
| `/users/{id}` | `get` | `users:read` | `200`, `401`, `403`, `404` |
| `/users/{id}` | `patch` | `users:manage` | `200`, `400`, `401`, `403`, `404` |
| `/users/{id}/password` | `patch` | `users:manage` | `200`, `400`, `401`, `403`, `404` |
| `/users/{id}` | `delete` | `users:manage` | `200`, `400` self/last-admin guard, `401`, `403`, `404` |
| `/roles` | `get` | `roles:read` | `200` `Role[]`, `401`, `403` |
| `/roles/{id}/permissions` | `put` | `roles:manage` | `200` `Role`, `400`, `401`, `403`, `404` |
| `/permissions` | `get` | `roles:read` | `200` `Permission[]`, `401`, `403` |
| `/branches` | `get` / `post` | `orgunits:read` / `orgunits:manage` | `200` / `201`, `400`, `401`, `403`, `409` |
| `/departments` | `get` / `post` | `orgunits:read` / `orgunits:manage` | `200` / `201`, `400`, `401`, `403`, `409` |

5. Add a `401` and a `403` response to **every** existing entry under `paths` except `/health`, `/health/db`, `/auth/login`, and `/auth/logout` — `/customers`, `/customers/{id}/timeline`, `/tickets`, `/tickets/{id}`, `/tickets/{id}/timeline`, `/interactions`, `/interactions/{id}`, `/interactions/{id}/associate` are all protected as of task 10, and the document must say so. Each is `{ description: '…', content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } } }`, matching every other response in the file.

### 10 — Mount the routers and protect the existing ones

**File: `backend/src/routes/index.ts`**

Replace the whole file:

```ts
import { Router } from 'express';
import authRoutes from './auth.routes';
import branchRoutes from './branch.routes';
import customerRoutes from './customer.routes';
import departmentRoutes from './department.routes';
import healthRoutes from './health.routes';
import interactionRoutes from './interaction.routes';
import permissionRoutes from './permission.routes';
import roleRoutes from './role.routes';
import ticketRoutes from './ticket.routes';
import userRoutes from './user.routes';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// --- Public: liveness probes and the login endpoint itself. ---
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// --- Everything below this line requires a valid access token. ---
router.use(authenticate);

router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/permissions', permissionRoutes);
router.use('/branches', branchRoutes);
router.use('/departments', departmentRoutes);
router.use('/customers', customerRoutes);
router.use('/tickets', ticketRoutes);
router.use('/interactions', interactionRoutes);

export default router;
```

The bare `router.use(authenticate)` is the whole protection mechanism: **any** router mounted below it is protected by default, so a future resource cannot be left unauthenticated by forgetting a middleware. `/health` stays public so a load balancer or the frontend's health screen keeps working without credentials; `/auth` stays public because `/auth/login` must be reachable without a token (and `/auth/me` applies `authenticate` per-route in task 5).

`/api/docs` and `/api/docs.json` are mounted directly on `app` (`backend/src/app.ts:25-28`), not through this router, so they remain public. That is intentional for the demo.

### 11 — Add permission checks and customer scoping to the existing routes

**File: `backend/src/routes/customer.routes.ts`**

```ts
import { Router } from 'express';
import { getCustomerTimelineHandler, listCustomersHandler } from '../controllers/customer.controller';
import { requirePermission } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { idParamSchema } from '../schemas/idParam.schema';

const router = Router();

router.get('/', requirePermission('customers:read'), listCustomersHandler);
router.get(
  '/:id/timeline',
  requirePermission('interactions:read'),
  validate({ params: idParamSchema }),
  getCustomerTimelineHandler
);

export default router;
```

`GET /customers/:id/timeline` requires `interactions:read`, **not** `customers:read` — a `CUSTOMER`-role user must be able to read their own timeline but must never be able to list other customers. That asymmetry is the point of the role design in Story 07 task 4.

**File: `backend/src/controllers/customer.controller.ts`**

In `getCustomerTimelineHandler`, scope the request before calling the service:

```ts
import { getAuth } from '../middleware/auth.middleware';
import { assertCustomerScope } from '../auth/scope';

export const getCustomerTimelineHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  assertCustomerScope(getAuth(req), id);
  const timeline = await getCustomerTimeline(id);
  res.json(ok(timeline));
};
```

Leave `listCustomersHandler` unchanged — no `CUSTOMER`-role user can reach it (no `customers:read`).

**File: `backend/src/routes/ticket.routes.ts`** — add `requirePermission('tickets:read')` as the first middleware on all three routes, before the existing `validate(...)`.

**File: `backend/src/controllers/ticket.controller.ts`** — force the list filter and scope the two `:id` reads:

```ts
import { getAuth } from '../middleware/auth.middleware';
import { assertCustomerScope, scopedCustomerId } from '../auth/scope';

export const listTicketsHandler = async (req: Request, res: Response): Promise<void> => {
  const { customerId } = req.query as unknown as { customerId?: number };
  const auth = getAuth(req);
  // A customer-scoped token ignores the query param entirely — it can only ever
  // see its own tickets, whatever it asks for.
  const scoped = scopedCustomerId(auth);
  const tickets = await listTickets(scoped ?? customerId);
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
```

`getTicketTimelineHandler` now calls `getTicketById` before `getTicketTimeline` so the ownership check has a `customerId` to compare against. `getTicketTimeline` already re-checks the ticket exists (`backend/src/services/ticket.service.ts`), so the extra query is one redundant `findUnique` on a small table — accepted in exchange for keeping the scope check in the controller layer where every other auth decision lives.

**File: `backend/src/routes/interaction.routes.ts`** — add, before the existing `validate(...)` on each route:

- `router.post('/', requirePermission('interactions:create'), validate({ body: createInteractionSchema }), createInteractionHandler);`
- `router.get('/:id', requirePermission('interactions:read'), validate({ params: idParamSchema }), getInteractionHandler);`
- `router.patch('/:id/associate', requirePermission('interactions:associate'), validate({ params: idParamSchema, body: associateInteractionSchema }), associateInteractionHandler);`

Leave both Zod schemas exactly as they are.

**File: `backend/src/controllers/interaction.controller.ts`**

```ts
export const createInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  assertCustomerScope(getAuth(req), req.body.customerId);
  const interaction = await createInteraction(req.body);
  res.status(201).json(ok(interaction, 'Interaction stored'));
};

export const getInteractionHandler = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as unknown as { id: number };
  const interaction = await getInteractionById(id);
  assertCustomerScope(getAuth(req), interaction.customerId);
  res.json(ok(interaction));
};
```

`associateInteractionHandler` needs no scope check: `interactions:associate` is not granted to `CUSTOMER` (Story 07 task 4), so a customer-scoped token cannot reach it — the `403` comes from `requirePermission` first.

### 12 — Update the existing test suites

**Create file: `backend/src/tests/authTestHelper.ts`**

Jest's `testMatch` is `['**/tests/**/*.spec.ts']` (`backend/jest.config.ts:7`), so a non-`.spec.ts` file in `src/tests/` is a plain module, not a suite.

```ts
import { signAuthToken } from '../auth/jwt';
import { PERMISSIONS } from '../auth/permissions';
import type { AuthTokenPayload } from '../auth/jwt';

const ADMIN_PAYLOAD: AuthTokenPayload = {
  userId: 1,
  email: 'admin@crm.local',
  roleKey: 'SYSTEM_ADMINISTRATOR',
  customerId: null,
  permissions: [...PERMISSIONS]
};

/** `Authorization` header value for a full-permission staff token, unless overridden. */
export const bearer = (overrides: Partial<AuthTokenPayload> = {}): string =>
  `Bearer ${signAuthToken({ ...ADMIN_PAYLOAD, ...overrides })}`;
```

**Files: `backend/src/tests/customer.spec.ts`, `backend/src/tests/ticket.spec.ts`, `backend/src/tests/interaction.spec.ts`**

Add `.set('Authorization', bearer())` to **every** `request(app)` chain in all three files. For example, in `customer.spec.ts` line 21:

```ts
const res = await request(app).get('/api/customers').set('Authorization', bearer());
```

Everything else in those three suites — the `jest.mock('../db/prisma', …)` factories, the assertions, the `prisma` call-argument expectations — stays unchanged. The three files' `jest.mock` blocks must **not** need new accessors: `authenticate` verifies the token in memory and never queries the database, which is exactly why the permissions live in the JWT payload.

`backend/src/tests/interaction.service.spec.ts`, `channels.spec.ts`, `health*.spec.ts`, `error.middleware.spec.ts`, `auth.rbac.spec.ts`, and `password.spec.ts` need **no changes** — none of them go through the router.

---

## Edge Cases & Failure Modes

- **Missing `JWT_SECRET`.** `env.ts` (task 1) fails Zod validation and the existing handler at lines 23–28 prints the field errors and calls `process.exit(1)`. In Jest this manifests as every suite dying with no assertion output — which is why `backend/src/tests/setup.ts` sets a test secret in the same change. If the whole test run goes silent after task 1, check that edit first.
- **`JWT_SECRET` shorter than 32 characters.** Rejected by `.min(32)` (task 1) with an actionable message rather than accepted as a weak key.
- **Logout does not invalidate the token.** The JWT is stateless, so a token stolen before logout stays valid until `JWT_EXPIRES_IN_SECONDS` elapses (default 8 hours). Mitigations chosen: a short-ish default lifetime and a client that discards the token (Story 09). Mitigation **not** chosen: a server-side denylist, which needs shared state this single-process demo has none of. This is the single most important known limitation of the design — do not describe logout as revocation.
- **A permission or role change does not affect an already-issued token.** `requirePermission` reads `auth.permissions` from the JWT (task 3), not the database, so a user demoted through `PUT /api/roles/:id/permissions` or `PATCH /api/users/:id` keeps their old permissions until their token expires or they log in again. This is the deliberate trade-off for a zero-query authorisation check; `GET /api/auth/me` re-reads from the database, so the frontend always shows the *current* role even while the token carries the old one.
- **A user deactivated while holding a valid token.** Same mechanism: `authenticate` does not check `isActive`, so the token keeps working until it expires. `login` (task 5) rejects the next sign-in with `403`. Flagged rather than solved for the same reason as revocation.
- **`CUSTOMER`-role user with `customerId: null`.** `assertCustomerScope` (task 4) throws `403 'This account is not linked to a customer record'`; `scopedCustomerId` returns `-1` so list queries come back empty instead of leaking every ticket. The database allows this combination (Story 07 task 6) because a Prisma conditional-required constraint does not exist — the API layer is the only enforcement point.
- **`CUSTOMER`-role user requests another customer's timeline.** `GET /api/customers/5/timeline` with a token carrying `customerId: 1` → `403` from `assertCustomerScope` in `getCustomerTimelineHandler` (task 11) — **not** `404`, so the response does not confirm whether customer 5 exists.
- **`CUSTOMER`-role user passes `?customerId=5` to `GET /api/tickets`.** `listTicketsHandler` (task 11) discards the query value entirely via `scopedCustomerId(auth) ?? customerId` — a customer-scoped token can never widen its own filter.
- **Login with a valid e-mail and wrong password vs. an unknown e-mail.** Both return the identical `401 'Invalid email or password'` via the same code path (task 5), so the endpoint cannot be used to enumerate accounts. Do not "improve" either message.
- **Login with a mixed-case e-mail.** `loginSchema` applies `.toLowerCase()` (task 5) and `login` lowercases again before the query, matching the lowercase-normalised `email` written by `createUserSchema`. `users.email` is a case-sensitive PostgreSQL unique index, so this normalisation is what prevents duplicate accounts.
- **Creating a user with an e-mail that already exists.** `createUser` (task 6) pre-checks and throws `409` with a clear message rather than letting the Prisma unique-constraint violation surface as an unmasked `500`.
- **Creating a user with a nonexistent `roleId` / `departmentId` / `branchId` / `customerId`.** `assertReferencesExist` (task 6) throws `400` per field before the insert, so the client gets a named field instead of a foreign-key error.
- **Administrator deactivating their own account.** `deactivateUser` (task 6) throws `400 'You cannot deactivate your own account'` by comparing `id` with `getAuth(req).userId`.
- **Deactivating the last active System Administrator.** `deactivateUser` counts other active admins and throws `400` when the count is zero — otherwise no account can manage users again and the only recovery is `npm run db:seed`.
- **Stripping `users:manage` or `roles:manage` from the `SYSTEM_ADMINISTRATOR` role.** `setRolePermissions` (task 7) throws `400` with `details.stripped`. Same lock-out reasoning; the guard is keyed on `role.key`, not `role.id`, so it survives a reseed.
- **`PUT /api/roles/:id/permissions` with an empty array.** Rejected by `.min(1)` on the Zod array (task 7) — clearing every permission from a role is almost certainly a mistake, and the administrator guard would reject it for the admin role anyway.
- **`Authorization: Bearer` with nothing after it.** `authenticate` (task 3) trims and checks length, returning `401 'Access denied. Token missing.'` rather than passing an empty string to `jwt.verify`.
- **`Authorization` header using a different scheme (`Basic`, `token`).** Fails the `startsWith('Bearer ')` check → `401`. Only Bearer is supported.
- **Expired token.** `jwt.verify` throws `TokenExpiredError`; `authenticate` maps it to `401 'Token expired'` (a distinct message from `'Invalid token'`) so the frontend can tell "log in again" from "something is wrong".
- **A token signed with a different secret.** `jwt.verify` throws `JsonWebTokenError` → `401 'Invalid token'`. The message deliberately does not distinguish a forged signature from a malformed token.
- **Requesting a protected route with a valid token but no matching permission.** `requirePermission` returns `403` with `details.missing` listing the exact keys — enforced in `backend/src/middleware/auth.middleware.ts` and surfaced by `globalErrorHandler`'s `status < 500` details pass-through (`backend/src/middleware/error.middleware.ts:18`).
- **`/api/docs` and `/api/docs.json` are public.** They are mounted on `app` outside the router (`backend/src/app.ts:25-28`) and task 10 does not change that. The schema is not sensitive for this demo, but it is a deliberate choice, not an oversight.
- **The Communications screen breaks between Story 08 and Story 09.** `frontend/src/services/api.ts` sends no `Authorization` header, so every call it makes returns `401` after task 10. Expected and unavoidable given the split; Story 09 closes it.

---

## Test Plan

All backend tests live in `backend/src/tests/` and follow the `jest.mock('../db/prisma', () => ({ prisma: { … } }))`-before-imports pattern established by `backend/src/tests/customer.spec.ts:1-10`.

1. **Create `backend/src/tests/auth.middleware.spec.ts`** (unit, no Prisma, no Supertest — build fake `Request`/`Response`/`next` objects):
   - `authenticate` with no `Authorization` header calls `next` with an `AppError` whose `status` is `401`.
   - `authenticate` with `Authorization: Basic abc` → `401`.
   - `authenticate` with `Authorization: Bearer ` (empty token) → `401` and message `'Access denied. Token missing.'`.
   - `authenticate` with a token signed by `signAuthToken` sets `req.auth` to the same payload and calls `next()` with no argument.
   - `authenticate` with a garbage token → `401` `'Invalid token'`.
   - `authenticate` with an expired token (sign one with `jsonwebtoken` directly using `expiresIn: -1`) → `401` `'Token expired'`.
   - `requirePermission('users:manage')` with a payload containing that permission calls `next()`; without it calls `next` with a `403` whose `details.missing` is `['users:manage']`.
   - `requirePermission('users:read', 'users:manage')` with only one of the two → `403` listing only the missing key.
   - `requirePermission(...)` with `req.auth` undefined → `401`.
2. **Create `backend/src/tests/auth.spec.ts`** (Supertest, mocked Prisma with `user: { findUnique: jest.fn() }`):
   - `POST /api/auth/login` with a mocked user whose `passwordHash` is a real `await hashPassword('Passw0rd!')` → `200`, `res.body.data.token` is a non-empty string, `res.body.data.user.permissions` contains the mocked role's permission keys, and `res.body.data.user` has **no** `passwordHash` property.
   - `POST /api/auth/login` with `findUnique` → `null` → `401` and message `'Invalid email or password'`.
   - `POST /api/auth/login` with a real hash but the wrong password → `401` with the **same** message as the previous case.
   - `POST /api/auth/login` for a user with `isActive: false` and the correct password → `403`.
   - `POST /api/auth/login` with a malformed e-mail, a missing `password`, or an extra unknown field → `400` (`.strict()` schema).
   - `POST /api/auth/login` normalises the e-mail: posting `ADMIN@CRM.LOCAL` calls `prisma.user.findUnique` with `where: { email: 'admin@crm.local' }`.
   - `POST /api/auth/logout` with no header → `200`, `res.body.success` is `true`.
   - `GET /api/auth/me` with no header → `401`; with `bearer()` and a mocked `findUnique` → `200` and the `AuthUser` shape.
3. **Create `backend/src/tests/user.spec.ts`** (Supertest, mocked Prisma with `user`, `role`, `department`, `branch`, `customer` accessors):
   - `GET /api/users` with `bearer()` → `200`; with `bearer({ permissions: [] })` → `403` and `res.body.details.missing` contains `'users:read'`; with no header → `401`.
   - `POST /api/users` with `bearer()` and a valid body → `201`, and `prisma.user.create` is called with a `passwordHash` that is neither the plain password nor undefined.
   - `POST /api/users` with a duplicate e-mail (mocked `findUnique` resolving a user) → `409`.
   - `POST /api/users` with a nonexistent `roleId` (mocked `role.findUnique` → `null`) → `400`.
   - `POST /api/users` with a 7-character password → `400`.
   - `POST /api/users` with `bearer({ permissions: ['users:read'] })` → `403` (read is not manage).
   - `PATCH /api/users/:id` with `{ isActive: false }` → `200`; with `{ email: 'x@y.z' }` → `400` (`.strict()` rejects the unknown field).
   - `PATCH /api/users/:id/password` with a valid password → `200`, and `prisma.user.update` receives a `passwordHash`, never a `password`.
   - `DELETE /api/users/1` with `bearer({ userId: 1 })` → `400` (self-deactivation guard).
   - `DELETE /api/users/2` where the target is a `SYSTEM_ADMINISTRATOR` and `prisma.user.count` resolves `0` → `400`; where `count` resolves `1` → `200` with `data.isActive` false.
   - `GET /api/users/:id` for a missing user → `404`.
4. **Create `backend/src/tests/role.spec.ts`** (Supertest, mocked Prisma with `role`, `permission`, `rolePermission`):
   - `GET /api/roles` with `bearer()` → `200`, each entry has a `permissions` array of strings; with `bearer({ permissions: [] })` → `403`.
   - `GET /api/permissions` with `bearer()` → `200`; unauthenticated → `401`.
   - `PUT /api/roles/:id/permissions` with `{ permissions: ['tickets:read'] }` on a non-admin role → `200`, and `prisma.rolePermission.deleteMany` is called before `createMany`.
   - `PUT /api/roles/:id/permissions` with `{ permissions: ['not:a:permission'] }` → `400` (rejected by `z.enum(PERMISSIONS)`).
   - `PUT /api/roles/:id/permissions` with `{ permissions: [] }` → `400`.
   - `PUT /api/roles/:id/permissions` on the role whose `key` is `SYSTEM_ADMINISTRATOR`, omitting `users:manage` → `400` with `details.stripped`.
   - `PUT /api/roles/999/permissions` where `role.findUnique` → `null` → `404`.
5. **Create `backend/src/tests/orgUnit.spec.ts`** (Supertest, mocked Prisma with `branch`, `department`):
   - `GET /api/branches` with `bearer()` → `200`; with `bearer({ permissions: ['tickets:read'] })` → `403`.
   - `POST /api/branches` with a duplicate name/code (mocked `findFirst` resolving a row) → `409`.
   - `GET /api/departments?branchId=1` asserts `prisma.department.findMany` was called with `where: { branchId: 1 }`.
   - `POST /api/departments` with a nonexistent `branchId` → `400`; with a name already used in that branch (mocked `findUnique` resolving a row) → `409`.
6. **Create `backend/src/tests/scope.spec.ts`** (unit, no Prisma): `assertCustomerScope` returns silently for every non-`CUSTOMER` `roleKey`; throws `403` for a `CUSTOMER` token with `customerId: null`; throws `403` for a `CUSTOMER` token whose `customerId` differs from the argument; returns silently when they match. `scopedCustomerId` returns `undefined` for staff roles, the token's `customerId` for a linked customer, and `-1` for a `CUSTOMER` token with `customerId: null`.
7. **Create `backend/src/tests/rbac.integration.spec.ts`** (Supertest, mocked Prisma — the suite that proves "Roles and permissions are enforced" end to end). Use `bearer({ roleKey, customerId, permissions })` with the real `ROLE_PERMISSIONS` entries from `backend/src/auth/roles.ts` so the test data cannot drift from the seed:
   - `SUPPORT_AGENT` token: `POST /api/interactions` → `201`; `GET /api/users` → `403`.
   - `REPORTING_USER` token: `GET /api/customers` → `200`; `POST /api/interactions` → `403`; `PATCH /api/interactions/1/associate` → `403`.
   - `CUSTOMER` token with `customerId: 1`: `GET /api/customers` → `403`; `GET /api/customers/1/timeline` → `200`; `GET /api/customers/2/timeline` → `403`; `GET /api/tickets?customerId=2` → `200` but `prisma.ticket.findMany` was called with `where: { customerId: 1 }`.
   - `SYSTEM_ADMINISTRATOR` token: `GET /api/users`, `GET /api/roles`, and `GET /api/branches` all → `200`.
   - No header at all: `GET /api/customers`, `GET /api/tickets`, `GET /api/interactions/1`, and `GET /api/users` are **all** `401` (**"Protected APIs reject unauthorized requests"**).
   - `GET /api/health` and `GET /api/health/db` are still `200` with no header (public probes stay public).
8. **Modify `backend/src/tests/customer.spec.ts`, `ticket.spec.ts`, `interaction.spec.ts`** — add `.set('Authorization', bearer())` to every `request(app)` chain (task 12). No other change; every existing assertion must still pass.
9. **Modify `backend/src/tests/openapi.spec.ts`** — add assertions that `openApiDocument.components.securitySchemes.bearerAuth` is defined, `openApiDocument.security` is defined, `paths['/auth/login']`, `paths['/auth/me']`, `paths['/users']`, `paths['/users/{id}']`, `paths['/roles']`, `paths['/roles/{id}/permissions']`, `paths['/permissions']`, `paths['/branches']`, and `paths['/departments']` are all defined, `components.schemas.AuthUser` and `components.schemas.Role` are defined, and `paths['/customers'].get.responses['401']` is defined.
10. **Unchanged suites** that must still pass with no edit: `channels.spec.ts`, `health.spec.ts`, `health.db.spec.ts`, `health.service.spec.ts`, `error.middleware.spec.ts`, `interaction.service.spec.ts`, `auth.rbac.spec.ts`, `password.spec.ts`.

---

## Migration / Rollback

- **No database migration in this story.** Story 07 created every table this story reads. `npx prisma migrate status` must report the schema up to date and unchanged before and after.
- **Config is the breaking part.** `JWT_SECRET` becomes a **required** environment variable (task 1). Any environment that starts the backend without it exits immediately with the field-error dump from `env.ts:23-28`. Add the variable to every `.env` and CI secret store **before** deploying this change.
- **Rollback:** revert the `backend/src/routes/index.ts` change (task 10) first — that single edit removes all enforcement and restores the pre-Story-08 API surface — then revert the rest. Reverting the routers or controllers without reverting `routes/index.ts` leaves `router.use(authenticate)` in place with no `requirePermission` behind it, which is a valid but half-enforced state.
- **Half-applied state to avoid:** landing task 1's `env.ts` edit without task 1's `backend/src/tests/setup.ts` edit. The test suite goes completely silent (`process.exit(1)` before the first assertion), which reads like a broken Jest install rather than a missing env var.

---

## Verification Steps

Run from `backend/` unless stated otherwise.

1. **Backend builds:** `npm run build` exits 0; `npm run typecheck` exits 0.
2. **Tests pass:** `npm test` — green, including all six new spec files and the three modified ones.
3. **Missing secret fails loudly:** `JWT_SECRET= npm run dev` (empty value) exits non-zero and prints `JWT_SECRET must be at least 32 characters …`. Restore the real value afterwards.
4. **Backend runs:** `npm run dev` with a valid `.env`, then from a second shell (seeded data from Story 07 — password `Passw0rd!`):
   - **Login:** `curl -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@crm.local","password":"Passw0rd!"}'` → `200`; capture `data.token` as `$ADMIN`. `data.user.permissions` has 13 entries; `data.user` contains no `passwordHash`.
   - **Bad password:** same call with `"password":"wrong"` → `401` `"Invalid email or password"`. Same call with `"email":"nobody@crm.local"` → the **identical** `401` body.
   - **Me:** `curl http://localhost:3000/api/auth/me -H "Authorization: Bearer $ADMIN"` → `200` with `roleKey: "SYSTEM_ADMINISTRATOR"`.
   - **Logout:** `curl -X POST http://localhost:3000/api/auth/logout` → `200`.
5. **Protected APIs reject unauthorized requests:**
   - `curl -i http://localhost:3000/api/customers` → `401`.
   - `curl -i http://localhost:3000/api/users` → `401`.
   - `curl -i http://localhost:3000/api/customers -H "Authorization: Basic abc"` → `401`.
   - `curl -i http://localhost:3000/api/customers -H "Authorization: Bearer garbage"` → `401` `"Invalid token"`.
   - `curl http://localhost:3000/api/customers -H "Authorization: Bearer $ADMIN"` → `200` with the seeded customer.
6. **Roles and permissions are enforced** — log in as each demo account and capture its token:
   - `agent@crm.local` → `GET /api/users` → `403` with `details.missing` `["users:read"]`; `POST /api/interactions` (valid body, `customerId` 1) → `201`.
   - `reports@crm.local` → `GET /api/customers` → `200`; `POST /api/interactions` → `403`.
   - `manager@crm.local` → `GET /api/users` → `200`; `POST /api/users` → `403`.
   - `demo.customer@example.com` → `GET /api/customers` → `403`; `GET /api/customers/1/timeline` → `200` with the five seeded interactions; `GET /api/customers/2/timeline` → `403`; `GET /api/tickets` → `200` returning only customer 1's tickets.
7. **Users can be created and managed by an administrator** (with `$ADMIN`):
   - `POST /api/users` with `{"name":"New Agent","email":"new.agent@crm.local","password":"Passw0rd!","roleId":<SUPPORT_AGENT id>,"branchId":1,"departmentId":1}` → `201`.
   - Log in as `new.agent@crm.local` → `200` with `roleKey: "SUPPORT_AGENT"`.
   - Repeat the same `POST /api/users` → `409`.
   - `PATCH /api/users/<id>/password` with `{"password":"NewPassw0rd!"}` → `200`; the old password now fails login and the new one succeeds.
   - `DELETE /api/users/<id>` → `200` with `data.isActive` false; logging in as that user now returns `403` `"This account has been deactivated"`.
   - `DELETE /api/users/1` using admin user 1's own token → `400`.
8. **Roles editable:** `GET /api/roles -H "Authorization: Bearer $ADMIN"` → `200` with six roles. `PUT /api/roles/<REPORTING_USER id>/permissions` with `{"permissions":["reports:read"]}` → `200`. `PUT /api/roles/<SYSTEM_ADMINISTRATOR id>/permissions` with `{"permissions":["reports:read"]}` → `400`. Restore the reporting role with `npm run db:seed`.
9. **Docs:** `curl http://localhost:3000/api/docs.json` contains `"bearerAuth"`, `"/auth/login"`, and `"/users"`; `http://localhost:3000/api/docs` renders with an **Authorize** button.
10. **Regression:** `curl http://localhost:3000/api/health` → `200` `"status":"ok"` with no header; `curl http://localhost:3000/api/health/db` → `200` with no header; `curl -i http://localhost:3000/api/unknown` → `404` (the `notFoundMiddleware` path from Story 01 still wins over the auth guard, because `/api/unknown` matches no mounted router).
11. **Known-broken, expected:** the frontend Communications screen shows an error until Story 09 — `frontend/src/services/api.ts` sends no token. Confirm the browser network tab shows `401` on `/api/customers`, then move on.

---

## Done Criteria

- [ ] `JWT_SECRET` (required, ≥32 chars) and `JWT_EXPIRES_IN_SECONDS` are validated in `backend/src/config/env.ts`, documented in `backend/.env.example`, and defaulted in `backend/src/tests/setup.ts`.
- [ ] `POST /api/auth/login` returns a signed JWT plus an `AuthUser` that never contains `passwordHash`, and returns the same `401` for an unknown e-mail as for a wrong password (**"User can login and logout"**, **"Authentication is handled securely"**).
- [ ] `POST /api/auth/logout` returns `200` and `GET /api/auth/me` returns the current user's role and permissions from the database.
- [ ] `backend/src/middleware/auth.middleware.ts` exports `authenticate`, `requirePermission`, and `getAuth`, and every failure path goes through `AppError` so the `{ success, message, data }` envelope is preserved.
- [ ] `router.use(authenticate)` in `backend/src/routes/index.ts` sits below `/health` and `/auth` and above every other mount, so an unauthenticated request to `/api/customers`, `/api/tickets`, `/api/interactions`, `/api/users`, `/api/roles`, `/api/permissions`, `/api/branches`, or `/api/departments` returns `401` (**"Protected APIs reject unauthorized requests"**).
- [ ] Every route on those resources carries a `requirePermission(...)` matching the table in task 9, and a valid token missing that permission returns `403` with `details.missing` (**"Roles and permissions are enforced"**).
- [ ] A `CUSTOMER`-role token can read only its own customer's timeline, tickets, and interactions — verified by `## Verification Steps` item 6.
- [ ] `GET/POST /api/users`, `GET/PATCH /api/users/:id`, `PATCH /api/users/:id/password`, and `DELETE /api/users/:id` all work behind `users:read` / `users:manage`, with the duplicate-e-mail, self-deactivation, and last-administrator guards enforced (**"Users can be created and managed by an administrator"**).
- [ ] `GET /api/roles`, `GET /api/permissions`, and `PUT /api/roles/:id/permissions` work, and the System Administrator role cannot lose `users:manage` or `roles:manage`.
- [ ] `GET/POST /api/branches` and `GET/POST /api/departments` work behind `orgunits:read` / `orgunits:manage`.
- [ ] `backend/src/docs/openapi.ts` declares `components.securitySchemes.bearerAuth`, a document-level `security`, `security: []` on the four public paths, all new paths, and a `401`/`403` response on every protected path.
- [ ] `backend/src/tests/customer.spec.ts`, `ticket.spec.ts`, and `interaction.spec.ts` pass with an `Authorization` header and no other change.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0 in `backend/`.

**STOP HERE. Report to the user and wait for confirmation before proceeding to Story 09.**
