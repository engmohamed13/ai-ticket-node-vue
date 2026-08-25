# Story 06 — Communication and unified timeline UI (Story: 2)

## Prerequisites

- Story 05 completed: [05-story-communication-apis-2.md](05-story-communication-apis-2.md). `GET /api/customers`, `GET /api/customers/:id/timeline`, `GET /api/tickets`, `GET /api/tickets/:id/timeline`, `POST /api/interactions`, and `PATCH /api/interactions/:id/associate` must all be live and returning seeded demo data before starting.
- Story 03 completed: [../projectsetup/03-story-frontend-bootstrap-1.md](../projectsetup/03-story-frontend-bootstrap-1.md). The Vue 3 + Vite + Pinia + vue-router shell, the `axios` instance in `frontend/src/services/api.ts`, and the `{ success, message, data }` envelope handling in `frontend/src/types/index.ts` must already exist.

---

## Story Goal

Give a support agent a screen to create or receive a customer interaction on any of the five mock channels, associate it with a ticket, and see the resulting unified timeline update — the exact demo script in the work item.

Outcomes:

1. A new **Communications** view lets the agent pick a customer, see that customer's tickets, submit a new interaction (channel, direction, optional ticket, subject, body), and associate an unassociated interaction with a ticket.
2. The same view renders the customer's full interaction history as a **unified timeline**, sorted chronologically, showing each interaction's channel, direction, subject/body, and which ticket (if any) it is linked to.
3. The view is reachable from the sidebar and has its own route, following the existing `SystemHealthView` pattern.

**Not in scope for this story:** creating customers or tickets from the UI (both are read-only dropdowns sourced from the seeded/API data), real-time updates (the timeline reloads on explicit actions, not via polling or websockets), and pagination (the demo dataset is small).

---

## Context — Read These Files First

1. [.squad/stories/communicationchannels/2/intake.md](.squad/stories/communicationchannels/2/intake.md) — `## Description`: "Communication and timeline UI"; `## Acceptance criteria`: "Unified timeline displays interactions chronologically", "Frontend displays the complete communication history"; `## Demo`: "Create or receive a customer interaction, select its communication channel, associate it with a ticket, and display it in the unified timeline" — this is the exact user flow the view must support end to end.
2. [05-story-communication-apis-2.md](05-story-communication-apis-2.md) — re-read task 4 (the `POST /api/interactions` body shape: `channel`, `direction`, `customerId`, `ticketId?`, `subject?`, `body`) and task 6 (the OpenAPI response shapes for `Customer`, `Ticket`, `Interaction`). The frontend types in task 1 below mirror these exactly.
3. `frontend/src/types/index.ts` (26 lines) — the existing `ApiResponse<T>` envelope and `HealthPayload` shape. Add the new interfaces here, following the same flat-interface style (no classes).
4. `frontend/src/services/api.ts` (16 lines) and `frontend/src/services/health.service.ts` (20 lines) — the pattern: a shared `axios` instance from `api.ts`, and per-feature service functions that call `api.get<ApiResponse<T>>(...)`, unwrap `response.data.data`, and throw `new Error(response.data.message)` when `data` is null.
5. `frontend/src/stores/health.ts` (31 lines) — the Pinia setup-store pattern: `ref` state, `computed` derived flags, an async `load` action with `loading`/`error` handling in a `try/catch/finally`.
6. `frontend/src/views/SystemHealthView.vue` (143 lines) — the view pattern to follow: `onMounted` triggers a store load, `data-testid` attributes on every element a test needs to find (`health-loading`, `health-error`, etc.), conditional `v-if`/`v-else-if` blocks for loading/error/loaded states, and scoped `<style>` using the CSS custom properties from `frontend/src/style.css` (`--text-muted`, `--surface-color`, `--border-color`, etc.).
7. `frontend/src/router/index.ts` (28 lines) — read the whole file. Add the new route the same way `/health` → `SystemHealthView` was added.
8. `frontend/src/components/AppSidebar.vue` (60 lines) — read the whole file. Add a new `RouterLink` the same way `system-health` was added.
9. `frontend/src/tests/health.service.spec.ts` (65 lines), `frontend/src/tests/health.store.spec.ts` (65 lines), and `frontend/src/tests/SystemHealthView.spec.ts` (95 lines) — the three-layer Vitest pattern (service → store → view) to replicate: `vi.mock('../services/...')`, `setActivePinia(createPinia())` in `beforeEach` for store/view tests, `mount(...)` + `flushPromises()` + `data-testid` lookups for view tests.
10. `frontend/src/tests/router.spec.ts` (17 lines) — `router.resolve(path).name` assertions to extend for the new route.

