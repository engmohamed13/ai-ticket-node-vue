# Story 17 — Customer Portal UI: self-service dashboard (Story: 6)

## Prerequisites

- Story 16 completed: [16-story-customer-portal-data-model-6.md](16-story-customer-portal-data-model-6.md). All feedback APIs (`POST /api/tickets/:id/feedback`, `GET /api/tickets/:id/feedback`, `GET /api/customers/portal/tickets`, `GET /api/customers/portal/summary`) must be live and permission-gated.
- Story 12 completed: [../customermanagement/12-story-customer-management-ui-4.md](../customermanagement/12-story-customer-management-ui-4.md). Customer list/detail UI patterns exist in the frontend.
- Story 15 completed: [../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md](../ticketmanagementagentworkflow/15-story-agent-dashboard-and-notifications-ui-5.md). Ticket detail view with status/priority display exists.
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). Router guards and auth store patterns are in place.

---

## Story Goal

Build a customer-facing self-service portal where customers (CUSTOMER-role users) can view their own tickets, track status, and submit satisfaction feedback on resolved tickets. This separates the customer experience from the agent dashboard, showing only customer-relevant information and actions.

Outcomes:

1. `/portal` route shows a customer dashboard with ticket summary stats (total, open, resolved) and a list of the customer's tickets.
2. `/portal/tickets/:id` shows a ticket detail (customer view) with subject, status, priority, category, created date, and a feedback section.
3. Feedback section displays existing feedback (if submitted) or a feedback form (1–5 star rating + optional comment) if the ticket is resolved and no feedback has been submitted yet.
4. The sidebar shows a "My Tickets" link (only for CUSTOMER role) pointing to `/portal`.
5. All routes scoped to CUSTOMER-role users via permission guard; accessing the portal as an agent/supervisor shows a "Not authorized" view.

**Not in scope for this story:** customer account settings, password change, ticket creation (customers cannot create tickets in this mini-module), email notifications, advanced filtering, or export of ticket history.

---

## Context — Read These Files First

1. [.squad/stories/customerportalknowledgebasemanagementdashboard/6/intake.md](../../stories/customerportalknowledgebasemanagementdashboard/6/intake.md) — `## Description` states "Customer login", "View own tickets", "Track ticket status", "Submit feedback" — this story delivers the UI for those outcomes.

2. `frontend/src/views/TicketsView.vue` (from Story 15) — the agent's ticket list UI. Story 17 creates a separate `CustomerPortalView.vue` (customer dashboard) that reuses the table layout but shows only the customer's own tickets and different action buttons (no assignment/status-edit for customers).

3. `frontend/src/views/TicketDetailView.vue` (from Story 15) — read the full file. Story 17 creates a separate `CustomerPortalTicketDetailView.vue` that reuses the ticket detail card but hides agent-only sections (assignment, comments, internal notes) and adds the feedback form section.

4. `frontend/src/stores/tickets.ts` — the Pinia store pattern for ticket list state. Story 17 adds a `usePortalStore()` or extends the existing store with customer-portal-specific selectors (`customerTickets`, `selectedCustomerTicket`).

5. `frontend/src/services/` — specifically `tickets.service.ts` (from Story 14). Story 17 calls the new Story 16 APIs: `GET /api/customers/portal/tickets`, `GET /api/customers/portal/summary`, `POST /api/tickets/:id/feedback`, `GET /api/tickets/:id/feedback`.

