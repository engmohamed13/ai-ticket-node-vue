# Story 09 — Login, protected Vue routes, and the user management screen (Story: 3)

## Prerequisites

- Story 08 completed: [08-story-auth-apis-3.md](08-story-auth-apis-3.md). `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `GET/POST /api/users`, `GET/PATCH /api/users/:id`, `PATCH /api/users/:id/password`, `DELETE /api/users/:id`, `GET /api/roles`, `PUT /api/roles/:id/permissions`, `GET /api/permissions`, `GET/POST /api/branches`, and `GET/POST /api/departments` must all be live, and `router.use(authenticate)` must be protecting `/api/customers`, `/api/tickets`, and `/api/interactions`.
- Story 07 completed: [07-story-auth-data-model-3.md](07-story-auth-data-model-3.md). `npm run db:seed` must have been run so the six demo accounts exist — `admin@crm.local`, `manager@crm.local`, `supervisor@crm.local`, `agent@crm.local`, `reports@crm.local`, `demo.customer@example.com`, all with password `Passw0rd!`. The final demo in `## Verification Steps` logs in as four of them.
- Story 06 completed: [../communicationchannels/06-story-communication-timeline-ui-2.md](../communicationchannels/06-story-communication-timeline-ui-2.md). The Communications screen, `frontend/src/services/api.ts`, `frontend/src/stores/communications.ts`, and the three-layer Vitest pattern all exist. **The Communications screen is currently broken** (every call returns `401`) — task 3 is what fixes it.
- Story 03 completed: [../projectsetup/03-story-frontend-bootstrap-1.md](../projectsetup/03-story-frontend-bootstrap-1.md) for the Vue 3 + Vite + Pinia + vue-router shell.

---

## Story Goal

Put a login screen in front of the app, attach the access token to every API call, gate routes and navigation on the signed-in user's permissions, and give an administrator a screen to manage users and role permissions.

Outcomes:

1. `/login` authenticates against `POST /api/auth/login`, stores the token, and lands the user on the dashboard. A **Logout** control in the header clears the session and returns to `/login`.
2. Every axios request carries `Authorization: Bearer <token>`, so the Story 06 Communications screen works again.
3. Every route except `/login` requires a session; routes that need a permission redirect to a **403** screen when the signed-in user lacks it. The sidebar renders only the links the user can actually reach.
4. `/users` lists users and lets an administrator create one, change a password, and deactivate one. `/roles` shows each role's permissions and lets an administrator change them.
5. Logging in as each of the six seeded roles visibly changes what the app offers — the exact demo in the work item.

**Not in scope for this story:** self-service registration, password-reset flows, editing a user's e-mail (the backend's `updateUserSchema` has no `email` field by design — Story 08 task 6), creating branches/departments from the UI (both are read-only dropdowns sourced from `GET /api/branches` and `GET /api/departments`), remembering a session across a hard browser restart beyond `localStorage`, and i18n. The historical implementation had an Arabic/English toggle (`git show 988127f:frontend/src/views/LoginView.vue`); `vue-i18n` is **not** a dependency of the current `frontend/package.json` and this story does not add it.

---

## Context — Read These Files First

1. [.squad/stories/authenticationandusermanagement/3/intake.md](../../stories/authenticationandusermanagement/3/intake.md) — `## Description`: "Login / Logout", "Protected Vue routes", "User management screen"; `## Acceptance criteria`: "User can login and logout", "Vue protected routes work correctly", "Users can be created and managed by an administrator"; `## Demo`: "Login with different roles and demonstrate different access based on permissions" — that sentence is what `## Verification Steps` item 5 walks through.
2. [08-story-auth-apis-3.md](08-story-auth-apis-3.md) — re-read task 5 (the `AuthUser` DTO field-by-field: `roleKey`, `roleName`, `permissions`, `customerId`, `department`, `branch` — the frontend `AuthUser` interface in task 2 mirrors it exactly), task 6 (the `POST /api/users` body and the absence of `email`/`password` from `PATCH /api/users/:id`), task 7 (`PUT /api/roles/:id/permissions` takes `{ permissions: string[] }` and rejects an empty array), and task 9 (which permission guards which endpoint).
3. [07-story-auth-data-model-3.md](07-story-auth-data-model-3.md) — task 3 and task 4: the exact `PERMISSIONS` and `ROLES` tuples that task 2 hand-copies into `frontend/src/types/index.ts`.
4. `frontend/src/types/index.ts` (70 lines) — read the whole file. `ApiResponse<T>` (1–5) is the envelope; `CHANNELS` (27) and `INTERACTION_DIRECTIONS` (30) are the precedent for hand-copied `as const` tuples on the frontend side of the API boundary. Append the new types; change nothing existing.
5. `frontend/src/services/api.ts` (15 lines) — read the whole file. One shared axios instance with `baseURL: API_BASE_URL`, an 8-second timeout, and a pass-through response interceptor (10–13) that task 3 replaces. There is **no** request interceptor today.
6. `frontend/src/config/env.ts` (1 line) — `API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL`. Task 1 adds a sibling `storage.ts` in the same directory.
7. `frontend/src/services/communications.service.ts` (39 lines) — the service pattern: `api.get<ApiResponse<T>>(...)`, `response.data.data ?? []` for lists, and `throw new Error(response.data.message || '…')` when a mutating call returns null data (lines 29, 37). Tasks 4 and 5 follow both conventions exactly.
8. `frontend/src/stores/communications.ts` (83 lines) — the Pinia **setup-store** pattern: `ref` state, `computed` derived values, async actions with `try/catch/finally` around `loading` / `error`, and an explicit `return { … }` object listing everything exposed. Tasks 6 and 7 follow it.
9. `frontend/src/router/index.ts` (33 lines) — read the whole file. Four routes, no `meta`, no navigation guard today. Task 8 adds `meta` to every route and one `router.beforeEach`.
10. `frontend/src/main.ts` (11 lines) — `app.use(createPinia())` runs **before** `app.use(router)`, which is what lets the guard in task 8 call `useAuthStore()` safely. Task 8 also registers the 401 handler here.
11. `frontend/src/App.vue` (49 lines) — the shell: `AppHeader`, then `AppSidebar` + `<RouterView>` inside `.app-body`. Task 11 makes the shell conditional so `/login` renders full-screen.
12. `frontend/src/components/AppSidebar.vue` (60 lines) and `frontend/src/components/AppHeader.vue` (52 lines) — read both. The sidebar is three hard-coded `RouterLink`s (7–9); the header shows the health pill via `useHealthStore()`. Tasks 9 and 10 modify both.
13. `frontend/src/views/SystemHealthView.vue` (142 lines) and `frontend/src/views/CommunicationsView.vue` — the view pattern: `onMounted` triggers a store load, a `data-testid` on every element a test needs, `v-if`/`v-else-if` loading/error/loaded blocks, and scoped `<style>` using the CSS custom properties from `frontend/src/style.css` (`--text-muted`, `--surface-color`, `--border-color`, `--color-down`, `--color-down-bg`, `--color-ok`, `--color-ok-bg` — lines 1–13).
14. `frontend/src/tests/communications.service.spec.ts` (117 lines), `frontend/src/tests/communications.store.spec.ts` (105 lines), and `frontend/src/tests/CommunicationsView.spec.ts` — the three-layer Vitest pattern to replicate: `vi.mock('../services/…')` at the module boundary, `setActivePinia(createPinia())` in `beforeEach`, `mount(...)` + `flushPromises()` + `data-testid` lookups.
15. `frontend/src/tests/router.spec.ts` (20 lines) — `router.resolve(path).name` assertions. Note these use `resolve`, **not** `push`, so they do not run the guard task 8 adds. Task 12 adds separate guard tests that do use `push`.
16. `frontend/tsconfig.app.json` — `"noUnusedLocals"`, `"noUnusedParameters"`, and `"erasableSyntaxOnly"` are all on, and it extends `@vue/tsconfig/tsconfig.dom.json` (which sets `verbatimModuleSyntax`). Consequences for every new file: **no `enum`** (use `as const` tuples), and **`import type`** for every type-only import — the existing files already do both.
17. `frontend/package.json` — `vue@^3.5`, `vue-router@^5.2`, `pinia@^4.0`, `axios@^1.19`, `vitest@^4.1`, `@vue/test-utils@^2.4`. No new dependency is needed for this story; **do not add one**.
18. `git show 988127f:frontend/src/views/LoginView.vue` — the historical login screen. Reuse its **flow** (bind email/password, `POST /auth/login`, store the token, redirect) but not its code: it called `api.post` directly from the component, kept `localStorage.setItem('token', …)` inline, and used `vue-i18n`. This story routes everything through a service + store, and adds no i18n.

