# Story 12 — Customer list, profile, notes/attachments, and create/edit forms (Story: 4)

## Prerequisites

- Story 11 completed: [11-story-customer-apis-4.md](11-story-customer-apis-4.md). `GET/POST /api/customers`, `GET/PATCH /api/customers/:id`, `GET/POST /api/customers/:id/notes`, `GET/POST /api/customers/:id/attachments`, `GET /api/customers/:id/attachments/:attachmentId/download`, and `DELETE /api/customers/:id/attachments/:attachmentId` must all be live, all gated by `customers:read`/`customers:manage`.
- Story 10 completed: [10-story-customer-data-model-4.md](10-story-customer-data-model-4.md). `npm run db:seed` must have been run so the demo customer has a full contact profile, a status, and one attributed note (`agent@crm.local`).
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). `frontend/src/services/api.ts` (token interceptor), `frontend/src/services/apiError.ts` (`toErrorMessage`), `frontend/src/stores/auth.ts` (`auth.can(permission)`), the `router.beforeEach` guard, and the `AppSidebar` `navLabel`-driven nav all exist and are reused unchanged.
- Story 06 completed: [../communicationchannels/06-story-communication-timeline-ui-2.md](../communicationchannels/06-story-communication-timeline-ui-2.md). `CommunicationsView.vue`'s timeline rendering (channel/direction badges, chronological list) is the precedent this story's customer-detail timeline section reuses verbatim.

---

## Story Goal

Give the six seeded roles a real customer-management screen:

1. `/customers` lists every customer with a search box and a status filter, and — for a `customers:manage` role — an inline create form (mirroring `/users`).
2. `/customers/:id` shows the full profile (contact info, status), an edit form for `customers:manage` roles, a notes panel (add + list), an attachments panel (upload, list, download, delete), the customer's ticket list, and the unified interaction timeline (reusing the existing `GET /api/tickets?customerId=` and `GET /api/customers/:id/timeline` endpoints — no new backend work).
3. Both routes are permission-gated on `customers:read`; the sidebar picks up the new `/customers` link automatically via the existing `navLabel`-driven `AppSidebar` — no sidebar code changes are needed.
4. The exact intake demo works end to end: "Create a customer, open the customer profile and demonstrate the customer's information and history."

**Not in scope for this story:** deleting a customer (no such endpoint — Story 11), editing or deleting a note once posted, drag-and-drop upload (a plain `<input type="file">` is sufficient), and attachment previews/thumbnails (download-only).

---

## Context — Read These Files First