6. `frontend/src/types/index.ts` — add `TicketFeedback` interface (hand-copied from Story 16's DTO). The `Ticket` interface already has status, priority, category; no changes needed there.

7. `frontend/src/router/index.ts` (97 lines, Story 09) — add two new protected routes (`/portal`, `/portal/tickets/:id`) gated on `customers:read` (actually should be a new `'portal:access'` permission or just use existing `customers:read` since customers ARE customers). Entry point must check `!req.user?.roleId === CUSTOMER_ROLE_ID` or similar.

8. `frontend/src/components/ui/` — `StatusBadge.vue`, `EmptyState.vue`, `LoadingState.vue`, `AlertBanner.vue` are all reused without modification. No new components are designed; feedback form markup follows the existing form patterns from `UsersView.vue` and `CustomerDetailView.vue`.

9. `frontend/src/tests/` — customer portal specs follow the same Vitest + mount + mocked store pattern as existing view tests. No new test utilities; reuse `flushPromises()` and `data-testid` lookups.

---

## Frontend Tasks

### 1 — Add TicketFeedback types

**File: `frontend/src/types/index.ts`**

Add the new interface after the existing Ticket-related types (around line 100):

```ts
export interface TicketFeedback {
  id: number;
  rating: number; // 1–5
  comment: string | null;
  ticketId: number;
  createdAt: string;
}

export interface CustomerPortalSummary {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
}

// Used in customer portal ticket list
export interface CustomerPortalTicket {
  id: number;
  subject: string;
  status: string;
  priority: string;
  category: { id: number; name: string } | null;
  hasFeedback: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 2 — Add portal service functions

**File: `frontend/src/services/portal.service.ts`** (new file)

```ts
import api from './api';
import type {
  ApiResponse,
  CustomerPortalSummary,
  CustomerPortalTicket,
  TicketFeedback
} from '../types';
import type { SubmitFeedbackPayload } from '../types'; // or define inline as { rating: number, comment?: string }

export const fetchPortalSummary = async (): Promise<CustomerPortalSummary> => {
  const response = await api.get<ApiResponse<CustomerPortalSummary>>('/customers/portal/summary');
  return response.data.data ?? { totalTickets: 0, openTickets: 0, resolvedTickets: 0 };
};

export const fetchPortalTickets = async (): Promise<CustomerPortalTicket[]> => {
  const response = await api.get<ApiResponse<CustomerPortalTicket[]>>('/customers/portal/tickets');
  return response.data.data ?? [];
};

export const fetchPortalTicketDetail = async (ticketId: number): Promise<CustomerPortalTicket> => {
  // For now, fetch from the portal list and find by id, or create a dedicated endpoint
  // For this mini-module, we'll just use the existing ticket endpoint (Story 15)
  // and the service layer (Story 15) can return a customer-visible subset
  const response = await api.get<ApiResponse<any>>(`/tickets/${ticketId}`);
  if (!response.data.data) throw new Error('Ticket not found');
  return response.data.data;
};

export const fetchTicketFeedback = async (ticketId: number): Promise<TicketFeedback | null> => {
  const response = await api.get<ApiResponse<TicketFeedback>>(`/tickets/${ticketId}/feedback`);
  return response.data.data ?? null;
};

export const submitTicketFeedback = async (ticketId: number, payload: { rating: number; comment?: string }): Promise<TicketFeedback> => {
  const response = await api.post<ApiResponse<TicketFeedback>>(`/tickets/${ticketId}/feedback`, payload);
  if (!response.data.data) throw new Error(response.data.message || 'Unable to submit feedback');
  return response.data.data;
};
```

### 3 — Add portal store

**File: `frontend/src/stores/portal.ts`** (new file)

```ts
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import {
  fetchPortalSummary,
  fetchPortalTickets,
  fetchTicketFeedback,
  submitTicketFeedback
} from '../services/portal.service';
import type { CustomerPortalSummary, CustomerPortalTicket, TicketFeedback } from '../types';

export const usePortalStore = defineStore('portal', () => {
  const summary = ref<CustomerPortalSummary | null>(null);
  const tickets = ref<CustomerPortalTicket[]>([]);
  const selectedTicket = ref<CustomerPortalTicket | null>(null);
  const feedback = ref<TicketFeedback | null>(null);
  const loading = ref(false);
  const detailLoading = ref(false);
  const submitLoading = ref(false);
  const error = ref<string | null>(null);
  const notice = ref<string | null>(null);

  const hasTickets = computed(() => tickets.value.length > 0);

  const loadDashboard = async (): Promise<void> => {
    loading.value = true;
    error.value = null;
    try {
      const [dashboardSummary, ticketList] = await Promise.all([
        fetchPortalSummary(),
        fetchPortalTickets()
      ]);
      summary.value = dashboardSummary;
      tickets.value = ticketList;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to load portal');
    } finally {
      loading.value = false;
    }
  };

  const loadTicketDetail = async (ticketId: number): Promise<void> => {
    detailLoading.value = true;
    error.value = null;
    try {
      // In a full implementation, fetch the detail from an endpoint
      // For now, find it from the list or fetch from /tickets/:id
      const fromList = tickets.value.find(t => t.id === ticketId);
      if (fromList) {
        selectedTicket.value = fromList;
      } else {
        // Fallback to fetching from /tickets/:id (backend must check customer scope)
        selectedTicket.value = await api.get(`/tickets/${ticketId}`).then(r => r.data.data);
      }
      feedback.value = await fetchTicketFeedback(ticketId);
    } catch (cause) {
      selectedTicket.value = null;
      error.value = toErrorMessage(cause, 'Unable to load ticket');
    } finally {
      detailLoading.value = false;
    }
  };

  const submitFeedback = async (ticketId: number, rating: number, comment?: string): Promise<boolean> => {
    error.value = null;
    submitLoading.value = true;
    try {
      const submitted = await submitTicketFeedback(ticketId, { rating, comment });
      feedback.value = submitted;
      notice.value = 'Thank you for your feedback!';
      return true;
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to submit feedback');
      return false;
    } finally {
      submitLoading.value = false;
    }
  };

  return {
    summary,
    tickets,
    selectedTicket,
    feedback,
    loading,
    detailLoading,
    submitLoading,
    error,
    notice,
    hasTickets,
    loadDashboard,
    loadTicketDetail,
    submitFeedback
  };
});
```

### 4 — Create customer portal dashboard view

**Create file: `frontend/src/views/CustomerPortalView.vue`**

```vue
<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { usePortalStore } from '../stores/portal';
import { useAuthStore } from '../stores/auth';
import { RouterLink } from 'vue-router';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = usePortalStore();
const auth = useAuthStore();

onMounted(() => store.loadDashboard());

const priorityVariant = (priority: string): 'danger' | 'warning' | 'primary' | 'neutral' => {
  switch (priority) {
    case 'Urgent': return 'danger';
    case 'High': return 'warning';
    case 'Medium': return 'primary';
    default: return 'neutral';
  }
};

const statusVariant = (status: string): 'success' | 'primary' | 'warning' | 'neutral' => {
  switch (status) {
    case 'Resolved':
    case 'Closed': return 'success';
    case 'In Progress': return 'primary';
    case 'Pending': return 'warning';
    default: return 'neutral';
  }
};
</script>

<template>
  <PageHeader
    title="My Tickets"
    subtitle="View your support tickets and track their status."
  />

  <AlertBanner v-if="store.error" type="error" :message="store.error" />
  <AlertBanner v-if="store.notice" type="success" :message="store.notice" />

  <LoadingState v-if="store.loading" />

  <template v-else-if="!store.loading && !store.hasTickets">
    <EmptyState
      title="No tickets yet"
      description="You don't have any support tickets. If you need assistance, please contact our support team."
    />
  </template>

  <template v-else>
    <!-- Summary cards -->
    <div class="summary-cards">
      <div class="summary-card">
        <div class="summary-label">Total Tickets</div>
        <div class="summary-value">{{ store.summary?.totalTickets ?? 0 }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Open Tickets</div>
        <div class="summary-value">{{ store.summary?.openTickets ?? 0 }}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Resolved Tickets</div>
        <div class="summary-value">{{ store.summary?.resolvedTickets ?? 0 }}</div>
      </div>
    </div>

    <!-- Tickets table -->
    <table data-testid="portal-tickets-table" class="tickets-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Status</th>
          <th>Priority</th>
          <th>Category</th>
          <th>Created</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="ticket in store.tickets"
          :key="ticket.id"
          data-testid="portal-ticket-row"
        >
          <td>
            <RouterLink
              :to="{ name: 'portal-ticket-detail', params: { id: ticket.id } }"
              class="link"
            >
              {{ ticket.subject }}
            </RouterLink>
          </td>
          <td>
            <StatusBadge :variant="statusVariant(ticket.status)">
              {{ ticket.status }}
            </StatusBadge>
          </td>
          <td>
            <StatusBadge :variant="priorityVariant(ticket.priority)">
              {{ ticket.priority }}
            </StatusBadge>
          </td>
          <td>{{ ticket.category?.name ?? '—' }}</td>
          <td>{{ new Date(ticket.createdAt).toLocaleDateString() }}</td>
        </tr>
      </tbody>
    </table>
  </template>
</template>

<style scoped>
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.summary-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
  background: var(--background-secondary);
}

.summary-label {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.summary-value {
  font-size: 2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.tickets-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.tickets-table thead {
  background: var(--background-secondary);
}

.tickets-table th {
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  border-bottom: 1px solid var(--border-color);
}

.tickets-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.tickets-table tbody tr:hover {
  background: var(--background-secondary);
}

.link {
  color: var(--color-primary);
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}
</style>
```

### 5 — Create customer portal ticket detail view

**Create file: `frontend/src/views/CustomerPortalTicketDetailView.vue`**

```vue
<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { usePortalStore } from '../stores/portal';
import PageHeader from '../components/ui/PageHeader.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = usePortalStore();
const route = useRoute();
const ticketId = computed(() => Number(route.params.id));

onMounted(() => store.loadTicketDetail(ticketId.value));

const rating = ref(0);
const comment = ref('');
const isSubmitting = ref(false);

const isClosed = computed(() =>
  ['Resolved', 'Closed'].includes(store.selectedTicket?.status ?? '')
);

const canSubmitFeedback = computed(() =>
  isClosed.value && !store.feedback && !store.submitLoading
);

const submitFeedback = async () => {
  if (!rating.value || rating.value < 1 || rating.value > 5) return;
  
  const success = await store.submitFeedback(
    ticketId.value,
    rating.value,
    comment.value || undefined
  );
  
  if (success) {
    rating.value = 0;
    comment.value = '';
  }
};

const statusVariant = (status: string): 'success' | 'primary' | 'warning' | 'neutral' => {
  switch (status) {
    case 'Resolved':
    case 'Closed': return 'success';
    case 'In Progress': return 'primary';
    case 'Pending': return 'warning';
    default: return 'neutral';
  }
};
</script>

<template>
  <PageHeader
    :title="store.selectedTicket?.subject ?? 'Ticket'"
    subtitle="Track your support request status and submit feedback."
  />

  <RouterLink to="/portal" class="back-link">← Back to My Tickets</RouterLink>

  <AlertBanner v-if="store.error" type="error" :message="store.error" />
  <AlertBanner v-if="store.notice" type="success" :message="store.notice" />

  <LoadingState v-if="store.detailLoading" />

  <template v-else-if="!store.detailLoading && !store.selectedTicket">
    <EmptyState
      title="Ticket not found"
      description="This ticket may have been removed or you don't have permission to view it."
    />
  </template>

  <template v-else>
    <!-- Ticket details card -->
    <div class="detail-card">
      <div class="detail-row">
        <div class="detail-label">Status</div>
        <StatusBadge :variant="statusVariant(store.selectedTicket.status)">
          {{ store.selectedTicket.status }}
        </StatusBadge>
      </div>
      <div class="detail-row">
        <div class="detail-label">Priority</div>
        <span>{{ store.selectedTicket.priority }}</span>
      </div>
      <div class="detail-row">
        <div class="detail-label">Category</div>
        <span>{{ store.selectedTicket.category?.name ?? '—' }}</span>
      </div>
      <div class="detail-row">
        <div class="detail-label">Created</div>
        <span>{{ new Date(store.selectedTicket.createdAt).toLocaleString() }}</span>
      </div>
    </div>

    <!-- Feedback section -->
    <div class="feedback-section">
      <h3>Feedback</h3>
      
      <div v-if="store.feedback" class="feedback-view">
        <div class="feedback-rating">
          <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= store.feedback.rating }">★</span>
          <span class="rating-text">{{ store.feedback.rating }}/5</span>
        </div>
        <p v-if="store.feedback.comment" class="feedback-comment">{{ store.feedback.comment }}</p>
        <p v-else class="feedback-comment neutral">No comment provided</p>
        <p class="feedback-date">Submitted {{ new Date(store.feedback.createdAt).toLocaleDateString() }}</p>
      </div>

      <div v-else-if="!isClosed" class="feedback-closed">
        <p>Feedback can be submitted after your ticket is resolved.</p>
      </div>

      <form v-else @submit.prevent="submitFeedback" class="feedback-form">
        <div class="form-field">
          <label for="rating">Rate your experience (1–5 stars)</label>
          <div class="rating-input">
            <button
              v-for="i in 5"
              :key="i"
              type="button"
              class="star-button"
              :class="{ selected: i <= rating }"
              @click="rating = i"
              :data-testid="`feedback-star-${i}`"
            >
              ★
            </button>
          </div>
        </div>

        <div class="form-field">
          <label for="comment">Additional comments (optional)</label>
          <textarea
            v-model="comment"
            id="comment"
            placeholder="Tell us about your experience..."
            data-testid="feedback-comment-input"
            rows="4"
            maxlength="1000"
          />
        </div>

        <button
          type="submit"
          :disabled="!rating || store.submitLoading"
          data-testid="submit-feedback-button"
          class="btn btn-primary"
        >
          {{ store.submitLoading ? 'Submitting...' : 'Submit Feedback' }}
        </button>
      </form>
    </div>
  </template>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 1rem;
  color: var(--color-primary);
  text-decoration: none;
  font-size: 0.875rem;
}

.back-link:hover {
  text-decoration: underline;
}

.detail-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  background: var(--background-secondary);
  margin-bottom: 2rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
}