---

## Frontend Tasks

### 1 — Storage keys

**Create file: `frontend/src/config/storage.ts`**

```ts
export const TOKEN_STORAGE_KEY = 'crm.auth.token';
export const USER_STORAGE_KEY = 'crm.auth.user';
```

Both the axios request interceptor (task 3) and the auth store (task 6) read these. They live in `config/` rather than in the store so `api.ts` can read the token **without importing the store** — importing it would create the cycle `api.ts → stores/auth.ts → services/auth.service.ts → api.ts`.

### 2 — Types

**File: `frontend/src/types/index.ts`**

Append (leave lines 1–70 untouched):

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

export const ROLES = [
  'SYSTEM_ADMINISTRATOR',
  'CRM_MANAGER',
  'SUPPORT_SUPERVISOR',
  'SUPPORT_AGENT',
  'CUSTOMER',
  'REPORTING_USER'
] as const;
export type RoleKey = (typeof ROLES)[number];

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

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  user: AuthUser;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  roleId: number;
  departmentId?: number;
  branchId?: number;
  customerId?: number;
}

export interface Role {
  id: number;
  key: RoleKey;
  name: string;
  description: string | null;
  permissions: Permission[];
}

export interface PermissionRecord {
  id: number;
  key: Permission;
  description: string;
}

