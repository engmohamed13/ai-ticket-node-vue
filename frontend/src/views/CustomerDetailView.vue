<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useCustomersStore } from '../stores/customers';
import { CUSTOMER_STATUSES } from '../types';
import type { Customer, CustomerStatus } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const route = useRoute();
const store = useCustomersStore();
const auth = useAuthStore();

const customerId = computed(() => Number(route.params.id));
const canManage = computed(() => auth.can('customers:manage'));

const statusVariant = (value: CustomerStatus): 'success' | 'neutral' | 'primary' | 'warning' => {
  switch (value) {
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

const isEditing = ref(false);
const editName = ref('');
const editEmail = ref('');
const editPhone = ref('');
const editCompany = ref('');
const editAddress = ref('');
const editCity = ref('');
const editCountry = ref('');
const editStatus = ref<CustomerStatus>('ACTIVE');

const fillEditForm = (customer: Customer): void => {
  editName.value = customer.name;
  editEmail.value = customer.email;
  editPhone.value = customer.phone ?? '';
  editCompany.value = customer.company ?? '';
  editAddress.value = customer.address ?? '';
  editCity.value = customer.city ?? '';
  editCountry.value = customer.country ?? '';
  editStatus.value = customer.status;
};

const onStartEdit = (): void => {
  if (store.selectedCustomer) fillEditForm(store.selectedCustomer);
  isEditing.value = true;
};

const onCancelEdit = (): void => {
  isEditing.value = false;
};

const onSaveEdit = async (): Promise<void> => {
  if (editName.value.trim().length === 0 || editEmail.value.trim().length === 0) return;

  const saved = await store.saveCustomer(customerId.value, {
    name: editName.value.trim(),
    email: editEmail.value.trim(),
    phone: editPhone.value.trim() === '' ? undefined : editPhone.value.trim(),
    company: editCompany.value.trim() === '' ? undefined : editCompany.value.trim(),
    address: editAddress.value.trim() === '' ? undefined : editAddress.value.trim(),
    city: editCity.value.trim() === '' ? undefined : editCity.value.trim(),
    country: editCountry.value.trim() === '' ? undefined : editCountry.value.trim(),
    status: editStatus.value
  });

  if (saved) isEditing.value = false;
};

const noteBody = ref('');

const onAddNote = async (): Promise<void> => {
  if (noteBody.value.trim().length === 0) return;
  const added = await store.submitNote(customerId.value, noteBody.value.trim());
  if (added) noteBody.value = '';
};

const fileInput = ref<HTMLInputElement | null>(null);

const onUploadAttachment = async (): Promise<void> => {
  const file = fileInput.value?.files?.[0];
  if (!file) return;
  const uploaded = await store.submitAttachment(customerId.value, file);
  if (uploaded && fileInput.value) fileInput.value.value = '';
};

const onDownloadAttachment = async (attachment: (typeof store.attachments)[number]): Promise<void> => {
  await store.downloadAttachment(customerId.value, attachment);
};

const onDeleteAttachment = async (attachmentId: number): Promise<void> => {
  await store.removeAttachment(customerId.value, attachmentId);
};

const formatDateTime = (value: string): string => new Date(value).toLocaleString();
const formatSize = (sizeBytes: number): string => `${(sizeBytes / 1024).toFixed(1)} KB`;

const isNotesEmpty = computed(() => store.notes.length === 0);
const isAttachmentsEmpty = computed(() => store.attachments.length === 0);
const isTicketsEmpty = computed(() => store.tickets.length === 0);
const isTimelineEmpty = computed(() => store.timeline.length === 0);

const directionVariant = (value: string) => (value === 'INBOUND' ? 'info' : 'primary');

onMounted(() => {
  void store.loadCustomerDetail(customerId.value);
});
</script>

<template>
  <section class="view">
    <PageHeader
      :title="store.selectedCustomer?.name ?? 'Customer'"
      subtitle="Profile, notes, attachments, and history."
    />

    <AlertBanner v-if="store.error" variant="error" data-testid="customer-detail-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="customer-detail-notice">{{ store.notice }}</AlertBanner>

    <LoadingState v-if="store.detailLoading" data-testid="customer-detail-loading">Loading customer…</LoadingState>

    <EmptyState
      v-else-if="!store.selectedCustomer"
      title="Customer not found"
      description="It may have been removed, or the link is incorrect."
    >
      <template #actions>
        <RouterLink class="btn btn-secondary" :to="{ name: 'customers' }">Back to customers</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Profile</h3>
          <button
            v-if="canManage && !isEditing"
            class="btn btn-secondary btn-sm"
            type="button"
            data-testid="edit-customer-button"
            @click="onStartEdit"
          >
            Edit
          </button>
        </div>

        <div v-if="!isEditing" class="card-padded profile-grid" data-testid="customer-profile">
          <div class="profile-field"><span class="profile-label">Email</span><span>{{ store.selectedCustomer.email }}</span></div>
          <div class="profile-field"><span class="profile-label">Phone</span><span>{{ store.selectedCustomer.phone ?? '—' }}</span></div>
          <div class="profile-field"><span class="profile-label">Company</span><span>{{ store.selectedCustomer.company ?? '—' }}</span></div>
          <div class="profile-field"><span class="profile-label">Address</span><span>{{ store.selectedCustomer.address ?? '—' }}</span></div>
          <div class="profile-field"><span class="profile-label">City</span><span>{{ store.selectedCustomer.city ?? '—' }}</span></div>
          <div class="profile-field"><span class="profile-label">Country</span><span>{{ store.selectedCustomer.country ?? '—' }}</span></div>
          <div class="profile-field">
            <span class="profile-label">Status</span>
            <StatusBadge :variant="statusVariant(store.selectedCustomer.status)">{{ store.selectedCustomer.status }}</StatusBadge>
          </div>
        </div>

        <form v-else class="card-padded" data-testid="edit-customer-form" @submit.prevent="onSaveEdit">
          <div class="form-grid">
            <div class="form-field">
              <label for="edit-customer-name">Name</label>
              <input id="edit-customer-name" v-model="editName" data-testid="edit-customer-name-input" type="text" required />
            </div>
            <div class="form-field">
              <label for="edit-customer-email">Email</label>
              <input id="edit-customer-email" v-model="editEmail" data-testid="edit-customer-email-input" type="email" required />
            </div>
            <div class="form-field">
              <label for="edit-customer-phone">Phone</label>
              <input id="edit-customer-phone" v-model="editPhone" data-testid="edit-customer-phone-input" type="text" />
            </div>
            <div class="form-field">
              <label for="edit-customer-company">Company</label>
              <input id="edit-customer-company" v-model="editCompany" data-testid="edit-customer-company-input" type="text" />
            </div>
            <div class="form-field">
              <label for="edit-customer-address">Address</label>
              <input id="edit-customer-address" v-model="editAddress" data-testid="edit-customer-address-input" type="text" />
            </div>
            <div class="form-field">
              <label for="edit-customer-city">City</label>
              <input id="edit-customer-city" v-model="editCity" data-testid="edit-customer-city-input" type="text" />
            </div>
            <div class="form-field">
              <label for="edit-customer-country">Country</label>
              <input id="edit-customer-country" v-model="editCountry" data-testid="edit-customer-country-input" type="text" />
            </div>
            <div class="form-field">
              <label for="edit-customer-status">Status</label>
              <select id="edit-customer-status" v-model="editStatus" data-testid="edit-customer-status-select">
                <option v-for="value in CUSTOMER_STATUSES" :key="value" :value="value">{{ value }}</option>
              </select>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" data-testid="save-customer-button">Save</button>
            <button class="btn btn-secondary" type="button" data-testid="cancel-edit-button" @click="onCancelEdit">Cancel</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Notes</h3>
        </div>
        <div class="card-padded">
          <form v-if="canManage" class="note-form" data-testid="add-note-form" @submit.prevent="onAddNote">
            <textarea v-model="noteBody" data-testid="note-body-input" rows="3" placeholder="Add a note…"></textarea>
            <button class="btn btn-primary btn-sm" type="submit" data-testid="add-note-button">Add note</button>
          </form>

          <EmptyState v-if="isNotesEmpty" title="No notes yet" />
          <ul v-else class="notes-list" data-testid="notes-list">
            <li v-for="note in store.notes" :key="note.id" class="note-item" data-testid="note-item">
              <div class="note-meta">
                <span class="note-author">{{ note.author.name }}</span>
                <span class="note-date">{{ formatDateTime(note.createdAt) }}</span>
              </div>
              <p class="note-body">{{ note.body }}</p>
            </li>
          </ul>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Attachments</h3>
        </div>
        <div class="card-padded">
          <div v-if="canManage" class="attachment-form">
            <input ref="fileInput" data-testid="attachment-file-input" type="file" />
            <button class="btn btn-primary btn-sm" type="button" data-testid="upload-attachment-button" @click="onUploadAttachment">
              Upload
            </button>
          </div>

          <EmptyState v-if="isAttachmentsEmpty" title="No attachments yet" />
          <ul v-else class="attachments-list" data-testid="attachments-list">
            <li v-for="attachment in store.attachments" :key="attachment.id" class="attachment-item" data-testid="attachment-item">
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
                v-if="canManage"
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
          <h3 class="card-title">Tickets</h3>
        </div>
        <div class="card-padded">
          <EmptyState v-if="isTicketsEmpty" title="No tickets yet" />
          <div v-else class="table-wrapper">
            <table data-testid="customer-tickets-table">
              <thead>
                <tr>
                  <th scope="col">Subject</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ticket in store.tickets" :key="ticket.id">
                  <td>{{ ticket.subject }}</td>
                  <td><StatusBadge variant="primary">{{ ticket.status }}</StatusBadge></td>
                  <td>{{ new Date(ticket.createdAt).toLocaleDateString() }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Interaction history</h3>
        </div>
        <div class="card-padded timeline-body">
          <EmptyState
            v-if="isTimelineEmpty"
            title="No interactions yet"
            description="Interactions with this customer will appear here as they come in."
          />
          <ul v-else class="timeline" data-testid="timeline-list">
            <li v-for="interaction in store.timeline" :key="interaction.id" class="timeline-item" data-testid="timeline-item">
              <div class="timeline-meta">
                <StatusBadge variant="primary" class="channel-badge">{{ interaction.channel }}</StatusBadge>
                <StatusBadge :variant="directionVariant(interaction.direction)" class="direction">{{ interaction.direction }}</StatusBadge>
                <span class="occurred-at">{{ formatDateTime(interaction.occurredAt) }}</span>
              </div>
              <p class="body">{{ interaction.body }}</p>
              <p v-if="interaction.ticketId" class="ticket-link">Ticket #{{ interaction.ticketId }}</p>
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

.profile-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.profile-label {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.note-form {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: var(--space-3);
  max-width: 480px;
}

.notes-list,
.attachments-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.note-item {
  border-bottom: 1px solid var(--border-color);
  padding: var(--space-3) 0;
}

.note-item:last-child {
  border-bottom: none;
}

.note-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.3rem;
}

.note-author {
  font-weight: 600;
}

.note-date {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.attachment-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: var(--space-3);
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

.timeline-body {
  padding-top: var(--space-2);
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
  padding: var(--space-3) 0;
}

.timeline-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.timeline-item:first-child {
  padding-top: 0;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.4rem;
}

.occurred-at {
  color: var(--text-muted);
  font-size: var(--font-xs);
}

.body {
  color: var(--text-main);
  line-height: 1.55;
  font-size: var(--font-sm);
}

.ticket-link {
  margin-top: 0.4rem;
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--color-primary);
}
</style>
