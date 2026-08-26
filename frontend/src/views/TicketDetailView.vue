<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useTicketsStore } from '../stores/tickets';
import { fetchUsers } from '../services/users.service';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../types';
import type { TicketAttachment, TicketPriority, TicketStatus } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';
import SlaIndicator from '../components/ui/SlaIndicator.vue';

/** Detail refresh interval — drives the "new comment" notification. */
const POLL_INTERVAL_MS = 30_000;

const route = useRoute();
const store = useTicketsStore();
const auth = useAuthStore();

const ticketId = computed(() => Number(route.params.id));
const canManage = computed(() => auth.can('tickets:manage'));
const canSeeAgents = computed(() => auth.can('users:read'));

const ticket = computed(() => store.selectedTicket);

const statusVariant = (status: TicketStatus): 'success' | 'neutral' | 'primary' | 'warning' | 'info' => {
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

// --- Assignable agents ---------------------------------------------------------
interface AgentOption {
  id: number;
  name: string;
}
const agents = ref<AgentOption[]>([]);

const loadAgents = async (): Promise<void> => {
  if (!canSeeAgents.value || agents.value.length > 0) return;
  try {
    const users = await fetchUsers();
    // The API rejects a deactivated or customer-role assignee with a 400, so they are not
    // offered here in the first place.
    agents.value = users
      .filter((user) => user.isActive && user.roleKey !== 'CUSTOMER')
      .map((user) => ({ id: user.id, name: user.name }));
  } catch {
    agents.value = [];
  }
};

// --- Inline workflow edits -----------------------------------------------------
const onChangeStatus = async (event: Event): Promise<void> => {
  const status = (event.target as HTMLSelectElement).value as TicketStatus;
  await store.saveTicket(ticketId.value, { status });
};

const onChangePriority = async (event: Event): Promise<void> => {
  const priority = (event.target as HTMLSelectElement).value as TicketPriority;
  await store.saveTicket(ticketId.value, { priority });
};

const onChangeCategory = async (event: Event): Promise<void> => {
  const raw = (event.target as HTMLSelectElement).value;
  await store.saveTicket(ticketId.value, { categoryId: raw === '' ? null : Number(raw) });
};

const onChangeAssignee = async (event: Event): Promise<void> => {
  const raw = (event.target as HTMLSelectElement).value;
  await store.changeAssignee(ticketId.value, raw === '' ? null : Number(raw));
};

const onClaim = async (): Promise<void> => {
  await store.claimTicket(ticketId.value);
};

// --- Comments ------------------------------------------------------------------
const commentBody = ref('');

const onAddComment = async (): Promise<void> => {
  if (commentBody.value.trim().length === 0) return;
  const added = await store.submitComment(ticketId.value, commentBody.value.trim());
  if (added) commentBody.value = '';
};

// --- Attachments ---------------------------------------------------------------
const fileInput = ref<HTMLInputElement | null>(null);

const onUploadAttachment = async (): Promise<void> => {
  const file = fileInput.value?.files?.[0];
  if (!file) return;
  const uploaded = await store.submitAttachment(ticketId.value, file);
  if (uploaded && fileInput.value) fileInput.value.value = '';
};

const onDownloadAttachment = async (attachment: TicketAttachment): Promise<void> => {
  await store.downloadAttachment(ticketId.value, attachment);
};

const onDeleteAttachment = async (attachmentId: number): Promise<void> => {
  await store.removeAttachment(ticketId.value, attachmentId);
};

// --- Unified communication timeline --------------------------------------------
type TimelineEntry =
  | { kind: 'comment'; id: string; at: string; author: string; body: string }
  | {
      kind: 'interaction';
      id: string;
      at: string;
      channel: string;
      direction: string;
      body: string;
      subject: string | null;
    };

/**
 * "Communication Timeline داخل الـ Ticket" from the work item: the customer-facing
 * interactions and the agents' internal comments merged into one chronological thread, so an
 * agent reads the whole history in one place instead of two lists.
 */
const unifiedTimeline = computed<TimelineEntry[]>(() => {
  const comments: TimelineEntry[] = (ticket.value?.comments ?? []).map((comment) => ({
    kind: 'comment',
    id: `comment-${comment.id}`,
    at: comment.createdAt,
    author: comment.author.name,
    body: comment.body
  }));

  const interactions: TimelineEntry[] = store.timeline.map((interaction) => ({
    kind: 'interaction',
    id: `interaction-${interaction.id}`,
    at: interaction.occurredAt,
    channel: interaction.channel,
    direction: interaction.direction,
    body: interaction.body,
    subject: interaction.subject
  }));

  return [...comments, ...interactions].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  );
});

const isTimelineEmpty = computed(() => unifiedTimeline.value.length === 0);
const isAttachmentsEmpty = computed(() => (ticket.value?.attachments.length ?? 0) === 0);