---

## Frontend Tasks

### 1 — Types

**File: `frontend/src/types/index.ts`**

Append:

```ts
export const CHANNELS = ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] as const;
export type Channel = (typeof CHANNELS)[number];

export const INTERACTION_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type InteractionDirection = (typeof INTERACTION_DIRECTIONS)[number];

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

export interface Ticket {
  id: number;
  subject: string;
  status: string;
  customerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface Interaction {
  id: number;
  channel: Channel;
  direction: InteractionDirection;
  subject: string | null;
  body: string;
  externalRef: string;
  customerId: number;
  ticketId: number | null;
  occurredAt: string;
  createdAt: string;
}

export interface CreateInteractionPayload {
  channel: Channel;
  direction: InteractionDirection;
  customerId: number;
  ticketId?: number;
  subject?: string;
  body: string;
}
```

`CHANNELS` and `INTERACTION_DIRECTIONS` mirror `backend/src/channels/types.ts` exactly (both lists are hand-copied constants on each side of the API boundary, the same relationship `HealthPayload` already has with the backend's `DatabaseHealth`/`ApiHealth` interfaces — there is no shared package between `frontend/` and `backend/`).

### 2 — Communications service

**Create file: `frontend/src/services/communications.service.ts`**

```ts
import api from './api';
import type {
  ApiResponse,
  Customer,
  Interaction,
  CreateInteractionPayload,
  Ticket
} from '../types';

export const fetchCustomers = async (): Promise<Customer[]> => {
  const response = await api.get<ApiResponse<Customer[]>>('/customers');
  return response.data.data ?? [];
};

export const fetchTickets = async (customerId?: number): Promise<Ticket[]> => {
  const response = await api.get<ApiResponse<Ticket[]>>('/tickets', {
    params: customerId === undefined ? undefined : { customerId }
  });
  return response.data.data ?? [];
};

export const fetchCustomerTimeline = async (customerId: number): Promise<Interaction[]> => {
  const response = await api.get<ApiResponse<Interaction[]>>(`/customers/${customerId}/timeline`);
  return response.data.data ?? [];
};

export const createInteraction = async (payload: CreateInteractionPayload): Promise<Interaction> => {
  const response = await api.post<ApiResponse<Interaction>>('/interactions', payload);
  if (!response.data.data) throw new Error(response.data.message || 'Empty interaction response');
  return response.data.data;
};

export const associateInteraction = async (interactionId: number, ticketId: number): Promise<Interaction> => {
  const response = await api.patch<ApiResponse<Interaction>>(`/interactions/${interactionId}/associate`, {
    ticketId
  });
  if (!response.data.data) throw new Error(response.data.message || 'Empty interaction response');
  return response.data.data;
};
```

List endpoints (`fetchCustomers`, `fetchTickets`, `fetchCustomerTimeline`) default to an empty array rather than throwing on a null `data` — matching a "nothing to show yet" state instead of an error state, since an empty list is a normal, expected response shape for these three (unlike `fetchHealth`, where a null payload means the request itself failed). `createInteraction` and `associateInteraction` do throw on a null `data`, matching `fetchHealth`'s convention, because a `POST`/`PATCH` that "succeeds" with no data back is actually a failure.

### 3 — Pinia store

**Create file: `frontend/src/stores/communications.ts`**

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
  associateInteraction,
  createInteraction,
  fetchCustomerTimeline,
  fetchCustomers,
  fetchTickets
} from '../services/communications.service';
import type { CreateInteractionPayload, Customer, Interaction, Ticket } from '../types';