.detail-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.detail-label {
  font-weight: 600;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.feedback-section {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.5rem;
  background: var(--background-secondary);
}

.feedback-section h3 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.feedback-view {
  background: var(--background-primary);
  border-radius: 6px;
  padding: 1rem;
}

.feedback-rating {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 1.5rem;
}

.star {
  color: #ffd700;
}

.star:not(.filled) {
  color: var(--border-color);
}

.rating-text {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-left: 0.5rem;
}

.feedback-comment {
  margin: 1rem 0;
  line-height: 1.5;
}

.feedback-comment.neutral {
  color: var(--text-secondary);
  font-style: italic;
}

.feedback-date {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 1rem;
}

.feedback-closed {
  background: var(--background-primary);
  border-radius: 6px;
  padding: 1rem;
  color: var(--text-secondary);
  text-align: center;
}

.feedback-form {
  background: var(--background-primary);
  border-radius: 6px;
  padding: 1rem;
}

.form-field {
  margin-bottom: 1.5rem;
}

.form-field label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.rating-input {
  display: flex;
  gap: 0.5rem;
}

.star-button {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--border-color);
  transition: color 0.2s;
}

.star-button:hover,
.star-button.selected {
  color: #ffd700;
}

textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.875rem;
  resize: vertical;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.875rem;
  transition: opacity 0.2s;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
