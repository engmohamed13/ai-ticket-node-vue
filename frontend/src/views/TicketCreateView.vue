<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';

const { t } = useI18n();
const router = useRouter();

const title = ref('');
const description = ref('');
const priority = ref('Medium');
const loading = ref(false);
const error = ref('');

const submit = async () => {
  if (!title.value.trim()) {
    error.value = t('ticketForm.titleRequired');
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    await api.post('/tickets', {
      title: title.value.trim(),
      description: description.value.trim(),
      priority: priority.value
    });
    router.push('/');
  } catch (err: any) {
    error.value = err.response?.data?.message || t('ticketForm.failedCreate');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="form-page">
    <div class="card form-card">
      <div class="form-header">
        <button @click="router.push('/')" class="btn-back" :title="t('ticketForm.returnToDashboard')">←</button>
        <h2>{{ t('ticketForm.createHeader') }}</h2>
      </div>
      
      <div v-if="error" class="alert alert-danger">
        ⚠️ {{ error }}
      </div>

      <form @submit.prevent="submit" class="ticket-form">
        <div class="form-group">
          <label for="title">
            {{ t('ticketForm.titleLabel') }} <span class="required">*</span>
          </label>
          <input 
            id="title"
            v-model="title" 
            type="text" 
            :placeholder="t('ticketForm.titlePlaceholder')" 
            :disabled="loading" 
            class="form-control"
          />
        </div>
        
        <div class="form-group">
          <label for="priority">{{ t('ticketForm.priorityLabel') }}</label>
          <select id="priority" v-model="priority" :disabled="loading" class="form-control">
            <option value="Low">{{ t('priority.Low') }}</option>
            <option value="Medium">{{ t('priority.Medium') }}</option>
            <option value="High">{{ t('priority.High') }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="description">{{ t('ticketForm.descriptionLabel') }}</label>
          <textarea 
            id="description"
            v-model="description" 
            rows="5" 
            :placeholder="t('ticketForm.descriptionPlaceholder')" 
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
            {{ loading ? t('ticketForm.creatingBtn') : t('ticketForm.createBtn') }}
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

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}
</style>
