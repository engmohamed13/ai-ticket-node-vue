# Story 03 — Frontend bootstrap: Vue 3 + Vite shell wired to the API (Story: 1)

## Prerequisites

- Story 01 completed: [01-story-backend-bootstrap-1.md](01-story-backend-bootstrap-1.md) — the API answers `GET /api/health` on port 3000 with CORS allowing `http://localhost:5173`.
- Story 02 completed: [02-story-database-prisma-1.md](02-story-database-prisma-1.md) — `GET /api/health` returns `{ status, api, database }` and `GET /api/health/db` is live. This story's UI renders that exact payload, so **the backend contract must be final before you start**.
- PostgreSQL `CustomerCRM` running and migrated — the demo requirement is Vue → API → PostgreSQL end to end.
- Node.js 24 LTS on `PATH` (`node -v` reported `v22.20.0` on this machine on 2026-08-25; see Story 01 Prerequisites).

---

## Story Goal

Create the `frontend/` project: a Vue 3 + TypeScript + Vite application with Vue Router, Pinia, and an axios API client, plus a basic layout and navigation. Its System Health page renders the backend's live health payload, which visibly proves the **Vue → API → PostgreSQL** chain required by the work item's demo.

Outcomes:

1. `npm run dev` in `frontend/` serves the app at `http://localhost:5173`.
2. Navigation between a Dashboard route and a System Health route works, inside a shared header + sidebar layout.
3. A Pinia store calls `GET /api/health` through the shared axios client and the System Health page shows API status, database status, schema version, and latency.
4. Stopping PostgreSQL flips the page to a visible "degraded" state instead of a blank screen or an uncaught error.
5. `npm run build` and `npm test` both pass in `frontend/`.

**Not in scope for this story:** authentication and login (the historical `LoginView`/JWT flow is deliberately **not** reproduced), CRM domain screens (customers, tickets, agents), i18n, and any component library or CSS framework. Styling is plain scoped CSS.

---

## Context — Read These Files First

1. [.squad/stories/projectsetup/1/intake.md](.squad/stories/projectsetup/1/intake.md) — **lines 109–163** for the frontend stack (Vue 3 + TypeScript + Vite, Vue Router, **Pinia**, API client) and the **Demo** paragraph at the end of that block. Acceptance criteria at **lines 167–179**: "Frontend project runs successfully", "Vue can call the API successfully", "Basic application layout and navigation are available".
2. `backend/src/controllers/health.controller.ts` and `backend/src/services/health.service.ts` — read both. The `ApiHealth` and `DatabaseHealth` shapes defined there are the contract the frontend types must mirror **exactly**. Do not guess field names.
3. `backend/src/config/env.ts` — confirm `CORS_ORIGIN` defaults to `http://localhost:5173`, and that `API_PREFIX` is `/api`. The axios `baseURL` must match both.
4. `backend/src/utils/apiResponse.ts` — every response is wrapped as `{ success, message, data }`. The API client unwraps `data`; nothing in the UI reads the envelope directly.
5. Historical frontend precedent — run and read before writing the equivalent file:
   - `git show 988127f:frontend/package.json` — **41 lines**. Note `"type": "module"`, the scripts `dev` / `build` (`vue-tsc -b && vite build`) / `preview` / `test` (`vitest run`), and the devDependency set (`@vitejs/plugin-vue`, `@vue/tsconfig`, `vue-tsc`, `vitest`, `jsdom`, `@vue/test-utils`). **Reuse the script names verbatim.**
   - `git show 988127f:frontend/vite.config.ts` — **13 lines**. Note that it imports `defineConfig` from `vitest/config` and carries the `test: { environment: 'jsdom', globals: true }` block. **Reuse this exactly** — one config file, no separate `vitest.config.ts`.
   - `git show 988127f:frontend/tsconfig.json` (**5 lines**, project references only) and `git show 988127f:frontend/tsconfig.app.json` — the three-file `@vue/tsconfig`-based setup. **Reuse the structure.**
   - `git show 988127f:frontend/src/services/api.ts` — **33 lines**. The axios instance with request/response interceptors. Reuse the **structure**; drop the JWT/localStorage token logic (out of scope) and replace the hardcoded `baseURL: 'http://localhost:3000'` with the env-driven value in task 4.
   - `git show 988127f:frontend/src/router/index.ts` — **61 lines**. `createWebHistory(import.meta.env.BASE_URL)` and the named-route style. Reuse both; drop the `requiresAuth` guard (no auth in this story).
   - `git show 988127f:frontend/src/App.vue` — **65 lines**. The `app-layout` / `app-body` / `main-content` flex shell with `AppHeader` + `AppSidebar` and the 768px media query. Reuse this layout, without the `isAuthenticated` branch.
   - `git show 988127f:frontend/src/main.ts` — the `createApp` → `app.use(router)` → `app.mount('#app')` order. You are adding `app.use(createPinia())`.
   - `git show 988127f:frontend/src/types/index.ts` — the `export interface` style for API types.
   - `git show 988127f:frontend/src/tests/TicketsView.spec.ts` — the existing component-test pattern to match in `frontend/src/tests/`.