```

### 6 — Add routes

**File: `frontend/src/router/index.ts`**

Add imports at the top:

```ts
import CustomerPortalView from '../views/CustomerPortalView.vue';
import CustomerPortalTicketDetailView from '../views/CustomerPortalTicketDetailView.vue';
```

Add routes before the catch-all 404 route:

```ts
{
  path: '/portal',
  name: 'portal',
  component: CustomerPortalView,
  meta: { permission: 'customers:read' } // Customer role has this implicitly via portal access
},
{
  path: '/portal/tickets/:id',
  name: 'portal-ticket-detail',
  component: CustomerPortalTicketDetailView,
  meta: { permission: 'customers:read' }
},
```

### 7 — Update sidebar navigation

**File: `frontend/src/components/AppSidebar.vue`**

The existing `navLabel` logic in the sidebar already works for dynamic routes. However, portal routes are not shown in the sidebar (no `navLabel` in route meta, consistent with customer-detail routes from Story 12). Instead, add a hardcoded "My Tickets" link for customer-role users only:

```vue
<!-- In the template, after existing nav items -->
<router-link
  v-if="auth.user?.role?.key === 'CUSTOMER'"
  to="/portal"
  class="nav-link"
>
  My Tickets
</router-link>
```

Alternatively, use `auth.can('customers:read')` as a looser check (agents can view customers but not access the portal).

### 8 — Add tests

1. **`frontend/src/tests/portal.service.spec.ts`** — mock axios; assert each function calls the correct endpoint and transforms the response correctly.

2. **`frontend/src/tests/portal.store.spec.ts`** — `loadDashboard` fetches summary and tickets concurrently, `loadTicketDetail` sets `selectedTicket` and fetches feedback, `submitFeedback` sends data and updates state.

3. **`frontend/src/tests/CustomerPortalView.spec.ts`** — mount with mocked store; assert summary cards render correct values, ticket table renders one row per ticket, clicking a ticket navigates to detail route.

4. **`frontend/src/tests/CustomerPortalTicketDetailView.spec.ts`** — assert feedback form appears only when `isClosed && !feedback`, star rating buttons work, submit sends payload and clears form, existing feedback displays as read-only.

5. **`frontend/src/tests/router.spec.ts`** — add assertions for `/portal` (name `portal`) and `/portal/tickets/42` (name `portal-ticket-detail`, `params.id === '42'`).

---

## Edge Cases & Failure Modes

- **Customer logs in and navigates to `/portal` before any tickets exist.** `loadDashboard` returns empty arrays and zero counts. The view renders the `EmptyState` ("No tickets yet") instead of an error.

- **Customer submits feedback with rating but empty comment field.** `comment` is optional; submission succeeds and the backend stores `comment: null` in the database.

- **Customer tries to submit feedback twice on the same ticket.** The first submission succeeds. The second attempt (button still visible until page refresh) calls the API, which returns `409 "Feedback already submitted for this ticket"`. `submitFeedback` catches the error and displays `AlertBanner` with the conflict message.

- **Customer tries to rate a ticket that is still open.** The `isClosed` computed is false, so the feedback form never renders. The view shows "Feedback can be submitted after your ticket is resolved."

- **Accessing `/portal/tickets/999999` (nonexistent ticket).** `loadTicketDetail` catches the 404 and sets `selectedTicket = null`, rendering the "Ticket not found" `EmptyState`.

- **An agent or supervisor logs in and tries to navigate to `/portal`.** The route guard checks `meta.permission: 'customers:read'`. An agent role does not have this permission (or has it narrowly scoped). The guard should redirect to a "Forbidden" view (Story 09's `ForbiddenView`). Alternatively, the route only appears for CUSTOMER role and never navigates.

- **XSS in feedback comment (e.g., `<img src=x onerror=alert('xss')>`).** Stored as-is in the database. The frontend template binds it as `{{ store.feedback.comment }}` (Vue auto-escapes text content) — the comment displays safely. **However**, if the template uses `v-html` (it does not in this plan), the payload would execute. This plan uses `{{ }}` text binding only, so it is safe.

- **Backend is offline when customer loads `/portal`.** `loadDashboard` catches the network error and displays `AlertBanner` with a generic "Unable to load portal" message. The page remains on the view without a fatal crash.

- **Customer submits feedback with `rating: "3"` (string instead of number).** Zod schema in the backend (Story 16 task 6) validates `z.number().int()`, so the API returns `400 "Invalid input"`. Frontend's `submitFeedback` catches the error and displays it via `AlertBanner`.

---

## Test Plan

1. **Service tests** (`frontend/src/tests/portal.service.spec.ts`): assert each function calls the correct endpoint with correct params.
2. **Store tests** (`frontend/src/tests/portal.store.spec.ts`): `loadDashboard` populates `summary` and `tickets`; `loadTicketDetail` loads ticket and feedback; `submitFeedback` returns `true` on success and updates `feedback`.
3. **View tests** (`frontend/src/tests/CustomerPortalView.spec.ts`): summary cards display `store.summary` values; table renders one row per `tickets` item; clicking a row navigates to detail.
4. **Detail view tests** (`frontend/src/tests/CustomerPortalTicketDetailView.spec.ts`): feedback form hidden when `!isClosed`; form visible and working when closed and no feedback; existing feedback displays as read-only; star rating click updates state.
5. **Router tests** (`frontend/src/tests/router.spec.ts`): `/portal` resolves to `customers` (or update the name), `/portal/tickets/42` resolves to `portal-ticket-detail`.

---

## Verification Steps

**Frontend builds:** `npm run build` exits 0 from `frontend/`.

**Tests pass:** `npm test` exits 0 from `frontend/`, including all portal specs.

**Dev smoke test:**
1. `npm run dev` in both `backend/` and `frontend/`.
2. Log in as a customer user (seed a customer user if needed, or use an existing CUSTOMER-role account).
3. Confirm the sidebar shows a "My Tickets" link (if not, the sidebar logic needs adjustment).
4. Click "My Tickets" and confirm it navigates to `/portal`.
5. Confirm the dashboard displays the summary cards with correct ticket counts and a list of the customer's tickets.
6. Click a ticket in the list and confirm the detail page loads.
7. If the ticket is resolved/closed, confirm the feedback form appears with a 5-star rating input and comment textarea.
8. Submit feedback with a 4-star rating and a comment; confirm the form clears and the feedback section shows the submitted feedback as read-only.
9. Refresh the page and confirm the feedback persists (re-fetched from the API).
10. Try to submit feedback again; confirm the API returns a conflict error and the form does not clear.

---

## Done Criteria

- [ ] `CustomerPortalView.vue` displays customer's ticket summary and list with status/priority badges.
- [ ] `CustomerPortalTicketDetailView.vue` shows ticket details and feedback section (form when closed/no feedback, read-only when feedback exists).
- [ ] Feedback form works: 1–5 star rating, optional comment, submit button, form clears on success.
- [ ] `/portal` and `/portal/tickets/:id` routes exist and are permission-gated.
- [ ] Sidebar shows "My Tickets" link for CUSTOMER role (if applicable; route is still accessible via direct URL navigation if not).
- [ ] All service/store/view/detail tests pass; `npm test` exits 0 in `frontend/`.
- [ ] `npm run build` and `npm run typecheck` exit 0.
- [ ] Smoke test: customer can log in, view tickets, submit feedback, and see it persisted.
