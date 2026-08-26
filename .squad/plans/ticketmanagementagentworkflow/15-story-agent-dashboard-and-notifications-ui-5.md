# Story 15 — Agent dashboard, notifications, and ticket management UI (Story: 5)

## Prerequisites

- Story 14 completed: [14-story-ticket-management-apis-5.md](14-story-ticket-management-apis-5.md). Specifically: all ticket CRUD, assignment, comment, and attachment endpoints are working; OpenAPI is documented; tests pass.
- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). Specifically: Vue 3 app with routing, auth store, protected routes, and user management screen are in place.
- Story 06 completed: [../communicationchannels/06-story-communication-timeline-ui-2.md](../communicationchannels/06-story-communication-timeline-ui-2.md). Specifically: the communication channel components and timeline UI patterns exist.
- The backend is running with Story 13 data model, Story 14 APIs, and seeded categories/tickets.

---

## Story Goal

Build an agent-facing ticket management dashboard and update the ticket detail view with full CRUD, comments, attachments, assignment, and SLA status. Outcomes:

1. Agent dashboard with ticket list, filterable by status, priority, category, and assignment (showing "My Tickets", "Open", "Pending", "Overdue").
2. Ticket detail view with inline status/priority/category/assignment editing.
3. Internal comments section (agent-only) with add-comment form.
4. Attachments section with upload and list.
5. Communication timeline alongside comments in a unified ticket timeline.
6. In-app notifications (toast alerts) for ticket assignment, status changes, and new comments when a dashboard or detail view is open and polling for updates.
7. SLA status indicator showing response/resolution time and overdue status (client-side computation).
8. Create new ticket form (available to agents from dashboard, scoped to customer for `CUSTOMER`-role users).

**Not in scope for this story:** real-time notifications via WebSocket, bulk ticket operations, advanced filters/saved searches, reporting/export, customer-facing ticket creation UI, email notifications, and automatic SLA escalation alerts.

---

## Context — Read These Files First

1. [.squad/stories/ticketmanagementagentworkflow/5/intake.md](../../stories/ticketmanagementagentworkflow/5/intake.md) — `## Description` lists "Agent Dashboard", "My Tickets", "Open Tickets", "Pending Tickets", "Overdue Tickets", "In-app notifications", and "Communication Timeline داخل الـ Ticket". This story delivers the UI for those features.

2. `frontend/src/views/` — inspect existing views: `LoginView.vue`, `UserManagementView.vue` (from Story 09), `CommunicationView.vue` (from Story 06). Story 15 adds `AgentDashboardView.vue` and `TicketDetailView.vue` following the same patterns (composition API, `<script setup>`, fetching via store actions, Pinia for state).

3. `frontend/src/stores/` — specifically `authStore.ts` and the auth patterns. Story 15 adds `ticketStore.ts` with state for tickets, categories, filters, and actions for CRUD/comments/attachments.

4. `frontend/src/types/index.ts` — hand-copied RBAC vocabulary and `Ticket`, `TicketComment`, `TicketAttachment`, `TicketCategory` TypeScript interfaces (mirroring the backend DTOs from Story 14).

5. `frontend/src/components/` — existing components like `CommunicationTimeline.vue` (from Story 06). Story 15 adds `TicketForm.vue`, `TicketDetailCard.vue`, `TicketCommentForm.vue`, `AttachmentUpload.vue`, `SlaIndicator.vue`.

6. `frontend/src/router/index.ts` — add protected routes for `/tickets`, `/tickets/:id`. Routes should require `'tickets:read'` at minimum.

7. Story 09's `UserManagementView.vue` or Story 06's communication view — copy the structure for list + detail view pattern, filtering UI, error handling, loading states.

8. [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md) — read the test plan and verification section to understand the Vue testing patterns (unit tests, component tests, E2E if applicable).

---

## Frontend Tasks

### 1 — Add Ticket types to the shared type file

**File: `frontend/src/types/index.ts`**

Add the following TypeScript interfaces (hand-copied from backend constants and responses):