---

## Frontend Tasks

### 1 — Scaffold `frontend/`

Create `frontend/` and install from inside it. Let npm resolve current versions and commit `frontend/package-lock.json`:

```bash
npm install vue vue-router pinia axios
npm install --save-dev vite @vitejs/plugin-vue typescript vue-tsc @vue/tsconfig @types/node vitest @vue/test-utils jsdom
```

**Create file: `frontend/package.json`**

```json
{
  "name": "customer-support-crm-frontend",
  "private": true,
  "version": "1.0.0",
  "description": "Vue 3, Vite, and TypeScript frontend for the CustomerSupportCRM project.",
  "type": "module",
  "engines": {
    "node": ">=24.0.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "typecheck": "vue-tsc --noEmit"
  },
  "license": "MIT"
}
```

**Create file: `frontend/.gitignore`** — copy `git show 988127f:frontend/.gitignore` verbatim, then confirm it covers `node_modules`, `dist`, and `.env.local`.

**Create file: `frontend/index.html`** — model on `git show 988127f:frontend/index.html`; set `<title>CustomerSupportCRM</title>`, keep `<div id="app"></div>` and `<script type="module" src="/src/main.ts"></script>`.

### 2 — TypeScript and Vite config

**Create files:** `frontend/tsconfig.json`, `frontend/tsconfig.app.json`, `frontend/tsconfig.node.json` — copy all three from `988127f` verbatim (`tsconfig.json` is the 5-line project-references file). They already extend `@vue/tsconfig` and enable `noUnusedLocals` / `noUnusedParameters`, matching the backend's strictness.

**Create file: `frontend/vite.config.ts`** — copy the 13-line historical file verbatim, then add a `server` block so the dev port is explicit and matches the backend's `CORS_ORIGIN`:

```ts
  server: {
    port: 5173,
    strictPort: true
  },
```

`strictPort` matters: without it Vite silently moves to 5174 when 5173 is taken, and every request is then blocked by CORS.

**Do not** add a Vite dev proxy. The backend already allows the `http://localhost:5173` origin (Story 01 task 9), so the browser talks to `http://localhost:3000/api` directly. Exercising real CORS in development is the point.

### 3 — Environment configuration

**Create file: `frontend/.env.example`**

```env
# Base URL of the CustomerSupportCRM API, including the /api prefix.
VITE_API_BASE_URL=http://localhost:3000/api
```

**Create file: `frontend/.env.development`** with the same content. Vite only exposes variables prefixed `VITE_`.

**Create file: `frontend/src/config/env.ts`** — the single place reading `import.meta.env`, with a build-time default so a missing file cannot break the dev loop:

```ts
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';
```