export const useCommunicationsStore = defineStore('communications', () => {
  const customers = ref<Customer[]>([]);
  const tickets = ref<Ticket[]>([]);
  const timeline = ref<Interaction[]>([]);
  const selectedCustomerId = ref<number | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const ticketsForSelectedCustomer = computed(() =>
    tickets.value.filter((ticket) => ticket.customerId === selectedCustomerId.value)
  );

  const loadCustomers = async (): Promise<void> => {
    customers.value = await fetchCustomers();
  };

  const selectCustomer = async (customerId: number): Promise<void> => {
    selectedCustomerId.value = customerId;
    loading.value = true;
    error.value = null;
    try {
      const [customerTickets, customerTimeline] = await Promise.all([
        fetchTickets(customerId),
        fetchCustomerTimeline(customerId)
      ]);
      tickets.value = customerTickets;
      timeline.value = customerTimeline;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to load communications';
    } finally {
      loading.value = false;
    }
  };

  const submitInteraction = async (payload: CreateInteractionPayload): Promise<void> => {
    error.value = null;
    try {
      await createInteraction(payload);
      if (selectedCustomerId.value !== null) {
        timeline.value = await fetchCustomerTimeline(selectedCustomerId.value);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to store interaction';
    }
  };

  const associate = async (interactionId: number, ticketId: number): Promise<void> => {
    error.value = null;
    try {
      await associateInteraction(interactionId, ticketId);
      if (selectedCustomerId.value !== null) {
        timeline.value = await fetchCustomerTimeline(selectedCustomerId.value);
      }
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : 'Unable to associate interaction';
    }
  };

  return {
    customers,
    tickets,
    timeline,
    selectedCustomerId,
    loading,
    error,
    ticketsForSelectedCustomer,
    loadCustomers,
    selectCustomer,
    submitInteraction,
    associate
  };
});
```

The timeline is re-fetched after both `submitInteraction` and `associate` rather than patched locally — the backend is the source of truth for chronological order, and the dataset is small enough that a re-fetch is cheap and avoids client-side sort bugs.

### 4 — Communications view

**Create file: `frontend/src/views/CommunicationsView.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useCommunicationsStore } from '../stores/communications';
import { CHANNELS, INTERACTION_DIRECTIONS } from '../types';
import type { Channel, InteractionDirection } from '../types';

const store = useCommunicationsStore();

const channel = ref<Channel>('EMAIL');
const direction = ref<InteractionDirection>('INBOUND');
const ticketId = ref<string>('');
const subject = ref('');
const body = ref('');

const associateTargets = ref<Record<number, string>>({});

onMounted(async () => {
  await store.loadCustomers();
  if (store.customers.length > 0) {
    await store.selectCustomer(store.customers[0].id);
  }
});

const onSelectCustomer = async (event: Event): Promise<void> => {
  const customerId = Number((event.target as HTMLSelectElement).value);
  await store.selectCustomer(customerId);
};

const onSubmit = async (): Promise<void> => {
  if (store.selectedCustomerId === null || body.value.trim().length === 0) return;
  await store.submitInteraction({
    channel: channel.value,
    direction: direction.value,
    customerId: store.selectedCustomerId,
    ticketId: ticketId.value === '' ? undefined : Number(ticketId.value),
    subject: subject.value.trim() === '' ? undefined : subject.value.trim(),
    body: body.value.trim()
  });
  subject.value = '';
  body.value = '';
};

const onAssociate = async (interactionId: number): Promise<void> => {
  const target = associateTargets.value[interactionId];
  if (!target) return;
  await store.associate(interactionId, Number(target));
};