1. [.squad/stories/customermanagement/4/intake.md](../../stories/customermanagement/4/intake.md) — `## Description`: "Customer list UI", "Customer details UI", "Create/Edit forms"; `## Demo`: "Create a customer, open the customer profile and demonstrate the customer's information and history" — this is the exact walkthrough `## Verification Steps` item 6 performs.
2. [11-story-customer-apis-4.md](11-story-customer-apis-4.md) — re-read task 2 (the exact `Customer`/`CustomerNote`/`CustomerAttachment` response shapes — note attachments never include `storagePath`) and task 5 (query params `search`/`status`, the multipart `POST /:id/attachments` body field name is `file`).
3. `frontend/src/types/index.ts` (159 lines) — read the whole file. The current `Customer` interface (33–39) is the minimal Story 04 shape; task 1 replaces it. `PERMISSIONS` (72–86) already lists `'customers:read'` but not `'customers:manage'` — task 1 adds it, mirroring the backend edit from Story 10 task 3.
4. `frontend/src/services/api.ts` — read the whole file (Story 09's version: axios instance with `headers: { 'Content-Type': 'application/json' }` set at creation, a request interceptor attaching the bearer token, a response interceptor emitting `onUnauthorized` on `401`). **The default `Content-Type: application/json` header is a problem for the attachment upload call** — task 2's `uploadCustomerAttachment` must override it per-request (see task 2) or the browser will send a malformed multipart body with the wrong boundary.
5. `frontend/src/services/users.service.ts` (61 lines) and `frontend/src/services/communications.service.ts` (40 lines) — the two established service patterns: `response.data.data ?? []` for list reads, `throw new Error(response.data.message || '…')` for mutations returning null data. Task 2 follows both.
6. `frontend/src/stores/users.ts` (142 lines) and `frontend/src/stores/communications.ts` (84 lines) — the Pinia setup-store pattern: `ref` state, async actions wrapping `loading`/`error` in `try/catch/finally`, mutating actions returning `boolean`, a separate `notice` ref for success messages. Task 3 follows this exactly, combining both stores' shapes (`users.ts`'s CRUD-with-notice pattern for the customer profile itself, `communications.ts`'s `selectCustomer`-loads-everything pattern for the detail view's tickets/timeline).
7. `frontend/src/views/UsersView.vue` (218 lines) — read the whole file. The `canManage` computed (line 28, `auth.can('users:manage')`), the conditional create-form card (84–134) vs. the read-only `AlertBanner` (135), and the table-with-actions-column shape (145–197) are all reused for `CustomersView.vue`.
8. `frontend/src/views/CommunicationsView.vue` — read the whole file. The timeline `<ul>`/`<li>` markup (135–158) and its scoped styles (`.timeline`, `.timeline-item`, `.timeline-meta`, `.occurred-at`, `.body` — 176–216) are copied verbatim into `CustomerDetailView.vue`'s history section; do not redesign this markup.
9. `frontend/src/components/ui/PageHeader.vue`, `StatusBadge.vue`, `EmptyState.vue`, `LoadingState.vue`, `AlertBanner.vue` — read all five whole files (each under 65 lines). `StatusBadge`'s `variant` prop (`neutral | primary | success | warning | danger | info`) is what task 5 maps `CustomerStatus` onto.
10. `frontend/src/router/index.ts` (97 lines) — read the whole file. `RouteMeta` (13–22) already has `permission?: Permission` and `navLabel?: string`; `ForbiddenView`'s route (63–67) has neither, which is the precedent task 6 follows for the `customer-detail` route (no `navLabel`, so it never appears in the sidebar — only reachable via a `RouterLink` from the list).
11. `frontend/src/tests/router.spec.ts` — read the whole file; note it uses `router.resolve(...)`, not `push`, so it does not exercise the guard (context already established in Story 09's plan).
12. `frontend/src/tests/UsersView.spec.ts` and `frontend/src/tests/communications.store.spec.ts` — the three-layer Vitest pattern (`vi.mock('../services/…')`, `setActivePinia(createPinia())` in `beforeEach`, `mount(...)` + `flushPromises()` + `data-testid` lookups) that task 8's new spec files replicate.
13. `frontend/tsconfig.app.json` — `"noUnusedLocals"`, `"noUnusedParameters"`, `"erasableSyntaxOnly"` are on (confirmed via Story 09's context notes); no `enum` (use `as const` tuples), `import type` for every type-only import.
14. `frontend/package.json` — `vue@^3.5`, `vue-router@^5.2`, `pinia@^4.0`, `axios@^1.19`. No new dependency is needed for this story — the file input and `FormData` are native browser APIs.

---

## Frontend Tasks

### 1 — Types

**File: `frontend/src/types/index.ts`**

Replace the existing `Customer` interface (currently lines 33–39):

```ts
export const CUSTOMER_STATUSES = ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] as const;
export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerFormPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  address?: string;
  city?: string;
  country?: string;
  status?: CustomerStatus;
}

export interface CustomerNote {
  id: number;
  body: string;
  customerId: number;
  authorId: number;
  author: { id: number; name: string };
  createdAt: string;
}

export interface CustomerAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  customerId: number;
  uploadedById: number;
  createdAt: string;
}
```

`CustomerFormPayload` is used for **both** create and update — every field is already optional except `name`/`email`, matching the backend's `createCustomerSchema`/`updateCustomerSchema` split (Story 11 task 5) where the update variant just makes `name`/`email` optional too; the frontend form always has a full profile in scope regardless of create-vs-edit, so one payload type covers both call sites in task 2.

In `PERMISSIONS` (currently lines 72–86), add `'customers:manage'` immediately after `'customers:read'`, mirroring the backend edit in Story 10 task 3 exactly (hand-copied tuple, same relationship `CHANNELS` and the rest of `PERMISSIONS` already have — see Story 09's `## Dependency notes` in [../authenticationandusermanagement/00-overview.md](../authenticationandusermanagement/00-overview.md)).

### 2 — Customers service

**Create file: `frontend/src/services/customers.service.ts`**

```ts
import api from './api';
import type {
  ApiResponse,
  Customer,
  CustomerAttachment,
  CustomerFormPayload,
  CustomerNote,
  CustomerStatus,
  Interaction,
  Ticket
} from '../types';

export interface CustomerListFilter {
  search?: string;
  status?: CustomerStatus;
}

export const fetchCustomers = async (filter: CustomerListFilter = {}): Promise<Customer[]> => {
  const response = await api.get<ApiResponse<Customer[]>>('/customers', {
    params: {
      search: filter.search && filter.search.length > 0 ? filter.search : undefined,
      status: filter.status
    }
  });
  return response.data.data ?? [];
};

export const fetchCustomer = async (id: number): Promise<Customer> => {
  const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
  if (!response.data.data) throw new Error(response.data.message || 'Customer not found');
  return response.data.data;
};

export const createCustomer = async (payload: CustomerFormPayload): Promise<Customer> => {
  const response = await api.post<ApiResponse<Customer>>('/customers', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to create the customer');
  return response.data.data;
};

export const updateCustomer = async (id: number, payload: CustomerFormPayload): Promise<Customer> => {
  const response = await api.patch<ApiResponse<Customer>>(`/customers/${id}`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to update the customer');
  return response.data.data;
};

export const fetchCustomerTickets = async (customerId: number): Promise<Ticket[]> => {
  const response = await api.get<ApiResponse<Ticket[]>>('/tickets', { params: { customerId } });
  return response.data.data ?? [];
};

export const fetchCustomerTimeline = async (customerId: number): Promise<Interaction[]> => {
  const response = await api.get<ApiResponse<Interaction[]>>(`/customers/${customerId}/timeline`);
  return response.data.data ?? [];
};

export const fetchCustomerNotes = async (customerId: number): Promise<CustomerNote[]> => {
  const response = await api.get<ApiResponse<CustomerNote[]>>(`/customers/${customerId}/notes`);
  return response.data.data ?? [];
};

export const addCustomerNote = async (customerId: number, body: string): Promise<CustomerNote> => {
  const response = await api.post<ApiResponse<CustomerNote>>(`/customers/${customerId}/notes`, { body });
  if (!response.data.data) throw new Error(response.data.message || 'Unable to add the note');
  return response.data.data;
};

export const fetchCustomerAttachments = async (customerId: number): Promise<CustomerAttachment[]> => {
  const response = await api.get<ApiResponse<CustomerAttachment[]>>(`/customers/${customerId}/attachments`);
  return response.data.data ?? [];
};

export const uploadCustomerAttachment = async (customerId: number, file: File): Promise<CustomerAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<ApiResponse<CustomerAttachment>>(
    `/customers/${customerId}/attachments`,
    formData,
    // Override the api.ts instance default of 'application/json': setting Content-Type
    // to undefined lets the browser generate the correct multipart boundary itself.
    { headers: { 'Content-Type': undefined } }
  );
  if (!response.data.data) throw new Error(response.data.message || 'Unable to upload the attachment');
  return response.data.data;
};

export const deleteCustomerAttachment = async (customerId: number, attachmentId: number): Promise<void> => {
  await api.delete<ApiResponse<null>>(`/customers/${customerId}/attachments/${attachmentId}`);
};

export const downloadCustomerAttachment = async (
  customerId: number,
  attachmentId: number,
  fileName: string
): Promise<void> => {
  const response = await api.get<Blob>(`/customers/${customerId}/attachments/${attachmentId}/download`, {
    responseType: 'blob'
  });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
```

`fetchCustomerTickets` duplicates `communications.service.ts`'s `fetchTickets` rather than importing it — matching this codebase's established pattern of each service file being self-contained (`communications.service.ts` and `users.service.ts` share no imports today either).

### 3 — Customers store

**Create file: `frontend/src/stores/customers.ts`**

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  addCustomerNote,
  createCustomer,
  deleteCustomerAttachment,
  downloadCustomerAttachment,
  fetchCustomer,
  fetchCustomerAttachments,
  fetchCustomerNotes,
  fetchCustomerTickets,
  fetchCustomerTimeline,
  fetchCustomers,
  updateCustomer,
  uploadCustomerAttachment
} from '../services/customers.service';
import type { CustomerListFilter } from '../services/customers.service';
import type {
  Customer,
  CustomerAttachment,
  CustomerFormPayload,
  CustomerNote,
  Interaction,
  Ticket
} from '../types';

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<Customer[]>([]);
  const selectedCustomer = ref<Customer | null>(null);
  const notes = ref<CustomerNote[]>([]);
  const attachments = ref<CustomerAttachment[]>([]);
  const tickets = ref<Ticket[]>([]);
  const timeline = ref<Interaction[]>([]);
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const hasCustomers = computed(() => customers.value.length > 0);

  const loadCustomers = async (filter: CustomerListFilter = {}): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      customers.value = await fetchCustomers(filter);
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load customers');
    } finally {
      loading.value = false;
    }
  };

  const loadCustomerDetail = async (customerId: number): Promise<void> => {
    detailLoading.value = true;
    error.value = null;
    try {
      const [customer, customerNotes, customerAttachments, customerTickets, customerTimeline] =
        await Promise.all([
          fetchCustomer(customerId),
          fetchCustomerNotes(customerId),
          fetchCustomerAttachments(customerId),
          fetchCustomerTickets(customerId),
          fetchCustomerTimeline(customerId)
        ]);
      selectedCustomer.value = customer;
      notes.value = customerNotes;
      attachments.value = customerAttachments;
      tickets.value = customerTickets;
      timeline.value = customerTimeline;
    } catch (cause) {
      selectedCustomer.value = null;
      error.value = toErrorMessage(cause, 'Unable to load the customer profile');
    } finally {
      detailLoading.value = false;
    }
  };

  const submitCustomer = async (payload: CustomerFormPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const created = await createCustomer(payload);
      customers.value = [...customers.value, created].sort((a, b) => a.name.localeCompare(b.name));
      notice.value = `Customer ${created.name} created`;
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to create the customer');
      return false;
    }
  };

  const saveCustomer = async (customerId: number, payload: CustomerFormPayload): Promise<boolean> => {
    error.value = null;
    notice.value = null;
    try {
      const updated = await updateCustomer(customerId, payload);
      selectedCustomer.value = updated;
      notice.value = 'Customer updated';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to update the customer');
      return false;
    }
  };

  const submitNote = async (customerId: number, body: string): Promise<boolean> => {
    error.value = null;
    try {
      const created = await addCustomerNote(customerId, body);
      notes.value = [created, ...notes.value];
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to add the note');
      return false;
    }
  };

  const submitAttachment = async (customerId: number, file: File): Promise<boolean> => {
    error.value = null;
    try {
      const created = await uploadCustomerAttachment(customerId, file);
      attachments.value = [created, ...attachments.value];
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to upload the attachment');
      return false;
    }
  };

  const removeAttachment = async (customerId: number, attachmentId: number): Promise<boolean> => {
    error.value = null;
    try {
      await deleteCustomerAttachment(customerId, attachmentId);
      attachments.value = attachments.value.filter((entry) => entry.id !== attachmentId);
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to delete the attachment');
      return false;
    }
  };

  const downloadAttachment = async (customerId: number, attachment: CustomerAttachment): Promise<void> => {
    try {
      await downloadCustomerAttachment(customerId, attachment.id, attachment.fileName);
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to download the attachment');
    }
  };

  return {
    customers,
    selectedCustomer,
    notes,
    attachments,
    tickets,
    timeline,
    loading,
    detailLoading,
    error,
    notice,
    hasCustomers,
    loadCustomers,
    loadCustomerDetail,
    submitCustomer,
    saveCustomer,
    submitNote,
    submitAttachment,
    removeAttachment,
    downloadAttachment
  };
});
```

`loadCustomerDetail` sets `selectedCustomer.value = null` on failure (e.g. a `404` from a bad `:id` in the URL) so `CustomerDetailView.vue` can distinguish "still loading" from "failed to load" from "loaded" with three simple `v-if` branches, the same three-state pattern `SystemHealthView.vue` and `CommunicationsView.vue` already use for their own loads.

### 4 — Customers list view

**Create file: `frontend/src/views/CustomersView.vue`**

Follow `frontend/src/views/UsersView.vue`'s structure exactly:

- `onMounted` calls `store.loadCustomers()`.
- A search `<input>` (`data-testid="customer-search-input"`) and a status `<select>` (`data-testid="customer-status-select"`, options built from `CUSTOMER_STATUSES` plus a blank "All statuses"), both wired to call `store.loadCustomers({ search, status })` on submit/change (debounce is not required for this mini-module — a small "Search" button, `data-testid="customer-search-submit"`, triggers the reload explicitly rather than firing a request per keystroke).
- `const canManage = computed(() => auth.can('customers:manage'))`, gating a create-form card (`data-testid="create-customer-form"`) with fields `name`, `email`, `phone`, `company`, `address`, `city`, `country`, `status` (a `<select>` defaulting to `ACTIVE`) — same `form-grid`/`form-field` markup as `UsersView.vue`'s create form (89–129). On submit, call `store.submitCustomer(...)` and clear the form fields on success.
- `AlertBanner` for `store.error` / `store.notice`, exactly as `UsersView.vue` lines 81–82.
- `LoadingState` while `store.loading`; `EmptyState` (`title="No customers yet"`) when `!store.loading && !store.hasCustomers`.
- A table (`data-testid="customers-table"`) with columns Name, Email, Company, Status (`StatusBadge`, variant per task 5's mapping), Created — each row (`data-testid="customer-row"`) is a `RouterLink` to `{ name: 'customer-detail', params: { id: customer.id } }` on the name cell.

### 5 — Status-to-badge-variant mapping

Define once, in `CustomersView.vue`'s `<script setup>` and again in `CustomerDetailView.vue`'s (small enough that a shared helper module is not worth introducing for this mini-module — two call sites, four cases):

```ts
const statusVariant = (status: CustomerStatus): 'success' | 'neutral' | 'primary' | 'warning' => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PROSPECT':
      return 'primary';
    case 'INACTIVE':
      return 'neutral';
    case 'ARCHIVED':
      return 'warning';
  }
};
```

### 6 — Customer detail view

**Create file: `frontend/src/views/CustomerDetailView.vue`**

- `const route = useRoute()`; `const customerId = computed(() => Number(route.params.id))`.
- `onMounted(() => store.loadCustomerDetail(customerId.value))`.
- Three-state render driven by the store (context item 3's `loadCustomerDetail` contract):
  - `store.detailLoading` → `LoadingState`.
  - `!store.detailLoading && !store.selectedCustomer` → `EmptyState` (`title="Customer not found"`, `description="It may have been removed, or the link is incorrect."`) with a `RouterLink` back to `{ name: 'customers' }`.
  - Otherwise, the full profile.
- **Profile card:** view mode shows every `Customer` field as text (`StatusBadge` for `status`); for `canManage`, an "Edit" button (`data-testid="edit-customer-button"`) toggles an edit form (`data-testid="edit-customer-form"`) pre-filled from `store.selectedCustomer`, submitting via `store.saveCustomer(customerId.value, payload)` and toggling back to view mode on success — same toggle pattern as none of the existing views use directly, but the form markup itself is `UsersView.vue`'s create-form fields reused for edit.
- **Notes panel:** for `canManage`, a `<textarea>` + "Add note" button (`data-testid="note-body-input"`, `data-testid="add-note-button"`) calling `store.submitNote`; below it, a list (`data-testid="note-item"`) of `notes` showing `author.name`, a formatted `createdAt` (`new Date(note.createdAt).toLocaleString()`, matching `CommunicationsView.vue`'s `formatOccurredAt` helper), and `body`. `EmptyState` (`title="No notes yet"`) when empty.
- **Attachments panel:** for `canManage`, a `<input type="file" data-testid="attachment-file-input">` + "Upload" button (`data-testid="upload-attachment-button"`) reading the selected `File` from a `ref<HTMLInputElement>` and calling `store.submitAttachment`; below it, a list (`data-testid="attachment-item"`) of `attachments` showing `fileName`, a human-readable size (`(sizeBytes / 1024).toFixed(1) + ' KB'`), a "Download" button (`data-testid="download-attachment-button"`) calling `store.downloadAttachment`, and — for `canManage` — a "Delete" button (`data-testid="delete-attachment-button"`) calling `store.removeAttachment`. `EmptyState` (`title="No attachments yet"`) when empty.
- **Tickets section:** a small table (`data-testid="customer-tickets-table"`) of `store.tickets` — columns Subject, Status (`StatusBadge`), Created. `EmptyState` (`title="No tickets yet"`) when empty.
- **Interaction history section:** copy `CommunicationsView.vue`'s timeline markup (context item 8) verbatim, bound to `store.timeline`, dropping the "associate with a ticket" controls (that action belongs to the Communications screen, not the customer profile — this section is read-only history).
- `PageHeader` with `:title="store.selectedCustomer?.name ?? 'Customer'"` and `subtitle="Profile, notes, attachments, and history."`.

### 7 — Routes

**File: `frontend/src/router/index.ts`**

Add two imports alongside the existing view imports (currently lines 2–9):

```ts
import CustomerDetailView from '../views/CustomerDetailView.vue';
import CustomersView from '../views/CustomersView.vue';
```

Add two route entries to the `routes` array — insert them anywhere among the other permission-gated routes (e.g. immediately before the `/users` entry, currently starting line 51):

```ts
    {
      path: '/customers',
      name: 'customers',
      component: CustomersView,
      meta: { navLabel: 'Customers', permission: 'customers:read' }
    },
    {
      path: '/customers/:id',
      name: 'customer-detail',
      component: CustomerDetailView,
      meta: { permission: 'customers:read' }
    },