Nothing else may read `import.meta.env.VITE_*` — grep for `VITE_` before finishing; the only hit outside config files is this line.

### 4 — API client

**Create file: `frontend/src/services/api.ts`**

Follow the historical structure (axios instance + response interceptor), env-driven and without the auth logic:

```ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../config/env';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(error)
);

export default api;
```

**Create file: `frontend/src/types/index.ts`** — mirror the backend interfaces read in Context item 2. Use the `export interface` style of the historical types file:

```ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

export interface ApiHealth {
  status: 'ok';
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
}

export interface DatabaseHealth {
  status: 'up' | 'down';
  latencyMs: number | null;
  schemaVersion: string | null;
  error: string | null;
}

export interface HealthPayload {
  status: 'ok' | 'degraded';
  api: ApiHealth;
  database: DatabaseHealth;
}
```

**Create file: `frontend/src/services/health.service.ts`** — the only module that knows the health endpoint paths, and the only place the `{ success, message, data }` envelope is unwrapped:

```ts
import api from './api';
import type { ApiResponse, DatabaseHealth, HealthPayload } from '../types';

export const fetchHealth = async (): Promise<HealthPayload> => {
  const response = await api.get<ApiResponse<HealthPayload>>('/health', {
    // 503 is a valid, meaningful response here, not a transport failure.
    validateStatus: (status) => status === 200 || status === 503
  });
  if (!response.data.data) throw new Error(response.data.message || 'Empty health payload');
  return response.data.data;
};

export const fetchDatabaseHealth = async (): Promise<DatabaseHealth> => {
  const response = await api.get<ApiResponse<{ database: DatabaseHealth }>>('/health/db', {
    validateStatus: (status) => status === 200 || status === 503
  });
  if (!response.data.data) throw new Error(response.data.message || 'Empty database health payload');
  return response.data.data.database;
};
```

**The `validateStatus` override is required.** Story 02 returns **503** when the database is down; axios would otherwise reject, and the UI would show a generic network error instead of the real degraded payload.

### 5 — Pinia store

**Create file: `frontend/src/stores/health.ts`**

A setup-style store owning all health state — no component calls the service directly:

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { fetchHealth } from '../services/health.service';
import type { HealthPayload } from '../types';