export interface Branch {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

export interface Department {
  id: number;
  name: string;
  branchId: number;
  createdAt: string;
}
```

`PERMISSIONS` and `ROLES` are hand-copied from `backend/src/auth/permissions.ts` and `backend/src/auth/roles.ts` — the same relationship `CHANNELS` already has with `backend/src/channels/types.ts`. There is no shared package between `frontend/` and `backend/`, so **changing a permission key requires editing both sides**. The Vitest suite in task 12 item 1 asserts both tuple lengths so a one-sided edit fails loudly.

`PermissionRecord` is named for the `GET /api/permissions` row shape; `Permission` is already taken by the key union, and shadowing it would silently weaken every `can()` call.

### 3 — Attach the token to every request

**Create file: `frontend/src/services/authEvents.ts`**

```ts
type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | null = null;

/** Registered once in `main.ts`; keeps `api.ts` free of any store or router import. */
export const onUnauthorized = (next: UnauthorizedHandler): void => {
  handler = next;
};

export const emitUnauthorized = (): void => {
  handler?.();
};
```

**File: `frontend/src/services/api.ts`**

Replace the whole file:

```ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/env';
import { TOKEN_STORAGE_KEY } from '../config/storage';
import { emitUnauthorized } from './authEvents';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      emitUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
```

The request interceptor reads `localStorage` directly rather than the auth store, for the cycle reason in task 1. The `401` handler is an **event**, not a redirect: `api.ts` must not import the router (`api.ts → router → views → stores → services → api`). `main.ts` (task 8) wires the event to "clear the session and navigate to `/login`".

`403` is deliberately **not** handled here — a `403` means "you are signed in but not allowed", which the calling store surfaces as an error message on the page. Only `401` ends the session.

### 4 — Auth service

**Create file: `frontend/src/services/auth.service.ts`**

```ts
import api from './api';
import type { ApiResponse, AuthUser, LoginPayload, LoginResult } from '../types';

export const login = async (payload: LoginPayload): Promise<LoginResult> => {
  const response = await api.post<ApiResponse<LoginResult>>('/auth/login', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Login failed');
  return response.data.data;
};

export const logout = async (): Promise<void> => {
  await api.post<ApiResponse<null>>('/auth/logout');
};

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await api.get<ApiResponse<AuthUser>>('/auth/me');
  if (!response.data.data) throw new Error(response.data.message || 'Unable to load the current user');
  return response.data.data;
};
```

### 5 — Users, roles, and org-unit service

**Create file: `frontend/src/services/users.service.ts`**

```ts
import api from './api';
import type {
  ApiResponse,
  AuthUser,
  Branch,
  CreateUserPayload,
  Department,
  Permission,
  PermissionRecord,
  Role
} from '../types';

export const fetchUsers = async (): Promise<AuthUser[]> => {
  const response = await api.get<ApiResponse<AuthUser[]>>('/users');
  return response.data.data ?? [];
};

export const createUser = async (payload: CreateUserPayload): Promise<AuthUser> => {
  const response = await api.post<ApiResponse<AuthUser>>('/users', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to create the user');
  return response.data.data;
};

export const changeUserPassword = async (userId: number, password: string): Promise<void> => {
  await api.patch<ApiResponse<null>>(`/users/${userId}/password`, { password });
};

export const deactivateUser = async (userId: number): Promise<AuthUser> => {
  const response = await api.delete<ApiResponse<AuthUser>>(`/users/${userId}`);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to deactivate the user');
  return response.data.data;
};

export const fetchRoles = async (): Promise<Role[]> => {
  const response = await api.get<ApiResponse<Role[]>>('/roles');
  return response.data.data ?? [];
};

export const fetchPermissions = async (): Promise<PermissionRecord[]> => {
  const response = await api.get<ApiResponse<PermissionRecord[]>>('/permissions');
  return response.data.data ?? [];
};

export const setRolePermissions = async (roleId: number, permissions: Permission[]): Promise<Role> => {
  const response = await api.put<ApiResponse<Role>>(`/roles/${roleId}/permissions`, { permissions });
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update role permissions');
  return response.data.data;
};

export const fetchBranches = async (): Promise<Branch[]> => {
  const response = await api.get<ApiResponse<Branch[]>>('/branches');
  return response.data.data ?? [];
};

export const fetchDepartments = async (branchId?: number): Promise<Department[]> => {
  const response = await api.get<ApiResponse<Department[]>>('/departments', {
    params: branchId === undefined ? undefined : { branchId }
  });
  return response.data.data ?? [];
};
```

List reads default to `[]`; mutating calls throw on null data — the split established in Story 06 task 2.

**Backend error messages must survive to the UI.** Axios rejects a `4xx` with an `AxiosError` whose `message` is the useless `"Request failed with status code 403"`; the real text is in `error.response.data.message`. Add this helper and use it in every `catch` in tasks 6 and 7:

**Create file: `frontend/src/services/apiError.ts`**

```ts
import { AxiosError } from 'axios';

/** Pulls the backend's `{ success, message, data }` message out of an axios rejection. */
export const toErrorMessage = (cause: unknown, fallback: string): string => {
  if (cause instanceof AxiosError) {
    const payload = cause.response?.data as { message?: string } | undefined;
    if (payload?.message) return payload.message;
  }
  if (cause instanceof Error && cause.message) return cause.message;
  return fallback;
};
```

Without this, a `403` on "Save interaction" shows "Request failed with status code 403" instead of "Forbidden: insufficient permissions", and the last acceptance criterion becomes impossible to demonstrate.

### 6 — Auth store

**Create file: `frontend/src/stores/auth.ts`**

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../services/auth.service';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../config/storage';
import type { AuthUser, LoginPayload, Permission } from '../types';

const readStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    // Corrupt payload (hand-edited or a stale shape) — treat it as no session.
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const restored = ref(false);

  const isAuthenticated = computed(() => token.value !== null);
  const permissions = computed<Permission[]>(() => user.value?.permissions ?? []);

  const can = (permission: Permission): boolean => permissions.value.includes(permission);

  const persist = (nextToken: string, nextUser: AuthUser): void => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const clear = (): void => {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  /** Rehydrate from localStorage. Idempotent — safe to call from every navigation. */
  const restore = (): void => {
    if (restored.value) return;
    restored.value = true;
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = readStoredUser();
    if (storedToken && storedUser) {
      token.value = storedToken;
      user.value = storedUser;
    } else {
      clear();
    }
  };

  const signIn = async (payload: LoginPayload): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    try {
      const result = await loginRequest(payload);
      token.value = result.token;
      user.value = result.user;
      restored.value = true;
      persist(result.token, result.user);
      return true;
    } catch (cause) {
      clear();
      error.value = toErrorMessage(cause, 'Unable to sign in');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Best-effort: the backend logout is stateless, so a failure here changes nothing.
      await logoutRequest();
    } catch {
      // Intentionally ignored — the local session is cleared either way.
    } finally {
      clear();
      error.value = null;
    }
  };

  /** Re-read the role and permissions from the server; the token's copy can be stale. */
  const refreshCurrentUser = async (): Promise<void> => {
    if (!token.value) return;
    try {
      const current = await fetchCurrentUser();
      user.value = current;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(current));
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to refresh the current user');
    }
  };

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    permissions,
    can,
    clear,
    restore,
    signIn,
    signOut,
    refreshCurrentUser
  };
});
```

Why the token **and** the user are persisted: the router guard runs before any component mounts and must decide `can(permission)` synchronously. Waiting on `GET /api/auth/me` would make every first navigation async and flash the login screen on reload. `refreshCurrentUser` is the correction path — Story 08's `## Edge Cases` notes that a JWT's permission list goes stale after an admin edit, and `/auth/me` is the authority.

`restored` guards `restore()` so the guard can call it on every navigation without clobbering the state `signIn` just set.

### 7 — Users store

**Create file: `frontend/src/stores/users.ts`**

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  changeUserPassword,
  createUser,
  deactivateUser,
  fetchBranches,
  fetchDepartments,
  fetchPermissions,
  fetchRoles,
  fetchUsers,
  setRolePermissions
} from '../services/users.service';
import type {
  AuthUser,
  Branch,
  CreateUserPayload,
  Department,
  Permission,
  PermissionRecord,
  Role
} from '../types';

export const useUsersStore = defineStore('users', () => {
  const users = ref<AuthUser[]>([]);
  const roles = ref<Role[]>([]);
  const permissions = ref<PermissionRecord[]>([]);
  const branches = ref<Branch[]>([]);
  const departments = ref<Department[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const loadDirectory = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const [loadedUsers, loadedRoles, loadedBranches, loadedDepartments] = await Promise.all([
        fetchUsers(),
        fetchRoles(),
        fetchBranches(),
        fetchDepartments()
      ]);
      users.value = loadedUsers;
      roles.value = loadedRoles;
      branches.value = loadedBranches;
      departments.value = loadedDepartments;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load users');
    } finally {
      loading.value = false;
    }
  };

  const loadRoleMatrix = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const [loadedRoles, loadedPermissions] = await Promise.all([fetchRoles(), fetchPermissions()]);
      roles.value = loadedRoles;
      permissions.value = loadedPermissions;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load roles');
    } finally {
      loading.value = false;
    }
  };

  const submitUser = async (payload: CreateUserPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const created = await createUser(payload);
      users.value = [...users.value, created].sort((a, b) => a.name.localeCompare(b.name));
      notice.value = `User ${created.email} created`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to create the user');
      return false;
    }
  };

  const resetPassword = async (userId: number, password: string): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      await changeUserPassword(userId, password);
      notice.value = 'Password updated';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update the password');
      return false;
    }
  };

  const deactivate = async (userId: number): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const updated = await deactivateUser(userId);
      users.value = users.value.map((entry) => (entry.id === updated.id ? updated : entry));
      notice.value = `User ${updated.email} deactivated`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to deactivate the user');
      return false;
    }
  };

  const saveRolePermissions = async (roleId: number, keys: Permission[]): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const updated = await setRolePermissions(roleId, keys);
      roles.value = roles.value.map((role) => (role.id === updated.id ? updated : role));
      notice.value = `Permissions updated for ${updated.name}`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update role permissions');
      return false;
    }
  };

  return {
    users,
    roles,
    permissions,
    branches,
    departments,
    loading,
    error,
    notice,
    loadDirectory,
    loadRoleMatrix,
    submitUser,
    resetPassword,
    deactivate,
    saveRolePermissions
  };
});
```

Every action returns a `boolean` so a view can clear its form only on success. `notice` is separate from `error` so a success message and a stale error never render together.

### 8 — Routes, guard, and the 401 wiring

**File: `frontend/src/router/index.ts`**

Replace the whole file:

```ts
import { createRouter, createWebHistory } from 'vue-router';
import CommunicationsView from '../views/CommunicationsView.vue';
import DashboardView from '../views/DashboardView.vue';
import ForbiddenView from '../views/ForbiddenView.vue';
import LoginView from '../views/LoginView.vue';
import NotFoundView from '../views/NotFoundView.vue';
import RolesView from '../views/RolesView.vue';
import SystemHealthView from '../views/SystemHealthView.vue';
import UsersView from '../views/UsersView.vue';
import { useAuthStore } from '../stores/auth';
import type { Permission } from '../types';