```

`customer-detail` deliberately has **no `navLabel`** — following the `RouteMeta` doc comment (context item 10: "absent means the route is not listed in the sidebar") and the same convention `ForbiddenView`'s route already uses. `AppSidebar.vue`'s `navItems` computed (`frontend/src/components/AppSidebar.vue`, Story 09) derives entirely from `router.getRoutes()` filtered on `meta.navLabel` + `meta.permission` — no edit to `AppSidebar.vue` is needed for `/customers` to appear, and `/customers/:id` correctly never appears as its own link.

### 8 — Tests

Following the three-layer Vitest pattern (context item 12):

1. **`frontend/src/tests/customers.service.spec.ts`** — `vi.mock('../services/api')`; one test per exported function asserting the request method/URL/params and the `response.data.data ?? []` / `throw new Error(...)` split. Specifically assert `uploadCustomerAttachment` builds a `FormData` (not a plain object) and passes `headers: { 'Content-Type': undefined }`.
2. **`frontend/src/tests/customers.store.spec.ts`** — `setActivePinia(createPinia())` in `beforeEach`; `loadCustomerDetail` success populates all five refs from `Promise.all`; `loadCustomerDetail` failure sets `selectedCustomer` back to `null` and populates `error`; `submitCustomer`/`saveCustomer`/`submitNote`/`submitAttachment`/`removeAttachment` each assert their `boolean` return and the corresponding state mutation.
3. **`frontend/src/tests/CustomersView.spec.ts`** — mount with a mocked store; assert the create form renders only when `auth.can('customers:manage')` (compare `UsersView.spec.ts`'s equivalent assertion), the table renders one `customer-row` per item, and typing in `customer-search-input` + clicking `customer-search-submit` calls `store.loadCustomers` with the typed value.
4. **`frontend/src/tests/CustomerDetailView.spec.ts`** — assert the three loading/not-found/loaded states render correctly (mock `useRoute` to supply `params.id`); assert notes/attachments/tickets/timeline sections render their respective `EmptyState` when the corresponding store array is empty; assert `canManage=false` hides the edit button, note form, upload input, and delete buttons but still shows the download button (download is a `customers:read` action per Story 11 task 5, not `customers:manage`).
5. **`frontend/src/tests/router.spec.ts`** — add two `router.resolve(...)` assertions for `/customers` (name `customers`) and `/customers/42` (name `customer-detail`, `params.id === '42'`), following the file's existing style exactly.

---

## Edge Cases & Failure Modes

- **`Content-Type: application/json` default breaks multipart uploads.** `frontend/src/services/api.ts`'s axios instance sets this header at creation (context item 4). Task 2's `uploadCustomerAttachment` overrides it to `undefined` per-request so the browser generates the correct `multipart/form-data; boundary=...` header itself — omitting this override is the single most likely silent failure mode in this story (the request "succeeds" client-side but the backend's `multer` middleware fails to parse the body).
- **Navigating directly to `/customers/999999` (nonexistent id).** `fetchCustomer` throws (Story 11's `404`), `loadCustomerDetail`'s `catch` sets `selectedCustomer.value = null`, and the view renders the "Customer not found" `EmptyState` (task 6) instead of a blank page or an unhandled rejection.
- **A `customers:read`-only role (e.g. `REPORTING_USER`) opens a customer's detail page.** `canManage` is `false`, so the edit button, note form, upload control, and delete buttons never render — but the download button still does (Story 11 gates download on `customers:read`, not `customers:manage`, since viewing an existing attachment is a read action). Task 8 item 4 asserts this split explicitly so it is not silently lost in a future edit.
- **Uploading a file larger than `MAX_ATTACHMENT_SIZE_BYTES` (10 MiB default, Story 10 task 4).** The backend rejects it with `400 "File exceeds the maximum allowed size"` (Story 11 task 3); `submitAttachment`'s `catch` surfaces that exact message via `toErrorMessage` — no client-side size pre-check is implemented, so the round trip happens before the user sees the error. Acceptable for this mini-module; a client-side `file.size` check is a documented follow-up, not built here.
- **Creating a customer with an email that already exists.** Backend `409`; `submitCustomer`'s `catch` surfaces `"A customer with email ... already exists"` via `AlertBanner`, and the form is **not** cleared (unlike the success path) so the user's input is not lost.
- **Search box submitted with only whitespace.** `fetchCustomers` (task 2) already guards `filter.search.length > 0`, but a trimmed-to-empty string still has `length > 0` before trimming — task 4's search handler should call `.trim()` on the input value before passing it to `loadCustomers`, matching how `UsersView.vue`'s `onCreate` trims `name`/`email` (frontend/src/views/UsersView.vue:47-48) before submitting.
- **Downloading an attachment whose backing file was removed out-of-band.** `downloadCustomerAttachment` (task 2) would receive a non-`200` response from the backend's unguarded `res.download` failure path (Story 11's `## Edge Cases`, last bullet); `store.downloadAttachment`'s `catch` surfaces whatever message `toErrorMessage` can extract — likely a generic one, since that backend path does not go through `AppError`. Documented as a known rough edge inherited from Story 11, not fixed here.
- **A file input's native `change` event vs. Vue's `v-model` on `type="file"`.** Vue does not support `v-model` on file inputs; task 6 must read `event.target.files?.[0]` from a `@change` handler (or a template `ref`) rather than attempting `v-model="selectedFile"` — a common mistake worth flagging explicitly before the executor writes this component.