const formatDateTime = (value: string): string => new Date(value).toLocaleString();
const formatSize = (sizeBytes: number): string => `${(sizeBytes / 1024).toFixed(1)} KB`;
const directionVariant = (value: string) => (value === 'INBOUND' ? 'info' : 'primary');

// --- Lifecycle -----------------------------------------------------------------
let pollTimer: ReturnType<typeof setInterval> | undefined;

const startPolling = (): void => {
  if (pollTimer !== undefined) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void store.loadTicketDetail(ticketId.value, { silent: true });
  }, POLL_INTERVAL_MS);
};

onMounted(async () => {
  store.resetDetail();
  await Promise.all([store.loadTicketDetail(ticketId.value), store.loadCategories(), loadAgents()]);
  startPolling();
});

// Navigating straight from one ticket to another reuses this component, so the detail
// baseline has to be dropped or the comment diff would fire against the wrong ticket.
watch(ticketId, async (next, previous) => {
  if (next === previous || Number.isNaN(next)) return;
  store.resetDetail();
  await store.loadTicketDetail(next);
  startPolling();
});

onUnmounted(() => {
  if (pollTimer !== undefined) clearInterval(pollTimer);
});
</script>

<template>
  <section class="view">
    <PageHeader
      :title="ticket ? `#${ticket.id} · ${ticket.subject}` : 'Ticket'"
      subtitle="Workflow, SLA, internal comments, attachments, and the full communication history."
    >
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'tickets' }" data-testid="back-to-tickets-link">
          Back to tickets
        </RouterLink>
      </template>
    </PageHeader>

    <AlertBanner v-if="store.error" variant="error" data-testid="ticket-detail-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="ticket-detail-notice">{{ store.notice }}</AlertBanner>

    <LoadingState v-if="store.detailLoading" data-testid="ticket-detail-loading">Loading ticket…</LoadingState>

    <EmptyState
      v-else-if="!ticket"
      title="Ticket not found"
      description="It may have been removed, or the link is incorrect."
      data-testid="ticket-not-found"
    >
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'tickets' }">Back to tickets</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Workflow</h3>
          <button
            v-if="canManage && ticket.assignedToUserId === null"
            class="btn btn-secondary btn-sm"
            type="button"
            data-testid="claim-ticket-button"
            @click="onClaim"
          >
            Assign to me
          </button>
        </div>

        <div class="card-padded">
          <div v-if="canManage" class="form-grid" data-testid="ticket-workflow-form">
            <div class="form-field">
              <label for="ticket-status">Status</label>
              <select
                id="ticket-status"
                :value="ticket.status"
                data-testid="ticket-status-select"
                @change="onChangeStatus"
              >
                <option v-for="value in TICKET_STATUSES" :key="value" :value="value">{{ value }}</option>
              </select>
            </div>
            <div class="form-field">
              <label for="ticket-priority">Priority</label>
              <select
                id="ticket-priority"
                :value="ticket.priority"
                data-testid="ticket-priority-select"
                @change="onChangePriority"
              >
                <option v-for="value in TICKET_PRIORITIES" :key="value" :value="value">{{ value }}</option>
              </select>
            </div>
            <div class="form-field">
              <label for="ticket-category">Category</label>
              <select
                id="ticket-category"
                :value="ticket.categoryId ?? ''"
                data-testid="ticket-category-select"
                @change="onChangeCategory"
              >
                <option value="">No category</option>
                <option v-for="category in store.categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
            </div>
            <div v-if="canSeeAgents" class="form-field">
              <label for="ticket-assignee">Assignee</label>
              <select
                id="ticket-assignee"
                :value="ticket.assignedToUserId ?? ''"
                data-testid="ticket-assignee-select"
                @change="onChangeAssignee"
              >
                <option value="">Unassigned</option>
                <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
              </select>
            </div>
          </div>

          <div v-else class="profile-grid" data-testid="ticket-workflow-readonly">
            <div class="profile-field">
              <span class="profile-label">Status</span>
              <StatusBadge :variant="statusVariant(ticket.status)">{{ ticket.status }}</StatusBadge>
            </div>
            <div class="profile-field">
              <span class="profile-label">Priority</span>
              <StatusBadge :variant="priorityVariant(ticket.priority)">{{ ticket.priority }}</StatusBadge>
            </div>
            <div class="profile-field">
              <span class="profile-label">Category</span>
              <span>{{ ticket.category?.name ?? '—' }}</span>
            </div>
            <div class="profile-field">
              <span class="profile-label">Assignee</span>
              <span>{{ ticket.assignedTo?.name ?? 'Unassigned' }}</span>
            </div>
          </div>

          <div class="profile-grid meta-grid">
            <div class="profile-field">
              <span class="profile-label">Customer</span>
              <RouterLink
                class="customer-link"
                :to="{ name: 'customer-detail', params: { id: ticket.customerId } }"
                data-testid="ticket-customer-link"
              >
                {{ ticket.customer.name }}
              </RouterLink>
            </div>
            <div class="profile-field">
              <span class="profile-label">Created</span>
              <span>{{ formatDateTime(ticket.createdAt) }}</span>
            </div>
            <div class="profile-field">
              <span class="profile-label">Last updated</span>
              <span>{{ formatDateTime(ticket.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">SLA</h3>
        </div>
        <div class="card-padded">
          <SlaIndicator :ticket="ticket" />
        </div>
      </div>

      <div v-if="canManage" class="card">
        <div class="card-header">
          <h3 class="card-title">Attachments</h3>
        </div>
        <div class="card-padded">
          <div class="attachment-form">
            <input ref="fileInput" data-testid="attachment-file-input" type="file" />
            <button
              class="btn btn-primary btn-sm"
              type="button"
              data-testid="upload-attachment-button"
              @click="onUploadAttachment"
            >
              Upload
            </button>
          </div>

          <EmptyState v-if="isAttachmentsEmpty" title="No attachments yet" />
          <ul v-else class="attachments-list" data-testid="attachments-list">
            <li
              v-for="attachment in ticket.attachments"
              :key="attachment.id"
              class="attachment-item"
              data-testid="attachment-item"
            >
              <span class="attachment-name">{{ attachment.fileName }}</span>
              <span class="attachment-size">{{ formatSize(attachment.sizeBytes) }}</span>
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                data-testid="download-attachment-button"
                @click="onDownloadAttachment(attachment)"
              >
                Download
              </button>
              <button
                class="btn btn-danger btn-sm"
                type="button"
                data-testid="delete-attachment-button"
                @click="onDeleteAttachment(attachment.id)"
              >
                Delete
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Communication timeline</h3>
        </div>
        <div class="card-padded">
          <form v-if="canManage" class="comment-form" data-testid="add-comment-form" @submit.prevent="onAddComment">
            <textarea
              v-model="commentBody"
              data-testid="comment-body-input"
              rows="3"
              placeholder="Add an internal comment…"
            ></textarea>
            <button class="btn btn-primary btn-sm" type="submit" data-testid="add-comment-button">
              Add comment
            </button>
          </form>

          <EmptyState
            v-if="isTimelineEmpty"
            title="Nothing here yet"
            description="Customer interactions and internal comments will appear together in this thread."
          />
          <ul v-else class="timeline" data-testid="unified-timeline">
            <li
              v-for="entry in unifiedTimeline"
              :key="entry.id"
              class="timeline-item"
              :class="entry.kind === 'comment' ? 'is-comment' : 'is-interaction'"
              :data-testid="entry.kind === 'comment' ? 'timeline-comment' : 'timeline-interaction'"
            >
              <div class="timeline-meta">
                <template v-if="entry.kind === 'comment'">
                  <StatusBadge variant="neutral">Internal note</StatusBadge>
                  <span class="entry-author">{{ entry.author }}</span>
                </template>
                <template v-else>
                  <StatusBadge variant="primary">{{ entry.channel }}</StatusBadge>
                  <StatusBadge :variant="directionVariant(entry.direction)">{{ entry.direction }}</StatusBadge>
                </template>
                <span class="occurred-at">{{ formatDateTime(entry.at) }}</span>
              </div>
              <p v-if="entry.kind === 'interaction' && entry.subject" class="entry-subject">{{ entry.subject }}</p>
              <p class="body">{{ entry.body }}</p>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-3);
}

.meta-grid {
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--border-color);
}

.profile-field {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.2rem;
}

.profile-label {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.customer-link {
  color: var(--color-primary);
  font-weight: 600;
  text-decoration: none;
}

.customer-link:hover {
  text-decoration: underline;
}

.comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: var(--space-4);
  max-width: 480px;
}

.attachment-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: var(--space-3);
}

.attachments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.attachment-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-3) 0;
}

.attachment-item:last-child {
  border-bottom: none;
}

.attachment-name {
  font-weight: 600;
  flex: 1;
}

.attachment-size {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.timeline-item {
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-3) 0 var(--space-3) var(--space-3);
  border-left: 3px solid transparent;
}

.timeline-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.timeline-item.is-comment {
  border-left-color: var(--slate-300);
  background-color: var(--surface-sunken);
}

.timeline-item.is-interaction {
  border-left-color: var(--color-primary-border);
}

.timeline-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.entry-author {
  font-weight: 600;
  font-size: var(--font-sm);
}

.occurred-at {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.entry-subject {
  font-weight: 600;
  font-size: var(--font-sm);
  margin-bottom: 0.2rem;
}

.body {
  color: var(--text-main);
  line-height: 1.55;
  font-size: var(--font-sm);
  white-space: pre-wrap;
}
</style>