declare module 'vue-router' {
  interface RouteMeta {
    /** Reachable without a session. */
    public?: boolean;
    /** Permission the signed-in user must hold to enter. */
    permission?: Permission;
    /** Sidebar label; absent means the route is not listed in the sidebar. */
    navLabel?: string;
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true }
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { navLabel: 'Dashboard' }
    },
    {
      path: '/health',
      name: 'system-health',
      component: SystemHealthView,
      meta: { navLabel: 'System Health' }
    },
    {
      path: '/communications',
      name: 'communications',
      component: CommunicationsView,
      meta: { navLabel: 'Communications', permission: 'interactions:read' }
    },
    {
      path: '/users',
      name: 'users',
      component: UsersView,
      meta: { navLabel: 'Users', permission: 'users:read' }
    },
    {
      path: '/roles',
      name: 'roles',
      component: RolesView,
      meta: { navLabel: 'Roles & Permissions', permission: 'roles:read' }
    },
    {
      path: '/forbidden',
      name: 'forbidden',
      component: ForbiddenView
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView
    }
  ]
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  auth.restore();

  if (to.meta.public) {
    // An already-signed-in user has no business on the login screen.
    return auth.isAuthenticated && to.name === 'login' ? { name: 'dashboard' } : true;
  }

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.permission && !auth.can(to.meta.permission)) {
    return { name: 'forbidden' };
  }

  return true;
});

export default router;
```

Critical details:

- `useAuthStore()` is called **inside** the guard body, never at module scope. `main.ts` installs Pinia before the router (`frontend/src/main.ts:8-9`), so by the time a navigation runs the active Pinia exists — but a module-level `useAuthStore()` would run at import time, before `createPinia()`, and throw.
- `/` (dashboard), `/health`, `/forbidden`, and `/:pathMatch(.*)*` require a session but **no** permission, so every signed-in role has somewhere to land. A `CUSTOMER`-role user gets Dashboard, System Health, and Communications.
- `/communications` is gated on `interactions:read`, which all six roles hold — it is listed so the demo can show the gate working after an administrator revokes that permission from a role.
- `redirect` is carried as a query param and consumed by `LoginView` (task 12 of this list is the test; task 13's view reads it).
- The existing `frontend/src/tests/router.spec.ts` uses `router.resolve(...)`, which does **not** run guards, so all four of its current assertions keep passing unchanged.

**Create file: `frontend/src/views/ForbiddenView.vue`**

```vue
<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <section data-testid="forbidden-view">
    <h2>Access denied</h2>
    <p class="lead">
      Your role <strong>{{ auth.user?.roleName ?? 'unknown' }}</strong> does not have permission to
      open that screen. Contact a System Administrator if you need access.
    </p>
    <RouterLink :to="{ name: 'dashboard' }" class="btn btn-primary">Back to Dashboard</RouterLink>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
}

.lead {
  color: var(--text-muted);
  line-height: 1.6;
}
</style>
```

**File: `frontend/src/main.ts`**

Replace the whole file:

```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import router from './router';
import { onUnauthorized } from './services/authEvents';
import { useAuthStore } from './stores/auth';

const app = createApp(App);
app.use(createPinia());
app.use(router);

// A 401 from any API call ends the session and returns to the login screen.
onUnauthorized(() => {
  useAuthStore().clear();
  if (router.currentRoute.value.name !== 'login') {
    void router.push({ name: 'login' });
  }
});

app.mount('#app');
```

`useAuthStore()` is called inside the callback, after `app.use(createPinia())` has run — same rule as the guard.

### 9 — Login view

**Create file: `frontend/src/views/LoginView.vue`**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');

const onSubmit = async (): Promise<void> => {
  if (email.value.trim().length === 0 || password.value.length === 0) return;
  const signedIn = await auth.signIn({ email: email.value.trim(), password: password.value });
  if (!signedIn) {
    password.value = '';
    return;
  }
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
  await router.replace(redirect);
};
</script>

<template>
  <div class="login-page">
    <form class="login-card" data-testid="login-form" @submit.prevent="onSubmit">
      <h1>CustomerSupportCRM</h1>
      <p class="subtitle">Sign in to continue</p>

      <div v-if="auth.error" class="panel-error" data-testid="login-error">{{ auth.error }}</div>

      <label for="login-email">Email</label>
      <input
        id="login-email"
        v-model="email"
        data-testid="login-email"
        type="email"
        autocomplete="username"
        required
      />

      <label for="login-password">Password</label>
      <input
        id="login-password"
        v-model="password"
        data-testid="login-password"
        type="password"
        autocomplete="current-password"
        required
      />

      <button class="btn btn-primary" type="submit" data-testid="login-submit" :disabled="auth.loading">
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </button>

      <p class="demo-hint">
        Demo accounts (password <code>Passw0rd!</code>): <code>admin@crm.local</code>,
        <code>manager@crm.local</code>, <code>supervisor@crm.local</code>,
        <code>agent@crm.local</code>, <code>reports@crm.local</code>,
        <code>demo.customer@example.com</code>
      </p>
    </form>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.login-card {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  max-width: 380px;
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 2rem;
}

.subtitle {
  color: var(--text-muted);
  margin: 0 0 0.75rem;
}

.panel-error {
  background-color: var(--color-down-bg);
  color: var(--color-down);
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

input {
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.95rem;
}

button {
  margin-top: 1rem;
}

.demo-hint {
  margin-top: 1.25rem;
  font-size: 0.75rem;
  line-height: 1.7;
  color: var(--text-muted);
}
</style>
```

The demo-account hint is there because the work item's demo is "Login with different roles". It is **demo-only copy** — add a `// TODO` comment noting it must be removed before any non-demo deployment.

### 10 — Header: signed-in user and logout

**File: `frontend/src/components/AppHeader.vue`**

Keep the health pill exactly as it is (lines 11–13 of the template). Add to the `<script setup>` block:

```ts
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

const onLogout = async (): Promise<void> => {
  await auth.signOut();
  await router.push({ name: 'login' });
};
```

And add to the template, after the existing `status-pill` span:

```html
    <div v-if="auth.isAuthenticated" class="header-user" data-testid="header-user">
      <span class="user-name">{{ auth.user?.name }}</span>
      <span class="user-role" data-testid="header-role">{{ auth.user?.roleName }}</span>
      <button class="btn btn-secondary" type="button" data-testid="logout-button" @click="onLogout">
        Logout
      </button>
    </div>
```