---

## Test Plan

Covered in full by task 8 above. No backend changes in this story — `backend/` test suites are untouched.

---

## Verification Steps

1. **Frontend builds:** `npm run build` (runs `vue-tsc -b && vite build`) exits 0 from `frontend/`.
2. **Typecheck:** `npm run typecheck` exits 0 from `frontend/`.
3. **Tests pass:** `npm test` (Vitest) exits 0 from `frontend/`, including every new spec from task 8.
4. **Backend still passes:** `npm test` from `backend/` still exits 0 — this story makes no backend changes, so this is a pure regression check.
5. **Dev smoke test:** `npm run dev` in both `backend/` and `frontend/`; log in as `agent@crm.local` / `Passw0rd!`; confirm the sidebar shows a "Customers" link; open it, confirm the search box and status filter work against the seeded demo customer; open the demo customer's detail page and confirm its contact info, one seeded note (attributed to "Support Agent"), zero attachments, its one seeded ticket, and its five seeded interactions (one per channel, from Story 04's seed) all render.
6. **The intake demo, end to end:** while still logged in as `agent@crm.local`, use the `/customers` create form to add a new customer; open its detail page; add a note; upload a small file as an attachment and confirm it appears in the list and downloads correctly; confirm the new customer's (empty) ticket and interaction history sections render their `EmptyState`s rather than erroring. This is the exact walkthrough from the work item's `## Demo`.
7. **Role check:** log out and back in as `reports@crm.local` (`REPORTING_USER` — `customers:read` only, no `customers:manage`); confirm `/customers` shows the list with no create form, and a customer's detail page shows no edit button, no note form, no upload control, and no delete buttons, but the download button on any existing attachment still works.

---

## Done Criteria

- [ ] `/customers` lists every customer with working `search` and `status` filters, and a create form gated on `customers:manage`.
- [ ] `/customers/:id` shows the full profile, an edit form gated on `customers:manage`, notes (list + add), attachments (list + upload + download + delete, upload/delete gated on `customers:manage`), the customer's tickets, and the interaction timeline.
- [ ] The sidebar shows a "Customers" link for any role holding `customers:read`, with no `AppSidebar.vue` code changes required.
- [ ] `frontend/src/types/index.ts`'s `Customer` interface and `PERMISSIONS` tuple match the backend exactly (Story 10/11's `customers:manage` permission and extended `Customer` fields).
- [ ] The intake demo (`## Verification Steps` item 6) runs start to finish without a console error.
- [ ] `npm run build`, `npm run typecheck`, and `npm test` all exit 0 in `frontend/`; `npm test` still exits 0 in `backend/`.