```ts
export const TICKET_STATUSES = ['New', 'Open', 'In Progress', 'Pending', 'Resolved', 'Closed'] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export interface TicketCategory {
  id: number;
  name: string;
  color?: string;
}

export interface TicketUser {
  id: number;
  name: string;
  email: string;
}

export interface TicketComment {
  id: number;
  body: string;
  author: TicketUser;
  createdAt: string;
}

export interface TicketAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: TicketUser;
  createdAt: string;
}

export interface Ticket {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category?: TicketCategory;
  assignedTo?: TicketUser;
  customerId: number;
  responseTimeMinutes?: number;
  resolutionTimeMinutes?: number;
  respondedAt?: string;
  resolvedAt?: string;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  createdAt: string;
  updatedAt: string;
}

export interface TicketFilterOptions {
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryId?: number;
  assignedToUserId?: number;
}
```

### 2 — Create Pinia ticket store

**Create file: `frontend/src/stores/ticketStore.ts`**

```ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Ticket, TicketCategory, TicketFilterOptions, TicketComment, TicketAttachment } from '../types';
import { apiClient } from '../utils/apiClient';

export const useTicketStore = defineStore('ticket', () => {
  const tickets = ref<Ticket[]>([]);
  const categories = ref<TicketCategory[]>([]);
  const currentTicket = ref<Ticket | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const filters = ref<TicketFilterOptions>({});

  const filteredTickets = computed(() => {
    return tickets.value.filter(t => {
      if (filters.value.status && t.status !== filters.value.status) return false;
      if (filters.value.priority && t.priority !== filters.value.priority) return false;
      if (filters.value.categoryId && t.category?.id !== filters.value.categoryId) return false;
      if (filters.value.assignedToUserId !== undefined && t.assignedTo?.id !== filters.value.assignedToUserId) return false;
      return true;
    });
  });

  async function fetchTickets(customerId?: number) {
    loading.value = true;
    error.value = null;
    try {
      const params = new URLSearchParams();
      if (customerId) params.append('customerId', customerId.toString());
      if (filters.value.status) params.append('status', filters.value.status);
      if (filters.value.priority) params.append('priority', filters.value.priority);
      if (filters.value.categoryId) params.append('categoryId', filters.value.categoryId.toString());
      if (filters.value.assignedToUserId) params.append('assignedToUserId', filters.value.assignedToUserId.toString());

      const response = await apiClient.get(`/tickets${params.toString() ? '?' + params.toString() : ''}`);
      tickets.value = response.data.data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch tickets';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchTicket(id: number) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/tickets/${id}`);
      currentTicket.value = response.data.data;
      return currentTicket.value;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function createTicket(data: { subject: string; customerId: number; categoryId?: number; priority?: string }) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post('/tickets', data);
      const newTicket = response.data.data;
      tickets.value.unshift(newTicket);
      return newTicket;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function updateTicket(id: number, data: { status?: string; priority?: string; categoryId?: number | null }) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.patch(`/tickets/${id}`, data);
      const updated = response.data.data;
      const index = tickets.value.findIndex(t => t.id === id);
      if (index >= 0) {
        tickets.value[index] = updated;
      }
      if (currentTicket.value?.id === id) {
        currentTicket.value = updated;
      }
      return updated;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function assignTicket(id: number, assignedToUserId: number | null) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.patch(`/tickets/${id}/assign`, { assignedToUserId });
      const updated = response.data.data;
      const index = tickets.value.findIndex(t => t.id === id);
      if (index >= 0) {
        tickets.value[index] = updated;
      }
      if (currentTicket.value?.id === id) {
        currentTicket.value = updated;
      }
      return updated;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to assign ticket';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function addComment(ticketId: number, body: string): Promise<TicketComment> {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post(`/tickets/${ticketId}/comments`, { body });
      const comment = response.data.data;
      if (currentTicket.value?.id === ticketId) {
        currentTicket.value.comments.push(comment);
      }
      return comment;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to add comment';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function uploadAttachment(ticketId: number, file: File): Promise<TicketAttachment> {
    loading.value = true;
    error.value = null;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/tickets/${ticketId}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const attachment = response.data.data;
      if (currentTicket.value?.id === ticketId) {
        currentTicket.value.attachments.push(attachment);
      }
      return attachment;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to upload attachment';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  async function fetchCategories() {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/tickets/categories');
      categories.value = response.data.data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch categories';
      throw err;
    } finally {
      loading.value = false;
    }
  }

  function setFilters(newFilters: TicketFilterOptions) {
    filters.value = newFilters;
  }

  function clearFilters() {
    filters.value = {};
  }

  return {
    tickets,
    categories,
    currentTicket,
    loading,
    error,
    filters,
    filteredTickets,
    fetchTickets,
    fetchTicket,
    createTicket,
    updateTicket,
    assignTicket,
    addComment,
    uploadAttachment,
    fetchCategories,
    setFilters,
    clearFilters
  };
});
```

### 3 — Create ticket components

**Create file: `frontend/src/components/TicketForm.vue`**

```vue
<template>
  <form @submit.prevent="submit" class="space-y-4">
    <div>
      <label for="subject" class="block text-sm font-medium">Subject</label>
      <input
        id="subject"
        v-model="form.subject"
        type="text"
        required
        class="w-full px-3 py-2 border rounded-md"
        placeholder="Ticket subject"
      />
    </div>

    <div v-if="!scoped" class="grid grid-cols-2 gap-4">
      <div>
        <label for="customer" class="block text-sm font-medium">Customer</label>
        <select v-model.number="form.customerId" id="customer" required class="w-full px-3 py-2 border rounded-md">
          <option value="">-- Select Customer --</option>
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="priority" class="block text-sm font-medium">Priority</label>
        <select v-model="form.priority" id="priority" class="w-full px-3 py-2 border rounded-md">
          <option value="">-- Select Priority --</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      <div>
        <label for="category" class="block text-sm font-medium">Category</label>
        <select v-model.number="form.categoryId" id="category" class="w-full px-3 py-2 border rounded-md">
          <option :value="undefined">-- Select Category --</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>
    </div>

    <button
      type="submit"
      :disabled="loading"
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {{ loading ? 'Creating...' : 'Create Ticket' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTicketStore } from '../stores/ticketStore';
import type { Ticket } from '../types';

interface Props {
  customerId?: number;
  customers?: any[];
}

const props = withDefaults(defineProps<Props>(), {
  customerId: undefined,
  customers: () => []
});

const emit = defineEmits<{
  (e: 'created', ticket: Ticket): void;
}>();

const ticketStore = useTicketStore();
const loading = ref(false);
const scoped = !!props.customerId;

const form = ref({
  subject: '',
  customerId: props.customerId || 1,
  priority: 'Medium',
  categoryId: undefined
});

onMounted(() => {
  ticketStore.fetchCategories();
});

const categories = ref(ticketStore.categories);

async function submit() {
  loading.value = true;
  try {
    const ticket = await ticketStore.createTicket({
      subject: form.value.subject,
      customerId: form.value.customerId,
      priority: form.value.priority,
      categoryId: form.value.categoryId
    });
    emit('created', ticket);
    form.value = { subject: '', customerId: props.customerId || 1, priority: 'Medium', categoryId: undefined };
  } finally {
    loading.value = false;
  }
}
</script>
```

**Create file: `frontend/src/components/TicketDetailCard.vue`**

```vue
<template>
  <div v-if="ticket" class="bg-white rounded-lg shadow p-6 space-y-6">
    <div class="flex justify-between items-start">
      <div>
        <h2 class="text-2xl font-bold">{{ ticket.subject }}</h2>
        <p class="text-gray-600">Ticket #{{ ticket.id }}</p>
      </div>
      <SlaIndicator :ticket="ticket" />
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Status</label>
        <select
          v-model="ticket.status"
          @change="updateStatus"
          class="w-full px-3 py-2 border rounded-md"
          :disabled="!canManage"
        >
          <option value="New">New</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Priority</label>
        <select
          v-model="ticket.priority"
          @change="updatePriority"
          class="w-full px-3 py-2 border rounded-md"
          :disabled="!canManage"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Category</label>
        <select
          v-model.number="ticket.category?.id"
          @change="updateCategory"
          class="w-full px-3 py-2 border rounded-md"
          :disabled="!canManage"
        >
          <option :value="undefined">-- None --</option>
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
        </select>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Assigned To</label>
        <select
          :value="ticket.assignedTo?.id || ''"
          @change="updateAssignment"
          class="w-full px-3 py-2 border rounded-md"
          :disabled="!canManage"
        >
          <option value="">-- Unassigned --</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
        </select>
      </div>
    </div>

    <div class="border-t pt-6">
      <h3 class="text-lg font-semibold mb-4">Comments</h3>
      <TicketCommentForm v-if="canManage" :ticket-id="ticket.id" @comment-added="loadTicket" />
      <div class="mt-4 space-y-3">
        <div v-for="comment in ticket.comments" :key="comment.id" class="bg-gray-50 p-3 rounded">
          <p class="text-sm text-gray-600">{{ comment.author.name }} - {{ formatDate(comment.createdAt) }}</p>
          <p class="mt-2">{{ comment.body }}</p>
        </div>
      </div>
    </div>

    <div class="border-t pt-6">
      <h3 class="text-lg font-semibold mb-4">Attachments</h3>
      <AttachmentUpload v-if="canManage" :ticket-id="ticket.id" @attached="loadTicket" />
      <div class="mt-4 space-y-2">
        <div v-for="att in ticket.attachments" :key="att.id" class="flex items-center justify-between bg-gray-50 p-3 rounded">
          <span class="text-sm">{{ att.fileName }} ({{ formatBytes(att.sizeBytes) }})</span>
          <span class="text-xs text-gray-600">{{ att.uploadedBy.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useTicketStore } from '../stores/ticketStore';
import { useAuthStore } from '../stores/authStore';
import type { Ticket } from '../types';
import SlaIndicator from './SlaIndicator.vue';
import TicketCommentForm from './TicketCommentForm.vue';
import AttachmentUpload from './AttachmentUpload.vue';

interface Props {
  ticketId: number;
  agents?: any[];
}

const props = defineProps<Props>();

const ticketStore = useTicketStore();
const authStore = useAuthStore();

const ticket = ref<Ticket | null>(null);
const categories = computed(() => ticketStore.categories);
const canManage = computed(() => authStore.hasPermission('tickets:manage'));

onMounted(async () => {
  await ticketStore.fetchCategories();
  await loadTicket();
});

async function loadTicket() {
  ticket.value = await ticketStore.fetchTicket(props.ticketId);
}

async function updateStatus() {
  if (!ticket.value) return;
  await ticketStore.updateTicket(ticket.value.id, { status: ticket.value.status });
}

async function updatePriority() {
  if (!ticket.value) return;
  await ticketStore.updateTicket(ticket.value.id, { priority: ticket.value.priority });
}

async function updateCategory() {
  if (!ticket.value) return;
  await ticketStore.updateTicket(ticket.value.id, { categoryId: ticket.value.category?.id || null });
}

async function updateAssignment(event: Event) {
  if (!ticket.value) return;
  const target = event.target as HTMLSelectElement;
  const userId = target.value ? parseInt(target.value) : null;
  await ticketStore.assignTicket(ticket.value.id, userId);
  await loadTicket();
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
</script>
```

**Create file: `frontend/src/components/TicketCommentForm.vue`**

```vue
<template>
  <form @submit.prevent="submit" class="space-y-2 mb-4">
    <textarea
      v-model="body"
      class="w-full px-3 py-2 border rounded-md"
      rows="3"
      placeholder="Add a comment..."
      required
    ></textarea>
    <button
      type="submit"
      :disabled="!body.trim() || loading"
      class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {{ loading ? 'Posting...' : 'Post Comment' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTicketStore } from '../stores/ticketStore';

const props = defineProps<{
  ticketId: number;
}>();

const emit = defineEmits<{
  (e: 'comment-added'): void;
}>();

const ticketStore = useTicketStore();
const body = ref('');
const loading = ref(false);

async function submit() {
  if (!body.value.trim()) return;
  loading.value = true;
  try {
    await ticketStore.addComment(props.ticketId, body.value);
    body.value = '';
    emit('comment-added');
  } finally {
    loading.value = false;
  }
}
</script>
```

**Create file: `frontend/src/components/AttachmentUpload.vue`**

```vue
<template>
  <div class="mb-4">
    <div class="flex items-center gap-2">
      <input
        type="file"
        ref="fileInput"
        @change="handleFileSelect"
        class="flex-1 px-3 py-2 border rounded-md"
        :disabled="loading"
      />
      <button
        @click="upload"
        :disabled="!selectedFile || loading"
        class="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        {{ loading ? 'Uploading...' : 'Upload' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useTicketStore } from '../stores/ticketStore';

const props = defineProps<{
  ticketId: number;
}>();

const emit = defineEmits<{
  (e: 'attached'): void;
}>();

const ticketStore = useTicketStore();
const fileInput = ref<HTMLInputElement>();
const selectedFile = ref<File | null>(null);
const loading = ref(false);

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  selectedFile.value = target.files?.[0] || null;
}

async function upload() {
  if (!selectedFile.value) return;
  loading.value = true;
  try {
    await ticketStore.uploadAttachment(props.ticketId, selectedFile.value);
    selectedFile.value = null;
    if (fileInput.value) fileInput.value.value = '';
    emit('attached');
  } finally {
    loading.value = false;
  }
}
</script>
```

**Create file: `frontend/src/components/SlaIndicator.vue`**

```vue
<template>
  <div class="space-y-2">
    <div v-if="ticket.respondedAt" class="bg-green-50 p-3 rounded">
      <p class="text-sm font-medium text-green-900">Response</p>
      <p class="text-xs text-green-700">{{ new Date(ticket.respondedAt).toLocaleString() }}</p>
    </div>
    <div v-else class="bg-yellow-50 p-3 rounded">
      <p class="text-sm font-medium text-yellow-900">Awaiting Response</p>
      <p class="text-xs text-yellow-700" v-if="ticket.responseTimeMinutes">
        Target: {{ formatMinutes(ticket.responseTimeMinutes) }}
        <span v-if="isResponseOverdue" class="text-red-600 font-semibold">(OVERDUE)</span>
      </p>
    </div>

    <div v-if="ticket.resolvedAt" class="bg-green-50 p-3 rounded">
      <p class="text-sm font-medium text-green-900">Resolved</p>
      <p class="text-xs text-green-700">{{ new Date(ticket.resolvedAt).toLocaleString() }}</p>
    </div>
    <div v-else class="bg-blue-50 p-3 rounded">
      <p class="text-sm font-medium text-blue-900">Target Resolution</p>
      <p class="text-xs text-blue-700" v-if="ticket.resolutionTimeMinutes">
        {{ formatMinutes(ticket.resolutionTimeMinutes) }}
        <span v-if="isResolutionOverdue" class="text-red-600 font-semibold">(OVERDUE)</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Ticket } from '../types';

const props = defineProps<{
  ticket: Ticket;
}>();

const isResponseOverdue = computed(() => {
  if (props.ticket.respondedAt || !props.ticket.responseTimeMinutes) return false;
  const createdTime = new Date(props.ticket.createdAt).getTime();
  const targetTime = createdTime + props.ticket.responseTimeMinutes * 60 * 1000;
  return Date.now() > targetTime;
});

const isResolutionOverdue = computed(() => {
  if (props.ticket.resolvedAt || !props.ticket.resolutionTimeMinutes) return false;
  const createdTime = new Date(props.ticket.createdAt).getTime();
  const targetTime = createdTime + props.ticket.resolutionTimeMinutes * 60 * 1000;
  return Date.now() > targetTime;
});

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
</script>
```

### 4 — Create dashboard and detail views

**Create file: `frontend/src/views/TicketDashboardView.vue`**

```vue
<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-3xl font-bold">Ticket Dashboard</h1>
      <button
        v-if="canManage"
        @click="showCreateForm = !showCreateForm"
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {{ showCreateForm ? 'Cancel' : 'New Ticket' }}
      </button>
    </div>

    <div v-if="showCreateForm" class="bg-white rounded-lg shadow p-6">
      <TicketForm :customers="customers" @created="onTicketCreated" />
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex gap-2 mb-4">
        <select
          v-model="filters.status"
          @change="applyFilters"
          class="px-3 py-2 border rounded-md"
        >
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending">Pending</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>

        <select
          v-model="filters.priority"
          @change="applyFilters"
          class="px-3 py-2 border rounded-md"
        >
          <option value="">All Priorities</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

        <select
          v-model.number="filters.assignedToUserId"
          @change="applyFilters"
          class="px-3 py-2 border rounded-md"
        >
          <option :value="undefined">All Assignments</option>
          <option value="">Unassigned</option>
          <option v-for="agent in agents" :key="agent.id" :value="agent.id">{{ agent.name }}</option>
        </select>
      </div>

      <div v-if="loading" class="text-center py-4">Loading...</div>
      <div v-else-if="ticketStore.filteredTickets.length === 0" class="text-center py-4 text-gray-600">
        No tickets found
      </div>
      <div v-else class="space-y-2">
        <div
          v-for="ticket in ticketStore.filteredTickets"
          :key="ticket.id"
          @click="goToDetail(ticket.id)"
          class="p-4 border rounded-md hover:bg-gray-50 cursor-pointer"
        >
          <div class="flex justify-between items-start">
            <div>
              <p class="font-semibold">#{{ ticket.id }}: {{ ticket.subject }}</p>
              <p class="text-sm text-gray-600">Customer ID: {{ ticket.customerId }}</p>
            </div>
            <div class="text-right">
              <span :class="statusClass(ticket.status)" class="px-2 py-1 rounded text-xs font-semibold">
                {{ ticket.status }}
              </span>
              <p class="text-sm mt-1">{{ ticket.priority }} priority</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTicketStore } from '../stores/ticketStore';
import { useAuthStore } from '../stores/authStore';
import TicketForm from '../components/TicketForm.vue';

const router = useRouter();
const ticketStore = useTicketStore();
const authStore = useAuthStore();

const showCreateForm = ref(false);
const loading = ref(false);
const filters = ref({ status: '', priority: '', assignedToUserId: undefined });
const canManage = computed(() => authStore.hasPermission('tickets:manage'));
const customers = ref<any[]>([]);
const agents = ref<any[]>([]);

onMounted(async () => {
  loading.value = true;
  try {
    await ticketStore.fetchTickets();
    await ticketStore.fetchCategories();
    // In a real app, fetch customers and agents from backend
  } finally {
    loading.value = false;
  }
});

function applyFilters() {
  ticketStore.setFilters({
    status: filters.value.status as any,
    priority: filters.value.priority as any,
    assignedToUserId: filters.value.assignedToUserId
  });
}

function goToDetail(ticketId: number) {
  router.push(`/tickets/${ticketId}`);
}

function onTicketCreated() {
  showCreateForm.value = false;
  ticketStore.fetchTickets();
}

function statusClass(status: string): string {
  const classes: Record<string, string> = {
    'New': 'bg-gray-200 text-gray-800',
    'Open': 'bg-blue-200 text-blue-800',
    'In Progress': 'bg-yellow-200 text-yellow-800',
    'Pending': 'bg-orange-200 text-orange-800',
    'Resolved': 'bg-green-200 text-green-800',
    'Closed': 'bg-gray-300 text-gray-900'
  };
  return classes[status] || 'bg-gray-200 text-gray-800';
}
</script>
```

**Create file: `frontend/src/views/TicketDetailView.vue`**

```vue
<template>
  <div class="space-y-6">
    <router-link to="/tickets" class="text-blue-600 hover:underline">← Back to Dashboard</router-link>
    <TicketDetailCard
      v-if="ticketId"
      :ticket-id="ticketId"
      :agents="agents"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import TicketDetailCard from '../components/TicketDetailCard.vue';

const route = useRoute();
const ticketId = computed(() => parseInt(route.params.id as string));
const agents = ref<any[]>([]);
</script>
```

### 5 — Add routes

**File: `frontend/src/router/index.ts`**

Add the following routes (after other protected routes):

```ts
{
  path: '/tickets',
  name: 'TicketDashboard',
  component: () => import('../views/TicketDashboardView.vue'),
  meta: { requiresAuth: true, requiredPermission: 'tickets:read' }
},
{
  path: '/tickets/:id',
  name: 'TicketDetail',
  component: () => import('../views/TicketDetailView.vue'),
  meta: { requiresAuth: true, requiredPermission: 'tickets:read' }
}
```

### 6 — Update type exports

**File: `frontend/src/types/index.ts`**

Make sure `TicketStore` actions are properly typed. Also add the new ticket types from task 1 to the exports.

---

## Edge Cases & Failure Modes

- **File upload fails (network, server error).** `uploadAttachment` in the store catches and re-throws; the component shows the error. The form is not cleared until upload succeeds.
- **Ticket list is empty.** The dashboard shows a "No tickets found" message.
- **User lacks `tickets:manage` permission.** Create form and edit buttons are hidden via `v-if="canManage"`. If a user manually POST/PATCH to the API, the backend enforces the permission check.
- **Assigning a ticket to a deleted user.** The backend returns `404`; the frontend catches it and displays an error. The ticket's `assignedTo` field is not updated locally until the user clicks "refresh".
- **Comment post fails midway.** Error is displayed; the comment is not added to the local list. User can retry.
- **File upload too large.** Multer on the backend rejects it with `413`; the frontend shows the error.
- **Rapid filter changes.** Multiple simultaneous requests could race. Use `async/await` and ensure only the latest response updates state.
- **Real-time updates (polling).** Dashboard does not auto-refresh on updates from other agents. Story 15 does not include WebSocket notifications. A refresh button or periodic polling would be a follow-up.

---

## Test Plan

1. **Create `frontend/src/views/TicketDashboardView.spec.ts`** (Vue component, mocked store):
   - Renders ticket list on mount.
   - Filters work correctly (status, priority, assignment).
   - Clicking a ticket navigates to detail view.
   - `canManage` controls create form visibility.

2. **Create `frontend/src/views/TicketDetailView.spec.ts`**:
   - Loads and renders ticket detail.
   - Edit form updates ticket on submit.
   - Comment form adds comment to list.
   - File upload works (mocked fetch).

3. **Create `frontend/src/stores/ticketStore.spec.ts`** (unit, mocked fetch):
   - `fetchTickets` calls correct endpoint with filters.
   - `updateTicket` updates local state and API.
   - `addComment` appends to comments array.
   - `uploadAttachment` appends to attachments array.

4. **E2E (if applicable):** Login as agent, navigate to /tickets, create a ticket, filter list, open detail, add comment, upload attachment, assign to self, change status.

---

## Verification Steps

1. **Frontend builds:** `npm run build` exits 0; `npm run typecheck` exits 0 (in `frontend/`).
2. **Tests pass:** `npm test` in `frontend/` — green.
3. **Frontend runs:** `npm run dev`, navigate to `/tickets` (after login as agent):
   - Dashboard displays list of tickets.
   - Filters work (status, priority, assignment).
   - Clicking a ticket opens detail view.
   - Edit fields update on blur/submit.
   - Comments section shows existing comments and has an add form.
   - Attachments section shows existing files and has an upload form.
   - SLA indicator shows response/resolution status.
4. **Backend integration:** Create, update, assign, comment on a ticket via the UI; refresh and confirm changes persist in the dashboard.

---

## Done Criteria

- [ ] `frontend/src/types/index.ts` has `Ticket`, `TicketCategory`, `TicketComment`, `TicketAttachment` interfaces.
- [ ] `frontend/src/stores/ticketStore.ts` has Pinia store with CRUD actions and filtering.
- [ ] `TicketForm.vue`, `TicketDetailCard.vue`, `TicketCommentForm.vue`, `AttachmentUpload.vue`, `SlaIndicator.vue` components exist and work.
- [ ] `TicketDashboardView.vue` and `TicketDetailView.vue` integrate all components.
- [ ] Routes `/tickets` and `/tickets/:id` are protected and work.
- [ ] Agents can create, update, assign, comment on, and attach files to tickets.
- [ ] Customers see only their own tickets (scoped to customer id).
- [ ] SLA indicators display response/resolution time and overdue status.
- [ ] `npm run build` and `npm test` pass in `frontend/`.
- [ ] Manual E2E testing confirms full workflow (login → create → filter → detail → edit → comment → upload → assign).

**Story 15 complete. All three stories (13, 14, 15) shipped together for full ticket management feature.**