Wrap the existing `<h1>` and `status-pill` so the layout still reads left/right; add scoped styles for `.header-user` (`display: flex; gap: 0.75rem; align-items: center;`), `.user-name` (`font-weight: 600; font-size: 0.9rem;`), and `.user-role` (`color: var(--text-muted); font-size: 0.8rem;`). Check `frontend/src/style.css` for a `.btn-secondary` class before using it — if only `.btn-primary` exists, use `class="btn btn-primary"`.

### 11 — Sidebar: permission-filtered navigation

**File: `frontend/src/components/AppSidebar.vue`**

Replace the `<script setup>` and `<template>` (keep the `<style>` block unchanged):

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

/** Every route that declares a `navLabel`, minus the ones this user cannot enter. */
const navItems = computed(() =>
  router.getRoutes().filter((route) => {
    if (!route.meta.navLabel) return false;
    return !route.meta.permission || auth.can(route.meta.permission);
  })
);
</script>

<template>
  <aside class="app-sidebar">
    <nav data-testid="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.name as string"
        :to="{ name: item.name }"
        class="nav-link"
        data-testid="sidebar-link"
      >
        {{ item.meta.navLabel }}
      </RouterLink>
    </nav>
  </aside>
</template>
```

Deriving the sidebar from `router.getRoutes()` and the same `meta.permission` the guard reads means a link can never point at a screen the guard would reject — the two cannot drift apart. `navLabel` is what opts a route into the sidebar, so `/login`, `/forbidden`, and the catch-all never appear.

**File: `frontend/src/App.vue`**

Render the shell only for non-public routes, so `/login` is full-screen:

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppSidebar from './components/AppSidebar.vue';

const route = useRoute();
const showShell = computed(() => route.meta.public !== true);
</script>

<template>
  <div v-if="showShell" class="app-layout">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
  <RouterView v-else />
</template>
```

Keep the existing `<style scoped>` block (lines 19–49) unchanged.

### 12 — Users view

**Create file: `frontend/src/views/UsersView.vue`**

`<script setup lang="ts">` responsibilities:

- `const store = useUsersStore()`, `const auth = useAuthStore()`.
- `onMounted(() => store.loadDirectory())`.
- Form refs: `name`, `email`, `password`, `roleId` (`string`, `''` default), `branchId` (`string`), `departmentId` (`string`), `customerId` (`string`).
- `const canManage = computed(() => auth.can('users:manage'))` — the create form and the deactivate/reset controls render only when true, so a `CRM_MANAGER` (who has `users:read` only) sees a read-only directory instead of buttons that would return `403`.
- `const departmentsForBranch = computed(() => branchId.value === '' ? store.departments : store.departments.filter((d) => d.branchId === Number(branchId.value)))` — picking a branch narrows the department list, matching the backend's `@@unique([branchId, name])` reality.
- `const selectedRoleKey = computed(() => store.roles.find((r) => r.id === Number(roleId.value))?.key)` and `const requiresCustomer = computed(() => selectedRoleKey.value === 'CUSTOMER')` — used to show the customer-id field only for a `CUSTOMER`-role user, since Story 07's schema links exactly that role to a `customers` row.
- `onCreate()`: return early if `name`/`email`/`password` are blank or `roleId` is `''`; call `store.submitUser({...})` mapping `''` → `undefined` for every optional numeric field; clear `name`, `email`, `password` only when it returns `true`.
- `onResetPassword(userId)`: read the row's value out of a `passwordDrafts = ref<Record<number, string>>({})`, return early if shorter than 8 characters, call `store.resetPassword`, clear the draft on success.
- `onDeactivate(userId)`: call `store.deactivate(userId)`.

Template requirements (every element a test looks for needs a `data-testid`):

- `<h2>Users</h2>`.
- `[data-testid="users-error"]` — `v-if="store.error"`, using the `.panel-error` styling from `CommunicationsView.vue`.
- `[data-testid="users-notice"]` — `v-if="store.notice"`, using `--color-ok` / `--color-ok-bg`.
- `[data-testid="users-loading"]` — `v-if="store.loading"`.
- `[data-testid="create-user-form"]` — `v-if="canManage"`, with `[data-testid="user-name-input"]`, `[data-testid="user-email-input"]`, `[data-testid="user-password-input"]`, `[data-testid="user-role-select"]` (options from `store.roles`, label `role.name`), `[data-testid="user-branch-select"]` (options from `store.branches`), `[data-testid="user-department-select"]` (options from `departmentsForBranch`), `[data-testid="user-customer-input"]` (`v-if="requiresCustomer"`), and `[data-testid="create-user-submit"]`.
- `[data-testid="users-table"]` with one `[data-testid="user-row"]` per `store.users`, each showing `name`, `email`, `roleName`, `branch?.name ?? '—'`, `department?.name ?? '—'`, and an `[data-testid="user-status"]` showing `Active` / `Inactive` from `isActive`.
- Per row, `v-if="canManage"`: `[data-testid="reset-password-input"]`, `[data-testid="reset-password-button"]`, and `[data-testid="deactivate-button"]` (disabled when `!user.isActive` or `user.id === auth.user?.id`, since the backend rejects self-deactivation with `400` — Story 08 task 6).
- `[data-testid="users-readonly-hint"]` — `v-else` on `canManage`, text: "You have read-only access to the user directory."

Scoped styles follow `CommunicationsView.vue`: `--surface-color` panels with a `--border-color` border and 8px radius, `--text-muted` for secondary text, and a table with `border-bottom: 1px solid var(--border-color)` per row.

### 13 — Roles and permissions view

**Create file: `frontend/src/views/RolesView.vue`**

`<script setup lang="ts">` responsibilities:

- `const store = useUsersStore()`, `const auth = useAuthStore()`, `const canManage = computed(() => auth.can('roles:manage'))`.
- `onMounted(() => store.loadRoleMatrix())`.
- `const drafts = ref<Record<number, Permission[]>>({})`, seeded from `store.roles` inside a `watch(() => store.roles, …, { immediate: true })` so a role's checkbox state starts from what the server returned and survives a reload.
- `const isChecked = (roleId: number, key: Permission) => (drafts.value[roleId] ?? []).includes(key)`.
- `const toggle = (roleId: number, key: Permission) => { … }` — add or remove the key in `drafts.value[roleId]`.
- `const onSave = async (roleId: number) => { await store.saveRolePermissions(roleId, drafts.value[roleId] ?? []) }`.

Template requirements:

- `<h2>Roles &amp; Permissions</h2>`.
- `[data-testid="roles-error"]`, `[data-testid="roles-notice"]`, `[data-testid="roles-loading"]` — same three states as `UsersView`.
- One `[data-testid="role-card"]` per `store.roles`, each showing `role.name`, a `<code>` with `role.key`, and one `<label>` + checkbox per entry in `store.permissions` (`[data-testid="permission-checkbox"]`, `:value="permission.key"`, `:checked="isChecked(role.id, permission.key)"`, `:disabled="!canManage"`, `@change="toggle(role.id, permission.key)"`), with `permission.description` as the label text.
- `[data-testid="save-role-button"]` per card, `v-if="canManage"`.
- A `[data-testid="admin-role-warning"]` on the card whose `role.key` is `SYSTEM_ADMINISTRATOR`: "The System Administrator role must keep Users manage and Roles manage." — the backend rejects removing either with `400` (Story 08 task 7), so warn before the user tries.