export const useHealthStore = defineStore('health', () => {
  const payload = ref<HealthPayload | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastCheckedAt = ref<string | null>(null);

  const isHealthy = computed(() => payload.value?.status === 'ok');
  const isDegraded = computed(() => payload.value?.status === 'degraded');

  const load = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      payload.value = await fetchHealth();
      lastCheckedAt.value = new Date().toISOString();
    } catch (cause) {
      payload.value = null;
      error.value = cause instanceof Error ? cause.message : 'Unable to reach the API';
    } finally {
      loading.value = false;
    }
  };

  return { payload, loading, error, lastCheckedAt, isHealthy, isDegraded, load };
});
```

Three distinct render states must be representable and distinguishable: **loading**, **error** (API unreachable — `payload` null), and **degraded** (API reachable, database down — `payload.status === 'degraded'`). Do not collapse the last two.

**Create file: `frontend/src/main.ts`** — the historical order plus Pinia:

```ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import './style.css';
import App from './App.vue';
import router from './router';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
```

`createPinia()` must be registered **before** `router`, so a future router guard can read a store.

### 6 — Router and layout

**Create file: `frontend/src/router/index.ts`** — `createWebHistory(import.meta.env.BASE_URL)` and named routes, per the historical file, with **no** auth guard:

| path | name | component |
|---|---|---|
| `/` | `dashboard` | `views/DashboardView.vue` |
| `/health` | `system-health` | `views/SystemHealthView.vue` |
| `/:pathMatch(.*)*` | `not-found` | `views/NotFoundView.vue` |

**Create file: `frontend/src/App.vue`** — copy the historical `app-layout` / `app-body` / `main-content` flex shell and its 768px media query, but **remove** the `isAuthenticated` computed and the `v-if` branches: header and sidebar always render.

**Create file: `frontend/src/components/AppHeader.vue`** — app title "CustomerSupportCRM" plus a small status pill bound to `useHealthStore().payload?.status` (green `ok`, amber `degraded`, grey unknown).

**Create file: `frontend/src/components/AppSidebar.vue`** — `<RouterLink>` navigation to `dashboard` and `system-health` **by name**, with the active link styled via `router-link-active`.

**Create file: `frontend/src/style.css`** — a small global reset plus CSS custom properties for the status colours (`--color-ok`, `--color-degraded`, `--color-down`). Model the file size and tone on `git show 988127f:frontend/src/style.css`; all component styling stays in `<style scoped>` blocks.

**Create file: `frontend/src/views/DashboardView.vue`** — a heading, one short paragraph naming the stack (Vue 3 + Vite → Express API → PostgreSQL `CustomerCRM`), and a `<RouterLink>` to the health page. No data fetching here.

**Create file: `frontend/src/views/NotFoundView.vue`** — "Page not found" and a link home.

### 7 — System Health view (the demo screen)

**Create file: `frontend/src/views/SystemHealthView.vue`**

`<script setup lang="ts">`, calling the store from `onMounted`:

```ts
const store = useHealthStore();
onMounted(() => { void store.load(); });
```

Template requirements — each state must be visually unmistakable during the demo:

- **Loading:** the text "Checking system health…" while `store.loading` is true.
- **Error** (`store.error` set): a red panel reading "Cannot reach the API" plus `store.error`, and a **Retry** button calling `store.load()`.
- **Loaded:** two cards.
  - *API* — `status`, `environment`, `uptimeSeconds`.
  - *Database* — `status` (`up`/`down`), `latencyMs` rendered as `"{n} ms"`, `schemaVersion`, and `error` shown **only** when `status === 'down'`.
- **Degraded** (`store.isDegraded`): an amber banner reading "API is reachable but the database is not." above the cards. This is the state to demonstrate by stopping PostgreSQL.
- A **Refresh** button calling `store.load()`, and `lastCheckedAt` rendered with `toLocaleTimeString()`.

Add `data-testid` attributes on the elements the tests assert against: `health-loading`, `health-error`, `health-degraded`, `api-status`, `db-status`, `db-schema-version`, `refresh-button`.

### 8 — Root README

**File: `README.md`** (create it — the working tree has none; the historical root README is at `git show 988127f:README.md`)

Keep it short and operational:

- One-paragraph project summary for **CustomerSupportCRM**.
- **Prerequisites:** Node.js 24 LTS, PostgreSQL 16, a `CustomerCRM` database.
- **Run order**, as three numbered steps: create/migrate the database (link to `database/README.md`, relative to the repository root), start the backend (`cd backend && npm install && npm run dev` → `http://localhost:3000`), start the frontend (`cd frontend && npm install && npm run dev` → `http://localhost:5173`).
- **Demo script:** open `http://localhost:5173/health`, show API + database `up`; stop PostgreSQL; refresh and show the amber degraded banner; restart PostgreSQL and refresh back to green.
- A repository-layout list: `backend/`, `frontend/`, `database/`, `.squad/`.

## Backend Tasks

**No backend changes required.** This story consumes the contract delivered by Stories 01 and 02. If a field the frontend needs turns out to be missing, stop and report it rather than editing backend code under this story — the backend contract is fixed by [02-story-database-prisma-1.md](02-story-database-prisma-1.md).

---

## Edge Cases & Failure Modes