const formatOccurredAt = (occurredAt: string): string => new Date(occurredAt).toLocaleString();
const ticketLabel = (ticket: { id: number; subject: string }) => `#${ticket.id} — ${ticket.subject}`;
const hasTickets = computed(() => store.ticketsForSelectedCustomer.length > 0);
</script>

<template>
  <section>
    <h2>Communications</h2>

    <div class="customer-picker">
      <label for="customer-select">Customer</label>
      <select id="customer-select" data-testid="customer-select" @change="onSelectCustomer">
        <option v-for="customer in store.customers" :key="customer.id" :value="customer.id">
          {{ customer.name }}
        </option>
      </select>
    </div>

    <div v-if="store.error" class="panel panel-error" data-testid="communications-error">
      {{ store.error }}
    </div>

    <form class="interaction-form" data-testid="interaction-form" @submit.prevent="onSubmit">
      <h3>Create or receive an interaction</h3>
      <div class="form-row">
        <label for="channel-select">Channel</label>
        <select id="channel-select" v-model="channel" data-testid="channel-select">
          <option v-for="value in CHANNELS" :key="value" :value="value">{{ value }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="direction-select">Direction</label>
        <select id="direction-select" v-model="direction" data-testid="direction-select">
          <option v-for="value in INTERACTION_DIRECTIONS" :key="value" :value="value">{{ value }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="ticket-select">Ticket (optional)</label>
        <select id="ticket-select" v-model="ticketId" data-testid="ticket-select">
          <option value="">Not associated yet</option>
          <option v-for="ticket in store.ticketsForSelectedCustomer" :key="ticket.id" :value="ticket.id">
            {{ ticketLabel(ticket) }}
          </option>
        </select>
      </div>
      <div class="form-row">
        <label for="subject-input">Subject</label>
        <input id="subject-input" v-model="subject" data-testid="subject-input" type="text" />
      </div>
      <div class="form-row">
        <label for="body-input">Message</label>
        <textarea id="body-input" v-model="body" data-testid="body-input" required></textarea>
      </div>
      <button class="btn btn-primary" type="submit" data-testid="submit-interaction">Save interaction</button>
    </form>

    <div class="timeline">
      <h3>Unified timeline</h3>
      <p v-if="!hasTickets" class="hint">This customer has no tickets yet — new interactions start unassociated.</p>
      <p v-if="store.loading" data-testid="timeline-loading">Loading timeline…</p>
      <ul v-else data-testid="timeline-list">
        <li v-for="interaction in store.timeline" :key="interaction.id" class="timeline-item" data-testid="timeline-item">
          <span class="badge">{{ interaction.channel }}</span>
          <span class="direction">{{ interaction.direction }}</span>
          <span class="occurred-at">{{ formatOccurredAt(interaction.occurredAt) }}</span>
          <p class="body">{{ interaction.body }}</p>
          <p v-if="interaction.ticketId" class="ticket-link" data-testid="timeline-ticket-link">
            Ticket #{{ interaction.ticketId }}
          </p>
          <div v-else class="associate-row">
            <select v-model="associateTargets[interaction.id]" data-testid="associate-select">
              <option value="">Associate with a ticket…</option>
              <option v-for="ticket in store.ticketsForSelectedCustomer" :key="ticket.id" :value="ticket.id">
                {{ ticketLabel(ticket) }}
              </option>
            </select>
            <button class="btn btn-primary" type="button" data-testid="associate-button" @click="onAssociate(interaction.id)">
              Associate
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.customer-picker,
.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.75rem;
}

.interaction-form,
.timeline {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
}

.panel-error {
  background-color: var(--color-down-bg);
  color: var(--color-down);
  padding: 1rem 1.25rem;
  border-radius: 8px;
}

.hint {
  color: var(--text-muted);
}

.timeline-item {
  border-bottom: 1px solid var(--border-color);
  padding: 0.75rem 0;
}

.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  background-color: #eff6ff;
  color: #2563eb;
  font-size: 0.8rem;
  font-weight: 600;
  margin-right: 0.5rem;
}

