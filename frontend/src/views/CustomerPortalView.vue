<script setup lang="ts">
import { onMounted } from 'vue';
import { usePortalStore } from '../stores/portal';
import type { Ticket, TicketPriority } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = usePortalStore();

// Same status/priority colour mapping the agent queue uses, so a ticket reads the same way
// on both sides of the product.
const statusVariant = (status: Ticket['status']): 'success' | 'neutral' | 'primary' | 'warning' | 'info' => {
  switch (status) {
    case 'New':
      return 'info';
    case 'Open':
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

const formatDate = (value: string): string => new Date(value).toLocaleDateString();

onMounted(() => {
  void store.loadDashboard();
});
</script>

<template>
  <section class="view">
    <PageHeader title="My Tickets" subtitle="Track your support requests and rate the ones we have closed." />

    <AlertBanner v-if="store.error" variant="error" data-testid="portal-error">{{ store.error }}</AlertBanner>

    <LoadingState v-if="store.loading" data-testid="portal-loading">Loading your tickets…</LoadingState>

    <template v-else>
      <div v-if="store.summary" class="summary-grid" data-testid="portal-summary">
        <div class="summary-card">
          <p class="summary-label">Total</p>
          <p class="summary-value" data-testid="summary-total">{{ store.summary.totalTickets }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Open</p>
          <p class="summary-value" data-testid="summary-open">{{ store.summary.openTickets }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Awaiting your reply</p>
          <p class="summary-value" data-testid="summary-pending">{{ store.summary.pendingTickets }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Resolved</p>
          <p class="summary-value" data-testid="summary-resolved">{{ store.summary.resolvedTickets }}</p>
        </div>
        <div class="summary-card">
          <p class="summary-label">Awaiting feedback</p>
          <p class="summary-value" data-testid="summary-awaiting-feedback">
            {{ store.summary.awaitingFeedback }}
          </p>
        </div>
      </div>

      <div class="card">
        <div class="card-padded">
          <EmptyState
            v-if="!store.hasTickets"
            title="No tickets yet"
            description="When you contact our support team, your requests will appear here."
            data-testid="portal-empty"
          />

          <div v-else class="table-wrapper">
            <table data-testid="portal-tickets-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Status</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Category</th>
                  <th scope="col">Opened</th>
                  <th scope="col">Feedback</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ticket in store.tickets" :key="ticket.id" data-testid="portal-ticket-row">
                  <td>{{ ticket.id }}</td>
                  <td>
                    <RouterLink
                      class="subject-link"
                      :to="{ name: 'portal-ticket-detail', params: { id: ticket.id } }"
                      data-testid="portal-ticket-link"
                    >
                      {{ ticket.subject }}
                    </RouterLink>
                  </td>
                  <td>
                    <StatusBadge :variant="statusVariant(ticket.status)">{{ ticket.status }}</StatusBadge>
                  </td>
                  <td>
                    <StatusBadge :variant="priorityVariant(ticket.priority)">{{ ticket.priority }}</StatusBadge>
                  </td>
                  <td>{{ ticket.category?.name ?? '—' }}</td>
                  <td>{{ formatDate(ticket.createdAt) }}</td>
                  <td>
                    <span v-if="ticket.feedback" class="rating" data-testid="portal-ticket-rating">
                      {{ ticket.feedback.rating }}/5
                    </span>
                    <RouterLink
                      v-else-if="ticket.status === 'Resolved' || ticket.status === 'Closed'"
                      class="subject-link"
                      :to="{ name: 'portal-ticket-detail', params: { id: ticket.id } }"
                      data-testid="portal-leave-feedback-link"
                    >
                      Leave feedback
                    </RouterLink>
                    <span v-else class="muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.summary-card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.summary-label {
  margin: 0;
  font-size: var(--font-sm);
  color: var(--text-subtle);
}

.summary-value {
  margin: 0.35rem 0 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--text-main);
}

.rating {
  font-weight: 600;
}

.muted {
  color: var(--text-subtle);
}
</style>
