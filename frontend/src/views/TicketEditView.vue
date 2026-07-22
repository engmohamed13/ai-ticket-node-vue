<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import type { Ticket } from '../types';

const { t } = useI18n();
const title = ref('');
const description = ref('');
const priority = ref('Medium');
const status = ref('Open');
const loading = ref(false);
const initialLoading = ref(true);
const error = ref('');
const router = useRouter();
const route = useRoute();

const fetchTicket = async () => {
  try {
    const response = await api.get(`/tickets/${route.params.id}`);
    const ticket: Ticket = response.data.data;
    title.value = ticket.title;
    description.value = ticket.description || '';
    priority.value = ticket.priority;
    status.value = ticket.status;
  } catch (err: any) {
    error.value = t('ticketForm.failedLoad');
  } finally {
    initialLoading.value = false;
  }
};

const submit = async () => {
  if (!title.value.trim()) {
    error.value = t('ticketForm.titleRequired');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await api.put(`/tickets/${route.params.id}`, {
      title: title.value.trim(),
      description: description.value.trim(),
      priority: priority.value,
      status: status.value
    });
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || t('ticketForm.failedUpdate');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTicket();
});
</script>

<template>
  <div class="form-page">
    <div class="card form-card">
      <div class="form-header">
        <button @click="router.push('/')" class="btn-back" :title="t('ticketForm.returnToDashboard')">←</button>
        <h2>{{ t('ticketForm.editHeader', { id: route.params.id }) }}</h2>
      </div>
      
      <div v-if="initialLoading" class="state-container">
        <div class="spinner"></div>
        <p>{{ t('ticketForm.loadingDetails') }}</p>
      </div>
      
      <div v-else-if="error && !title" class="alert alert-danger flex-column">
        <p>⚠️ {{ error }}</p>
        <button @click="router.push('/')" class="btn btn-secondary mt-2">
          {{ t('ticketForm.returnToDashboard') }}
        </button>
      </div>
      
      <form v-else @submit.prevent="submit" class="ticket-form">
        <div v-if="error" class="alert alert-danger">
          ⚠️ {{ error }}
        </div>

        <div class="form-group">
          <label for="title">
            {{ t('ticketForm.titleLabel') }} <span class="required">*</span>
          </label>
          <input 
            id="title"
            v-model="title" 
            type="text" 
            :disabled="loading" 
            class="form-control"
          />
        </div>
        
        <div class="form-row">
          <div class="form-group flex-1">
            <label for="status">{{ t('ticketForm.statusLabel') }}</label>
            <select id="status" v-model="status" :disabled="loading" class="form-control">
              <option value="Open">{{ t('status.Open') }}</option>
              <option value="In Progress">{{ t('status.In Progress') }}</option>
              <option value="Closed">{{ t('status.Closed') }}</option>
            </select>
          </div>

          <div class="form-group flex-1">
            <label for="priority">{{ t('ticketForm.priorityLabel') }}</label>
            <select id="priority" v-model="priority" :disabled="loading" class="form-control">
              <option value="Low">{{ t('priority.Low') }}</option>
              <option value="Medium">{{ t('priority.Medium') }}</option>
              <option value="High">{{ t('priority.High') }}</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="description">{{ t('ticketForm.descriptionLabel') }}</label>
          <textarea 
            id="description"
            v-model="description" 
            rows="5" 
            :disabled="loading"
            class="form-control"
          ></textarea>
        </div>

        <div class="form-actions">
          <button type="button" @click="router.push('/')" class="btn btn-secondary" :disabled="loading">
            {{ t('common.cancel') }}
          </button>
          <button type="submit" class="btn btn-primary" :disabled="loading">
            <span v-if="loading" class="spinner spinner-sm"></span>
            {{ loading ? t('ticketForm.savingBtn') : t('ticketForm.saveBtn') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.form-page {
  display: flex;
  justify-content: center;
  padding: 1rem 0;
}

.form-card {
  width: 100%;
  max-width: 640px;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
}

.btn-back {
  background: transparent;
  border: none;
  font-size: 1.4rem;
  color: #64748b;
  cursor: pointer;
  padding: 0 0.4rem;
  border-radius: 6px;
  transition: color 0.2s;
  font-family: inherit;
}

.btn-back:hover {
  color: #0f172a;
  background-color: #f1f5f9;
}

h2 {
  font-size: 1.4rem;
  color: #0f172a;
}

.form-row {
  display: flex;
  gap: 1.25rem;
}

.flex-1 {
  flex: 1;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.flex-column {
  flex-direction: column;
  align-items: flex-start;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
}
</style>
