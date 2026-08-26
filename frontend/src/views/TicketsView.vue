<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { TICKET_SCOPES, TICKET_SCOPE_LABELS, useTicketsStore } from '../stores/tickets';
import type { TicketScope } from '../stores/tickets';
import { isTicketOverdue } from '../services/ticketSla';
import { fetchCustomers } from '../services/customers.service';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../types';
import type { Customer, Ticket, TicketPriority } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';
import SlaIndicator from '../components/ui/SlaIndicator.vue';

/** Background refresh interval. Also what drives the in-app notification diff. */
const POLL_INTERVAL_MS = 30_000;

const store = useTicketsStore();
const auth = useAuthStore();

const canManage = computed(() => auth.can('tickets:manage'));

const statusVariant = (status: Ticket['status']): 'success' | 'neutral' | 'primary' | 'warning' | 'info' => {
  switch (status) {
    case 'New':
      return 'info';
    case 'Open':
      return 'primary';
    case 'In Progress':
      return 'primary';
    case 'Pending':
      return 'warning';
    case 'Resolved':
      return 'success';
    case 'Closed':
      return 'neutral';
  }
};

const priorityVariant = (priority: TicketPriority): 'neutral' | 'primary' | 'warning' | 'danger' => {
  switch (priority) {
    case 'Low':
      return 'neutral';
    case 'Medium':
      return 'primary';
    case 'High':
      return 'warning';
    case 'Urgent':
      return 'danger';
  }
};

// --- Create form ---------------------------------------------------------------
const isCreating = ref(false);
const customers = ref<Customer[]>([]);
const newSubject = ref('');
const newCustomerId = ref<number | ''>('');
const newPriority = ref<TicketPriority>('Medium');
const newCategoryId = ref<number | ''>('');

const onStartCreate = async (): Promise<void> => {
  isCreating.value = true;
  if (customers.value.length === 0) {
    try {
      customers.value = await fetchCustomers();
    } catch {
      // The customer dropdown is a convenience; a failure here is reported by the store's
      // own error banner on the next action rather than blocking the form.
      customers.value = [];
    }
  }
};

const onCancelCreate = (): void => {
  isCreating.value = false;
  newSubject.value = '';
  newCustomerId.value = '';
  newPriority.value = 'Medium';
  newCategoryId.value = '';
};

const onSubmitCreate = async (): Promise<void> => {
  if (newSubject.value.trim().length === 0 || newCustomerId.value === '') return;
  const created = await store.submitTicket({
    subject: newSubject.value.trim(),
    customerId: Number(newCustomerId.value),
    priority: newPriority.value,
    categoryId: newCategoryId.value === '' ? undefined : Number(newCategoryId.value)
  });
  if (created) onCancelCreate();
};

// --- Filters ------------------------------------------------------------------
const onSelectScope = async (next: TicketScope): Promise<void> => {
  await store.setScope(next);
};

const onClearFilters = (): void => {
  store.statusFilter = '';
  store.priorityFilter = '';
  store.categoryFilter = '';
};

const hasFilters = computed(
  () => store.statusFilter !== '' || store.priorityFilter !== '' || store.categoryFilter !== ''
);

const onClaim = async (ticketId: number): Promise<void> => {
  await store.claimTicket(ticketId);
};

const formatDate = (value: string): string => new Date(value).toLocaleDateString();

// --- Polling ------------------------------------------------------------------
let pollTimer: ReturnType<typeof setInterval> | undefined;

onMounted(async () => {
  await Promise.all([store.loadTickets(), store.loadCategories()]);
  pollTimer = setInterval(() => {
    void store.loadTickets({ silent: true });
  }, POLL_INTERVAL_MS);
});

onUnmounted(() => {
  if (pollTimer !== undefined) clearInterval(pollTimer);
});
</script>