### 14 — No backend changes

`No backend changes required in this story.` Do not touch anything under `backend/` — Stories 07 and 08 own the entire server side. If a response shape does not match what the frontend expects, fix the frontend type in task 2; changing a live API contract is a separate, plan-level decision.

---

## Edge Cases & Failure Modes

- **Hard reload on a protected route.** `router.beforeEach` (task 8) calls `auth.restore()` before deciding, so a valid token in `localStorage` keeps the user on the page. With no token the guard redirects to `/login?redirect=/users`, and `LoginView.onSubmit` (task 9) returns them to `/users` after a successful sign-in.
- **`localStorage` holds a token but the user JSON is corrupt or from an older shape.** `readStoredUser` (task 6) catches the `JSON.parse` failure, removes the key, and returns `null`; `restore` then calls `clear()` so the guard treats it as no session. A half-restored session (token, no permissions) can never reach the `can()` check.
- **Token expired server-side but still in `localStorage`.** The guard passes (it cannot verify a signature), the first API call returns `401`, the response interceptor (task 3) fires `emitUnauthorized`, and `main.ts` clears the session and pushes `/login`. The user sees the target screen for a moment before the redirect — accepted; the alternative is an `/auth/me` round-trip blocking every navigation.
- **An administrator changes a role's permissions while a user of that role is signed in.** The signed-in user's `localStorage` copy and their JWT both still carry the old list (Story 08's `## Edge Cases`), so the sidebar and guard keep using it until they log in again or something calls `refreshCurrentUser`. `GET /api/auth/me` is the authority — call `auth.refreshCurrentUser()` after `saveRolePermissions` if the demo needs the change to appear immediately for the acting admin.
- **A user clicks a sidebar link for a screen they lack permission for.** Impossible by construction — `navItems` (task 11) filters on the same `meta.permission` the guard reads. Typing the URL directly still hits the guard and lands on `/forbidden`.
- **Permission granted for the route but denied for an action inside it.** A `CRM_MANAGER` has `users:read` but not `users:manage`: `/users` opens, the create form and per-row controls are hidden by `canManage` (task 12), and the read-only hint renders. If the request were made anyway the backend answers `403` and `toErrorMessage` (task 5) surfaces the real message.
- **A `403` from any call does not sign the user out.** The response interceptor (task 3) reacts to `401` only. A permission failure must leave the session intact — otherwise the demo's "denied access" step logs the user out instead of showing a denial.
- **Backend error text swallowed by axios.** Every store `catch` uses `toErrorMessage` (task 5) to read `error.response.data.message`. Using `cause.message` directly yields "Request failed with status code 403", which makes the last acceptance criterion undemonstrable.
- **Login submitted with empty fields.** `onSubmit` (task 9) returns early on blank input, in addition to the `required` attributes on both inputs — the browser guard and the code guard both hold.
- **Wrong credentials.** `signIn` returns `false`, `auth.error` renders in `[data-testid="login-error"]` with the backend's `"Invalid email or password"`, and the password field is cleared while the e-mail is kept.
- **Deactivated account signs in.** The backend returns `403 "This account has been deactivated"`; `signIn` puts that exact text in `auth.error` and no session is created.
- **Signed-in user navigates to `/login`.** The guard redirects to `/dashboard` — a stale login screen cannot overwrite a live session.
- **`signOut` when the network is down.** `logoutRequest` is wrapped in its own `try/catch` whose `finally` still calls `clear()` (task 6). The backend logout is stateless, so a failed call changes nothing server-side; the local session must end regardless.
- **Logout does not revoke the token.** Inherited from Story 08's stateless design. The token is removed from `localStorage`, but a copy captured before logout stays valid until it expires. Do not describe the Logout button as revocation.
- **A `CUSTOMER`-role user opens Communications.** `CUSTOMER` holds `interactions:read`, so the route opens. `store.loadCustomers()` calls `GET /api/customers`, which returns `403` for that role (no `customers:read`) — so the customer `<select>` is empty and `[data-testid="communications-error"]` shows the denial. That is correct behaviour for the current Story 06 view, which was written before roles existed; a customer-facing timeline that reads `/api/customers/{own id}/timeline` directly is a **documented follow-up**, not part of this story.
- **`localStorage` unavailable** (private-mode restrictions, storage disabled). Every access in tasks 1/3/6 is a direct call and would throw. Not handled: the app requires `localStorage`, the same assumption the historical `LoginView` made. Flagged so it is a known limitation rather than a surprise.
- **Two tabs, one logs out.** The other tab keeps its in-memory `token` ref until its next `401`. No `storage`-event listener is added; cross-tab session sync is out of scope.

---

## Test Plan

All frontend tests live in `frontend/src/tests/` and follow the three-layer Vitest pattern from `communications.service.spec.ts`, `communications.store.spec.ts`, and `CommunicationsView.spec.ts`: `vi.mock` at the module boundary, `setActivePinia(createPinia())` in `beforeEach`, and `mount(...)` + `flushPromises()` for views. Stub `localStorage` per test file with `beforeEach(() => localStorage.clear())` — jsdom provides a real implementation.

1. **Create `frontend/src/tests/authContract.spec.ts`** (no mocks — the guard against one-sided drift): `PERMISSIONS` has 13 entries and `ROLES` has 6, and both contain the exact keys listed in Story 07 tasks 3 and 4. If someone adds a permission to the backend and not here, this fails.
2. **Create `frontend/src/tests/auth.service.spec.ts`** (mock `../services/api` with `{ default: { get: vi.fn(), post: vi.fn() } }`, as `communications.service.spec.ts:5-11` does):
   - `login` posts to `/auth/login` with the payload and returns `response.data.data`; throws the backend `message` when `data` is `null`.
   - `logout` posts to `/auth/logout`.
   - `fetchCurrentUser` gets `/auth/me` and returns the `AuthUser`; throws when `data` is `null`.
3. **Create `frontend/src/tests/api.interceptor.spec.ts`** (do **not** mock `../services/api` — this is the module under test):
   - With `localStorage.setItem(TOKEN_STORAGE_KEY, 'abc')`, running the request interceptor over a bare config object sets `config.headers.Authorization` to `'Bearer abc'`. Reach the handler via `api.interceptors.request.handlers[0].fulfilled` (axios stores them there) and call it directly — no HTTP needed.
   - With no stored token, the interceptor leaves `Authorization` undefined.
   - The response error handler calls a handler registered through `onUnauthorized` when `error.response.status` is `401`, and does **not** call it for `403` or `500`. Assert the promise still rejects in every case.
4. **Create `frontend/src/tests/users.service.spec.ts`** (mock `../services/api` with `get`/`post`/`patch`/`put`/`delete`):
   - `fetchUsers`, `fetchRoles`, `fetchPermissions`, `fetchBranches` each unwrap `data.data` and return `[]` when it is `null`.
   - `fetchDepartments(1)` passes `{ params: { branchId: 1 } }`; `fetchDepartments()` passes `{ params: undefined }`.
   - `createUser` posts to `/users` and throws on null `data`.
   - `changeUserPassword(3, 'Passw0rd!')` patches `/users/3/password` with `{ password: 'Passw0rd!' }`.
   - `deactivateUser(3)` deletes `/users/3`.
   - `setRolePermissions(2, ['tickets:read'])` puts `/roles/2/permissions` with `{ permissions: ['tickets:read'] }`.
5. **Create `frontend/src/tests/apiError.spec.ts`** (no mocks): `toErrorMessage` returns `error.response.data.message` for an `AxiosError` carrying one; falls back to `cause.message` for a plain `Error`; returns the supplied fallback for `null`, `undefined`, and a string.
6. **Create `frontend/src/tests/auth.store.spec.ts`** (mock `../services/auth.service`):
   - `signIn` on success sets `token`, `user`, `isAuthenticated`, writes both `localStorage` keys, and returns `true`.
   - `signIn` on rejection returns `false`, sets `error` to the backend message (mock an `AxiosError`-shaped rejection with `response.data.message`), and leaves `isAuthenticated` false with both storage keys absent.
   - `restore` with both keys present rehydrates `token` and `user`; with only the token present it clears both; with malformed user JSON it clears both and does not throw.
   - `restore` called twice does not overwrite state set by `signIn` (the `restored` guard).
   - `can('users:read')` is true for a user whose permissions include it, false otherwise, and false when `user` is `null`.
   - `signOut` clears state and both storage keys **even when** `logout` rejects.
   - `refreshCurrentUser` replaces `user` from `fetchCurrentUser` and rewrites the stored user; no-ops when `token` is `null`.
7. **Create `frontend/src/tests/users.store.spec.ts`** (mock `../services/users.service`):
   - `loadDirectory` populates `users`, `roles`, `branches`, `departments`, and toggles `loading` true→false; sets `error` and leaves `loading` false when any fetch rejects.
   - `loadRoleMatrix` populates `roles` and `permissions`.
   - `submitUser` appends the created user (sorted by name), sets `notice`, and returns `true`; on rejection sets `error`, returns `false`, and leaves `users` unchanged.
   - `resetPassword` sets `notice` and returns `true`; returns `false` on rejection.
   - `deactivate` replaces the matching row with the returned user and returns `true`.
   - `saveRolePermissions` replaces the matching role and sets `notice`.
8. **Create `frontend/src/tests/LoginView.spec.ts`** (mock `../services/auth.service`; mount with a real router or stub `useRouter`/`useRoute` via `global.mocks`):
   - Filling `[data-testid="login-email"]` and `[data-testid="login-password"]` and submitting `[data-testid="login-form"]` calls the mocked `login` with the trimmed e-mail and the password.
   - A rejected `login` renders `[data-testid="login-error"]` with the backend message and clears the password input.
   - `[data-testid="login-submit"]` is disabled while `auth.loading` is true.
   - Submitting with an empty password does not call `login`.
9. **Create `frontend/src/tests/UsersView.spec.ts`** (mock `../services/users.service`):
   - With `users:manage` in the auth store, mounting renders `[data-testid="create-user-form"]` and one `[data-testid="user-row"]` per user.
   - With only `users:read`, `[data-testid="create-user-form"]` is absent, `[data-testid="deactivate-button"]` is absent, and `[data-testid="users-readonly-hint"]` renders.
   - Filling the create form and submitting calls `createUser` with `{ name, email, password, roleId }` and **no** `departmentId`/`branchId`/`customerId` keys when those selects are left empty.
   - Selecting a role whose `key` is `CUSTOMER` reveals `[data-testid="user-customer-input"]`; selecting any other role hides it.
   - Selecting a branch narrows `[data-testid="user-department-select"]` to that branch's departments.
   - Clicking `[data-testid="deactivate-button"]` calls `deactivateUser` with that row's id; the button is disabled on the row matching the signed-in user's id.
   - A rejected `fetchUsers` renders `[data-testid="users-error"]` with the backend message.
10. **Create `frontend/src/tests/RolesView.spec.ts`** (mock `../services/users.service`):
    - Mounting renders one `[data-testid="role-card"]` per role and one `[data-testid="permission-checkbox"]` per permission inside each.
    - Checkboxes are pre-checked to match each role's `permissions` array.
    - With `roles:manage`, toggling a checkbox and clicking `[data-testid="save-role-button"]` calls `setRolePermissions` with the role id and the updated key list.
    - Without `roles:manage`, every checkbox is `disabled` and `[data-testid="save-role-button"]` is absent.
    - The `SYSTEM_ADMINISTRATOR` card renders `[data-testid="admin-role-warning"]`; no other card does.
11. **Create `frontend/src/tests/AppSidebar.spec.ts`** (mount with `setActivePinia`; stub `RouterLink` via `global.stubs` or mount with the real router):
    - A `SYSTEM_ADMINISTRATOR`-permission auth store renders links including "Users" and "Roles & Permissions".
    - A `SUPPORT_AGENT` permission set (`customers:read`, `tickets:read`, `interactions:read`, `interactions:create`, `interactions:associate`) renders "Dashboard", "System Health", and "Communications" and **not** "Users" or "Roles & Permissions".
    - No `[data-testid="sidebar-link"]` ever points at `login`, `forbidden`, or `not-found`.
12. **Create `frontend/src/tests/routerGuard.spec.ts`** (uses `router.push`, so the guard runs — `setActivePinia(createPinia())` in `beforeEach` is mandatory, and `localStorage.clear()` between tests):
    - `router.push('/users')` with no session lands on `login` and `router.currentRoute.value.query.redirect` is `'/users'`.
    - With a session whose permissions include `users:read`, `router.push('/users')` lands on `users`.
    - With a session lacking `users:read`, `router.push('/users')` lands on `forbidden`.
    - With a session, `router.push('/login')` lands on `dashboard`.
    - With a session, `router.push('/')` and `router.push('/health')` both succeed for **every** role — no permission is required to land somewhere.
    - `router.push('/no/such/path')` with a session lands on `not-found`.
13. **Modify `frontend/src/tests/router.spec.ts`** — keep all four existing `resolve` assertions and add: `/login` → `'login'`, `/users` → `'users'`, `/roles` → `'roles'`, `/forbidden` → `'forbidden'`.
14. **Modify `frontend/src/tests/CommunicationsView.spec.ts`** — it mounts `CommunicationsView` directly, so the router guard never runs and its assertions are unaffected. Run it to confirm; if `AppHeader`/`AppSidebar` are not in its render tree (they are not — `App.vue` is never mounted in the suite), **no change is needed**. Do not modify it speculatively.
15. **Unchanged suites** that must still pass with no edit: `SystemHealthView.spec.ts`, `health.service.spec.ts`, `health.store.spec.ts`, `communications.service.spec.ts`, `communications.store.spec.ts`.

---

## Verification Steps

1. **Frontend unit tests:** from `frontend/`, `npm test` — all specs green, including the ten new files and the updated `router.spec.ts`.
2. **Frontend typecheck/build:** from `frontend/`, `npm run build` exits 0 (runs `vue-tsc -b && vite build`) and `npm run typecheck` exits 0.
3. **Backend running:** from `backend/`, `npm run dev` with a valid `JWT_SECRET` in `backend/.env` and the Story 07 seed applied.
4. **Login / logout** (`npm run dev` from `frontend/`, then in a browser at `http://localhost:5173`):
   - Any URL redirects to `/login`. The dashboard is not reachable without a session (**"Vue protected routes work correctly"**).
   - Sign in as `admin@crm.local` / `Passw0rd!` → lands on the dashboard; the header shows "System Administrator" and a **Logout** button.
   - Reload the page → still signed in, still on the dashboard.
   - Click **Logout** → back at `/login`; the browser devtools **Application → Local Storage** panel shows both `crm.auth.*` keys gone; navigating to `/users` redirects to `/login` again (**"User can login and logout"**).
   - Sign in with `admin@crm.local` / `wrongpassword` → the error banner reads "Invalid email or password" and no session is created.
5. **Login with different roles and demonstrate different access** — the work item's demo, in order:
   - **`admin@crm.local`** — sidebar shows Dashboard, System Health, Communications, Users, Roles & Permissions. `/users` lists all six seeded users with their role, branch, and department. `/roles` shows six role cards with their permission checkboxes.
   - **`manager@crm.local`** (CRM Manager) — sidebar shows Users and Roles & Permissions. `/users` renders the directory with **no** create form and the read-only hint; `/roles` renders the cards with every checkbox disabled and no Save button.
   - **`agent@crm.local`** (Support Agent) — sidebar shows Dashboard, System Health, Communications only. Typing `/users` in the address bar lands on the **Access denied** screen. Communications works end-to-end: create an interaction and associate it with a ticket, exactly as in Story 06's demo.
   - **`reports@crm.local`** (Reporting User) — sidebar shows Dashboard, System Health, Communications. Communications loads the timeline, but clicking **Save interaction** shows "Forbidden: insufficient permissions" and the user stays signed in (a `403` must not log anyone out).
   - **`demo.customer@example.com`** (Customer) — signs in and lands on the dashboard; `/users` and `/roles` are both denied. Communications shows the customer-list denial documented in `## Edge Cases & Failure Modes`.
6. **Users can be created and managed by an administrator** (signed in as `admin@crm.local`):
   - On `/users`, create `{ name: 'New Agent', email: 'new.agent@crm.local', password: 'Passw0rd!', role: Support Agent, branch: Riyadh Branch, department: Customer Support }` → the row appears and a success notice shows.
   - Log out, sign in as `new.agent@crm.local` / `Passw0rd!` → the Support Agent sidebar renders.
   - Back as admin: reset that user's password to `NewPassw0rd!` → notice shows; the old password now fails to log in and the new one succeeds.
   - Deactivate that user → the row shows **Inactive**; signing in as them returns "This account has been deactivated".
   - Confirm the admin's own row has a **disabled** deactivate button.
   - Try to create a user with `new.agent@crm.local` again → the error banner shows the backend's `409` message, not "Request failed with status code 409".
7. **Roles are editable and enforced:** on `/roles`, uncheck `interactions:create` on the **Support Agent** card and Save → notice shows. Log out, sign in as `agent@crm.local`, and **Save interaction** on Communications now returns "Forbidden: insufficient permissions" (the permission list is refreshed at login, per `## Edge Cases & Failure Modes`). Restore it by rechecking and saving, or by running `npm run db:seed` from `backend/`.
8. **System Administrator role is protected:** on `/roles`, uncheck `users:manage` on the System Administrator card and Save → the error banner shows the backend's `400` message and the checkboxes stay as the server returned them after the next reload.
9. **Expired/invalid token handling:** with a session active, open devtools and set `localStorage['crm.auth.token'] = 'garbage'`, then navigate to `/users` → the API call returns `401`, the session clears, and the app lands on `/login`.
10. **Regression:** `/health` renders the System Health screen for every signed-in role and the header health pill still works (`frontend/src/components/AppHeader.vue` health-store logic unchanged); the Story 06 Communications flow — create an interaction, pick a channel, associate it with a ticket, see it in the timeline — passes end-to-end as `agent@crm.local`, proving the token is attached to every request.

---

## Done Criteria

- [ ] `frontend/src/config/storage.ts`, `frontend/src/services/authEvents.ts`, and `frontend/src/services/apiError.ts` exist, and `frontend/src/services/api.ts` attaches `Authorization: Bearer <token>` to every request while reacting to a `401` — and only a `401` — by ending the session.
- [ ] `frontend/src/types/index.ts` declares `PERMISSIONS`, `ROLES`, `AuthUser`, `LoginPayload`, `LoginResult`, `CreateUserPayload`, `Role`, `PermissionRecord`, `Branch`, and `Department`, matching the Story 08 response shapes.
- [ ] `frontend/src/stores/auth.ts` exposes `isAuthenticated`, `can(permission)`, `signIn`, `signOut`, `restore`, and `refreshCurrentUser`, persisting the token and user in `localStorage`.
- [ ] `/login` signs a user in and out against the real API, shows the backend's error message on failure, and honours a `?redirect=` target (**"User can login and logout"**).
- [ ] `router.beforeEach` in `frontend/src/router/index.ts` redirects an anonymous user to `/login`, sends a signed-in user without the route's `meta.permission` to `/forbidden`, and bounces a signed-in user away from `/login` (**"Vue protected routes work correctly"**).
- [ ] `frontend/src/components/AppSidebar.vue` derives its links from `router.getRoutes()` filtered by the same `meta.permission` the guard uses, so a visible link can never lead to a denial.
- [ ] `frontend/src/components/AppHeader.vue` shows the signed-in user's name and role plus a working **Logout** button.
- [ ] `/users` lists users with role, branch, department, and status, and lets a `users:manage` holder create a user, reset a password, and deactivate a user — while a `users:read`-only holder sees a read-only directory (**"Users can be created and managed by an administrator"**).
- [ ] `/roles` shows each role's permissions and lets a `roles:manage` holder change them, with the System Administrator warning rendered.
- [ ] A `403` from any API call surfaces the backend's message and leaves the session intact.
- [ ] The Story 06 Communications flow works again end-to-end while signed in as `agent@crm.local`.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0 in `frontend/`.
- [ ] The role-by-role walkthrough in `## Verification Steps` item 5 passes — this is the work item's demo.