- **Backend not running.** `GET /api/health` fails at the transport layer; the store's catch sets `error` and the view shows the red "Cannot reach the API" panel with a Retry button. Handled in `src/stores/health.ts` (task 5) and rendered in `SystemHealthView.vue` (task 7).
- **Database down, API up.** The API answers **503** with a real payload. Without the `validateStatus` override in `src/services/health.service.ts` (task 4) axios rejects and the user sees the wrong message. This is the single most likely defect in this story — cover it with the test in Test Plan item 3.
- **Vite port drift.** If 5173 is occupied, Vite would normally move to 5174 and every API call would fail CORS with an opaque browser error. `strictPort: true` (task 2) makes Vite fail loudly instead.
- **CORS origin mismatch.** If the backend's `CORS_ORIGIN` was changed from `http://localhost:5173`, the browser blocks the request while `curl` still succeeds — a confusing failure. Check `backend/.env` before debugging the frontend.
- **Backend on a different port.** `VITE_API_BASE_URL` must include the `/api` prefix. `http://localhost:3000` without it produces 404s from the not-found middleware, surfacing as `Route not found: GET /health`.
- **Vite env vars are build-time.** Editing `.env.development` requires restarting `npm run dev`; a hot reload will not pick it up.
- **`null` latency and schema version.** When the database is down both are `null`. Render an em dash rather than `"null ms"`. Enforced in the template in task 7.
- **Request timeout.** The axios `timeout: 8000` turns a hung backend into an error state within 8 seconds instead of an indefinite spinner.
- **Slow first paint on the dashboard.** `DashboardView` must not fetch health, so the first route renders instantly. Only `/health` fetches.
- **Unverified dependency majors.** No version is pinned here. The historical `frontend/package.json` at `988127f` recorded `vue-router ^5.1.0`, `vue ^3.5.39`, `axios ^1.18.1`, `vite ^8.1.1`, and `vitest ^4.1.10`. If a current major has moved its API (most likely `createRouter` options or Pinia's setup-store signature), follow the installed version's documentation and keep the documented *behaviour*.
- **Arabic characters in the repository path.** Quote all paths in shell commands (`cd "d:/…/Ticket Mini Module/frontend"`). If a tool misbehaves on the path, run it from inside `frontend/` with relative paths only.

---

## Test Plan

Tests live in `frontend/src/tests/`, matching the historical layout (`git show 988127f:frontend/src/tests/TicketsView.spec.ts`). They run under `vitest` with the `jsdom` + `globals: true` config from `vite.config.ts`.

1. **Create `frontend/src/tests/health.store.spec.ts`** (unit; `vi.mock('../services/health.service')`, `setActivePinia(createPinia())` in `beforeEach`):
   - `load()` success → `payload` set, `isHealthy` true, `error` null, `loading` false, `lastCheckedAt` non-null.
   - service rejects → `payload` null, `error` is the rejection message, `loading` false.
   - success payload with `status: 'degraded'` → `isDegraded` true and `isHealthy` false.
2. **Create `frontend/src/tests/health.service.spec.ts`** (unit; `vi.mock('../services/api')`):
   - a 200 envelope resolves to `response.data.data`.
   - a **503** envelope with `status: 'degraded'` resolves normally (does **not** throw) — this is the `validateStatus` regression test.
   - an envelope whose `data` is `null` throws with the envelope's `message`.
3. **Create `frontend/src/tests/SystemHealthView.spec.ts`** (component, `@vue/test-utils` `mount` with a stubbed store):
   - store loading → `[data-testid="health-loading"]` exists.
   - store error → `[data-testid="health-error"]` exists and contains the error text.
   - healthy payload → `[data-testid="api-status"]` shows `ok`, `[data-testid="db-status"]` shows `up`, `[data-testid="db-schema-version"]` shows `1`.
   - degraded payload → `[data-testid="health-degraded"]` exists and `db-status` shows `down`.
   - clicking `[data-testid="refresh-button"]` calls the store's `load` once.
   - `latencyMs: null` renders an em dash, not `"null"`.
4. **Create `frontend/src/tests/router.spec.ts`** (unit) — the router resolves `/` to the route named `dashboard`, `/health` to `system-health`, and an unknown path to `not-found`.
5. **Manual end-to-end smoke** (the work item's demo, not automated): both servers running, browser at `http://localhost:5173/health` shows API `ok` and database `up`; stopping PostgreSQL and refreshing shows the degraded banner. Recorded in `## Verification Steps`.

No tests are modified or removed — `frontend/` is new in this story.

---

## Verification Steps

1. **Install:** from `frontend/`, `npm install` completes and writes `frontend/package-lock.json`.
2. **Frontend builds:** from `frontend/`, `npm run build` exits 0 and produces `frontend/dist/index.html`.
3. **Typecheck:** from `frontend/`, `npm run typecheck` exits 0.
4. **Tests pass:** from `frontend/`, `npm test` — all four spec files green, no live backend needed.
5. **Backend builds:** from `backend/`, `npm run build` and `npm test` still exit 0 (nothing in this story touched the backend).
6. **Frontend runs:** with PostgreSQL up and `npm run dev` running in `backend/`, run `npm run dev` in `frontend/` and open `http://localhost:5173`:
   - The dashboard renders inside the header + sidebar layout.
   - The sidebar link navigates to `/health` without a full page reload, and the browser URL updates.
   - `/health` shows API `status: ok`, `environment: development`, database `status: up`, a numeric latency, and `schemaVersion: 1` (**Vue can call the API successfully**).
   - The header status pill is green.
   - The browser devtools Network tab shows a `200` for `http://localhost:3000/api/health` with **no CORS error** in the console.
7. **Degraded path (the demo):** stop PostgreSQL, click **Refresh** → amber "API is reachable but the database is not." banner, `db-status: down`, latency and schema version as em dashes, header pill amber. Restart PostgreSQL, click **Refresh** → back to green.
8. **API-down path:** stop the backend, click **Refresh** → the red "Cannot reach the API" panel with a working Retry button. No blank screen, no uncaught error in the console.
9. **Port guard:** occupy 5173 (`npx http-server -p 5173` or a second `vite`), then `npm run dev` → Vite exits with a port-in-use error instead of silently binding 5174.
10. **Production build serves:** `npm run build && npm run preview`, open the printed URL, and confirm `/health` still loads data (this proves `VITE_API_BASE_URL` was baked in correctly).
11. **Regression:** `git status --short` shows no changes under `.squad/`; `git check-ignore -v frontend/node_modules frontend/dist` reports both ignored.
12. **Env discipline:** `grep -rn "VITE_" frontend/src` returns only the line in `src/config/env.ts`.

---

## Done Criteria

- [ ] `frontend/` exists with `src/components`, `src/views`, `src/router`, `src/stores`, `src/services`, `src/config`, `src/types`, and `src/tests`.
- [ ] `npm run dev` serves the app at `http://localhost:5173` with `strictPort` enabled (**Frontend project runs successfully**).
- [ ] Vue Router provides `/`, `/health`, and a catch-all route, all reachable from the sidebar by name (**Basic application layout and navigation are available**).
- [ ] Pinia is registered in `main.ts` before the router, and `stores/health.ts` is the only owner of health state.
- [ ] The axios client reads its base URL from `VITE_API_BASE_URL` via `src/config/env.ts`, and `import.meta.env` is read in that one place only.
- [ ] `/health` renders live API and database data fetched from `GET /api/health` (**Vue can call the API successfully**).
- [ ] A 503 degraded response renders the amber banner and real database error — it does not fall through to the generic error panel.
- [ ] An unreachable API renders the red error panel with a working Retry button.
- [ ] `frontend/.env.example` documents `VITE_API_BASE_URL`, and `.env.development` is present.
- [ ] Root `README.md` documents prerequisites, the three-step run order, and the demo script.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0 in `frontend/`.
- [ ] End-to-end demo verified in a browser: Vue → API → PostgreSQL `CustomerCRM`, including the degraded and API-down paths.

**All three stories for work item 1 are complete at this point. Report to the user with the demo result.**