<template>
  <section class="view">
    <PageHeader title="Tickets" subtitle="Your queue, the open backlog, and anything past its SLA.">
      <template #actions>
        <button
          v-if="canManage && !isCreating"
          class="btn btn-primary"
          type="button"
          data-testid="new-ticket-button"
          @click="onStartCreate"
        >
          New ticket
        </button>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="tickets-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="tickets-notice">{{ store.notice }}</AlertBanner>

    <div v-if="isCreating" class="card">
      <div class="card-header">
        <h3 class="card-title">New ticket</h3>
      </div>
      <form class="card-padded" data-testid="create-ticket-form" @submit.prevent="onSubmitCreate">
        <div class="form-grid">
          <div class="form-field">
            <label for="new-ticket-subject">Subject</label>
            <input
              id="new-ticket-subject"
              v-model="newSubject"
              data-testid="new-ticket-subject-input"
              type="text"
              maxlength="255"
              required
            />
          </div>
          <div class="form-field">
            <label for="new-ticket-customer">Customer</label>
            <select
              id="new-ticket-customer"
              v-model="newCustomerId"
              data-testid="new-ticket-customer-select"
              required
            >
              <option value="">Select a customer…</option>
              <option v-for="customer in customers" :key="customer.id" :value="customer.id">
                {{ customer.name }}
              </option>
            </select>
          </div>
          <div class="form-field">
            <label for="new-ticket-priority">Priority</label>
            <select id="new-ticket-priority" v-model="newPriority" data-testid="new-ticket-priority-select">
              <option v-for="value in TICKET_PRIORITIES" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="new-ticket-category">Category</label>
            <select id="new-ticket-category" v-model="newCategoryId" data-testid="new-ticket-category-select">
              <option value="">No category</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" data-testid="submit-ticket-button">Create ticket</button>
          <button class="btn btn-secondary" type="button" data-testid="cancel-create-button" @click="onCancelCreate">
            Cancel
          </button>
        </div>
      </form>
    </div>

    <div class="card">
      <div class="card-header scope-header">
        <div class="scope-tabs" role="tablist" data-testid="scope-tabs">
          <button
            v-for="value in TICKET_SCOPES"
            :key="value"
            class="scope-tab"
            :class="{ 'is-active': store.scope === value }"
            type="button"
            role="tab"
            :aria-selected="store.scope === value"
            :data-testid="`scope-tab-${value}`"
            @click="onSelectScope(value)"
          >
            {{ TICKET_SCOPE_LABELS[value] }}
            <span v-if="value === 'overdue' && store.counts.overdue > 0" class="scope-count">
              {{ store.counts.overdue }}
            </span>
            <span v-else-if="value === 'unassigned' && store.counts.unassigned > 0" class="scope-count">
              {{ store.counts.unassigned }}
            </span>
          </button>
        </div>
      </div>

      <div class="card-padded">
        <div class="filter-bar">
          <div class="form-field">
            <label for="filter-status">Status</label>
            <select id="filter-status" v-model="store.statusFilter" data-testid="filter-status-select">
              <option value="">All statuses</option>
              <option v-for="value in TICKET_STATUSES" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="filter-priority">Priority</label>
            <select id="filter-priority" v-model="store.priorityFilter" data-testid="filter-priority-select">
              <option value="">All priorities</option>
              <option v-for="value in TICKET_PRIORITIES" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="filter-category">Category</label>
            <select id="filter-category" v-model="store.categoryFilter" data-testid="filter-category-select">
              <option value="">All categories</option>
              <option v-for="category in store.categories" :key="category.id" :value="category.id">
                {{ category.name }}
              </option>
            </select>
          </div>
          <button
            v-if="hasFilters"
            class="btn btn-ghost btn-sm"
            type="button"
            data-testid="clear-filters-button"
            @click="onClearFilters"
          >
            Clear filters
          </button>
        </div>

        <LoadingState v-if="store.loading" data-testid="tickets-loading">Loading tickets…</LoadingState>

        <EmptyState
          v-else-if="!store.hasTickets"
          title="No tickets here"
          description="Nothing matches this queue and filter combination."
          data-testid="tickets-empty"
        />

        <div v-else class="table-wrapper">
          <table data-testid="tickets-table">
            <thead>
              <tr>
                <th scope="col">#</th>
                <th scope="col">Subject</th>
                <th scope="col">Status</th>
                <th scope="col">Priority</th>
                <th scope="col">Category</th>
                <th scope="col">Assignee</th>
                <th scope="col">SLA</th>
                <th scope="col">Created</th>
                <th scope="col"><span class="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ticket in store.visibleTickets"
                :key="ticket.id"
                :class="{ 'is-overdue': isTicketOverdue(ticket) }"
                data-testid="ticket-row"
              >
                <td>{{ ticket.id }}</td>
                <td>
                  <RouterLink
                    class="subject-link"
                    :to="{ name: 'ticket-detail', params: { id: ticket.id } }"
                    data-testid="ticket-subject-link"
                  >
                    {{ ticket.subject }}
                  </RouterLink>
                </td>
                <td><StatusBadge :variant="statusVariant(ticket.status)">{{ ticket.status }}</StatusBadge></td>
                <td><StatusBadge :variant="priorityVariant(ticket.priority)">{{ ticket.priority }}</StatusBadge></td>
                <td>{{ ticket.category?.name ?? '—' }}</td>
                <td>{{ ticket.assignedTo?.name ?? 'Unassigned' }}</td>
                <td><SlaIndicator :ticket="ticket" compact /></td>
                <td>{{ formatDate(ticket.createdAt) }}</td>
                <td>
                  <button
                    v-if="canManage && ticket.assignedToUserId === null"
                    class="btn btn-secondary btn-sm"
                    type="button"
                    data-testid="claim-ticket-button"
                    @click="onClaim(ticket.id)"
                  >
                    Claim
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.scope-header {
  padding-bottom: 0;
}

.scope-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.scope-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: var(--font-sm);
  font-weight: 500;
  color: var(--text-muted);
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.scope-tab:hover {
  color: var(--text-main);
}

.scope-tab.is-active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.scope-count {
  background-color: var(--color-down-bg);
  color: var(--color-down);
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 600;
  padding: 0.05rem 0.4rem;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.subject-link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.subject-link:hover {
  text-decoration: underline;
}

tr.is-overdue td:first-child {
  box-shadow: inset 3px 0 0 var(--color-down-solid);
}
</style>