.direction,
.occurred-at {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.associate-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
}
</style>
```

### 5 — Route and navigation

**File: `frontend/src/router/index.ts`**

Add, alongside the existing `/health` route:

```ts
import CommunicationsView from '../views/CommunicationsView.vue';

// inside routes: [...]
{
  path: '/communications',
  name: 'communications',
  component: CommunicationsView
}
```

**File: `frontend/src/components/AppSidebar.vue`**

Add, after the existing `system-health` link:

```html
<RouterLink :to="{ name: 'communications' }" class="nav-link">Communications</RouterLink>
```

---

## Edge Cases & Failure Modes

- **No customers returned from `GET /api/customers`.** `store.customers` stays an empty array; `onMounted` (task 4) skips `selectCustomer` since `store.customers.length > 0` is false, and the customer `<select>` renders with no options. The form still renders but `onSubmit` no-ops because `store.selectedCustomerId` stays `null`.
- **Customer has zero tickets.** `ticketsForSelectedCustomer` (task 3) is an empty computed array; the ticket `<select>` in the form (task 4) still renders with only the "Not associated yet" option, and the timeline's `hasTickets` hint shows. Submitting without a ticket is still valid — `ticketId` stays `undefined` in the payload.
- **`createInteraction` or `associateInteraction` rejects** (e.g. the backend returns `400`/`404` from Story 05's validation). `store.error` (task 3) is set from the caught error's message and rendered in `[data-testid="communications-error"]` (task 4); the timeline is not corrupted because the re-fetch inside `submitInteraction`/`associate` only runs after the mutating call succeeds.
- **Associating without picking a target ticket.** `onAssociate` (task 4) reads `associateTargets.value[interactionId]`; if it is empty/undefined, the function returns early without calling the store — no request is sent for an incomplete selection.
- **Switching customers while the timeline is loading.** `selectCustomer` (task 3) reassigns `tickets.value`/`timeline.value` only after both `Promise.all` calls resolve; a second `selectCustomer` call while the first is in flight is not cancelled, so the **last call to resolve** wins, which can show stale data if responses arrive out of order. This is a known simplification — flagged here rather than solved, since the demo interacts with one customer at a time.
- **Whitespace-only interaction body.** `onSubmit` (task 4) trims `body.value` and returns early if empty, mirroring the `required` attribute on the `<textarea>` as a second guard.

---

## Test Plan

Mirror the three-layer pattern from `frontend/src/tests/health.service.spec.ts`, `health.store.spec.ts`, and `SystemHealthView.spec.ts` — all Vitest, `vi.mock` at the module boundary, `flushPromises()` after mounting.

1. **Create `frontend/src/tests/communications.service.spec.ts`** (mock `../services/api`):
   - `fetchCustomers` unwraps `response.data.data`; returns `[]` when `data` is `null`.
   - `fetchTickets` passes `{ params: { customerId } }` when given an id, and `{ params: undefined }` when omitted.
   - `fetchCustomerTimeline` unwraps the interaction array for a given customer id in the URL.
   - `createInteraction` posts the payload and returns the created interaction; throws when `response.data.data` is `null`.
   - `associateInteraction` patches `/interactions/:id/associate` with `{ ticketId }` and returns the updated interaction; throws on null `data`.
2. **Create `frontend/src/tests/communications.store.spec.ts`** (mock `../services/communications.service`):
   - `loadCustomers` populates `customers`.
   - `selectCustomer` sets `selectedCustomerId`, populates `tickets` and `timeline`, and toggles `loading` true→false.
   - `selectCustomer` sets `error` and leaves `loading` false when either fetch rejects.
   - `ticketsForSelectedCustomer` filters `tickets` by `selectedCustomerId`.
   - `submitInteraction` calls `createInteraction` then re-fetches the timeline for the currently selected customer; sets `error` on rejection instead of throwing.
   - `associate` calls `associateInteraction` then re-fetches the timeline; sets `error` on rejection.
3. **Create `frontend/src/tests/CommunicationsView.spec.ts`** (mock `../services/communications.service`, `mount` + `flushPromises`):
   - On mount with one customer and a non-empty timeline: renders one `[data-testid="timeline-item"]` per interaction, each showing its `channel` badge text.
   - An interaction with `ticketId: null` renders the `[data-testid="associate-select"]` + `[data-testid="associate-button"]` controls instead of `[data-testid="timeline-ticket-link"]`.
   - An interaction with a non-null `ticketId` renders `[data-testid="timeline-ticket-link"]` and not the associate controls.
   - Filling the form (`channel-select`, `direction-select`, `body-input`) and submitting calls `createInteraction` with the expected payload shape.
   - Clicking `[data-testid="associate-button"]` after picking a ticket in `[data-testid="associate-select"]` calls `associateInteraction` with the right `(interactionId, ticketId)` pair.
   - When `communications.service` rejects, `[data-testid="communications-error"]` renders the message.
4. **Modify `frontend/src/tests/router.spec.ts`** — add: `router.resolve('/communications').name` is `'communications'`.

---

## Verification Steps

1. **Frontend unit tests:** from `frontend/`, `npm test` (or `npx vitest run`) — all specs green, including the three new files and the router update.
2. **Frontend typecheck/build:** from `frontend/`, `npm run build` exits 0 (runs `vue-tsc` + `vite build` per the existing bootstrap script).
3. **Backend running:** from `backend/`, `npm run dev` (Story 05's API must be live with seeded data).
4. **Manual smoke test** (`npm run dev` from `frontend/`, then in a browser):
   - Navigate to **Communications** from the sidebar; the seeded "Demo Customer" appears selected with five timeline entries, one per channel, each already showing "Ticket #1" (seeded already-associated data from Story 04).
   - Submit a new interaction (any channel, direction `INBOUND`, no ticket) — it appears at the end of the timeline without a ticket link, showing the associate controls instead.
   - Pick the seeded ticket in that interaction's associate dropdown and click **Associate** — the entry now shows "Ticket #1" instead of the associate controls, without a page reload.
   - This full sequence — create/receive an interaction, select its channel, associate it with a ticket, see it in the timeline — is the exact demo script from the work item.
5. **Regression:** the existing **System Health** and **Dashboard** views and their tests remain unaffected — `npx vitest run frontend/src/tests/health.store.spec.ts frontend/src/tests/SystemHealthView.spec.ts frontend/src/tests/router.spec.ts` all still pass.

---

## Done Criteria

- [ ] `frontend/src/types/index.ts` declares `Channel`, `InteractionDirection`, `Customer`, `Ticket`, `Interaction`, and `CreateInteractionPayload` matching the backend's Story 05 shapes.
- [ ] `frontend/src/services/communications.service.ts` covers list customers, list tickets, fetch customer timeline, create interaction, and associate interaction.
- [ ] `frontend/src/stores/communications.ts` exposes customer/ticket/timeline state and the `selectCustomer`/`submitInteraction`/`associate` actions.
- [ ] `frontend/src/views/CommunicationsView.vue` renders a working form to create/receive an interaction (channel + direction + optional ticket + subject + body) and a chronological unified timeline (**"Unified timeline displays interactions chronologically"**, **"Frontend displays the complete communication history"**).
- [ ] An unassociated interaction in the timeline can be associated with a ticket from the UI without a page reload.
- [ ] `/communications` is reachable from the sidebar and has a named route.
- [ ] `npm run build` and `npm test` both exit 0 in `frontend/`.
- [ ] The manual smoke test in `## Verification Steps` item 4 — create, select channel, associate, see it in the timeline — passes against the live backend from Story 05.
