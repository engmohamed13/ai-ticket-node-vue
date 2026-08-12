<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import type { Ticket, Comment } from '../types';

const { t, locale } = useI18n();
const ticket = ref<Ticket | null>(null);
const comments = ref<Comment[]>([]);
const newCommentText = ref('');
const loading = ref(true);
const submitLoading = ref(false);
const transitionLoading = ref(false);
const error = ref('');
const submitError = ref('');
const transitionError = ref('');
const route = useRoute();
const router = useRouter();

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'High': return 'badge-priority-high';
    case 'Medium': return 'badge-priority-medium';
    case 'Low': return 'badge-priority-low';
    default: return '';
  }
};

const updateStatus = async (nextStatus: string) => {
  transitionLoading.value = true;
  transitionError.value = '';
  try {
    await api.patch(`/tickets/${route.params.id}/status`, { status: nextStatus });
    await fetchTicketAndComments();
  } catch (err: any) {
    transitionError.value = err.response?.data?.message || t('ticketForm.failedUpdate');
  } finally {
    transitionLoading.value = false;
  }
};

const fetchTicketAndComments = async () => {
  loading.value = true;
  error.value = '';
  try {
    const ticketRes = await api.get(`/tickets/${route.params.id}`);
    ticket.value = ticketRes.data.data;
    
    const commentsRes = await api.get(`/tickets/${route.params.id}/comments`);
    comments.value = commentsRes.data.data;
  } catch (err: any) {
    error.value = t('comments.failedLoad');
  } finally {
    loading.value = false;
  }
};

const addComment = async () => {
  if (!newCommentText.value.trim()) {
    submitError.value = t('comments.commentRequired');
    return;
  }
  
  submitLoading.value = true;
  submitError.value = '';
  
  try {
    await api.post(`/tickets/${route.params.id}/comments`, {
      text: newCommentText.value.trim()
    });
    newCommentText.value = '';
    const commentsRes = await api.get(`/tickets/${route.params.id}/comments`);
    comments.value = commentsRes.data.data;
  } catch (err: any) {
    submitError.value = err.response?.data?.message || t('comments.failedPost');
  } finally {
    submitLoading.value = false;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale.value === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(() => {
  fetchTicketAndComments();
});

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Open': return 'badge-open';
    case 'In Progress': return 'badge-in-progress';
    case 'Closed': return 'badge-closed';
    default: return '';
  }
};
</script>

<template>
  <div class="comments-page">
    <div class="header-actions">
      <button @click="router.push('/')" class="btn btn-outline btn-sm">
        {{ t('comments.backToDashboard') }}
      </button>
    </div>

    <div v-if="loading" class="state-container">
      <div class="spinner"></div>
      <p>{{ t('comments.loading') }}</p>
    </div>
    
    <div v-else-if="error" class="alert alert-danger flex-column">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchTicketAndComments" class="btn btn-secondary mt-2">
        {{ t('common.tryAgain') }}
      </button>
    </div>
    
    <div v-else-if="ticket" class="content-wrapper">
      <div class="card ticket-summary">
        <div class="ticket-header-row">
          <h2 class="ticket-title">#{{ ticket.id }} {{ ticket.title }}</h2>
          <!-- Status Transition Control -->
          <div v-if="ticket.status !== 'Closed'" class="status-transitions">
            <button
              v-if="ticket.status === 'Open'"
              @click="updateStatus('In Progress')"
              :disabled="transitionLoading"
              class="btn btn-sm btn-primary"
            >
              <span v-if="transitionLoading" class="spinner spinner-sm"></span>
              ⚙️ {{ t('comments.startWorkBtn') }}
            </button>
            <button
              v-if="ticket.status === 'In Progress'"
              @click="updateStatus('Closed')"
              :disabled="transitionLoading"
              class="btn btn-sm btn-success"
            >
              <span v-if="transitionLoading" class="spinner spinner-sm"></span>
              ✅ {{ t('comments.closeTicketBtn') }}
            </button>
          </div>
        </div>
        
        <div class="meta">
          <span :class="['badge', getStatusBadgeClass(ticket.status)]">
            {{ t('ticketForm.statusLabel') }}: {{ t(`status.${ticket.status}`) }}
          </span>
          <span :class="['badge', getPriorityClass(ticket.priority)]">
            {{ t('priority.priorityLabel') }}: {{ t(`priority.${ticket.priority}`) }}
          </span>
        </div>

        <div v-if="transitionError" class="alert alert-danger mb-3">
          ⚠️ {{ transitionError }}
        </div>

        <p class="description">{{ ticket.description || t('tickets.noDescription') }}</p>
      </div>

      <div class="card comments-section">
        <h3 class="section-title">
          {{ t('comments.discussion', { count: comments.length }) }}
        </h3>
        
        <div v-if="comments.length === 0" class="empty-state">
          <div class="empty-icon">💬</div>
          <p>{{ t('comments.noCommentsYet') }}</p>
        </div>
        
        <div v-else class="comments-list">
          <div v-for="comment in comments" :key="comment.id" class="comment-item">
            <div class="comment-header">
              <span class="comment-author">
                👤 {{ t('common.user', { id: comment.createdBy }) }}
              </span>
              <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            </div>
            <div class="comment-text">{{ comment.content }}</div>
          </div>
        </div>

        <div class="add-comment-form">
          <h4>{{ t('comments.leaveComment') }}</h4>
          <div v-if="submitError" class="alert alert-danger mb-2">
            ⚠️ {{ submitError }}
          </div>
          <form @submit.prevent="addComment">
            <textarea 
              v-model="newCommentText" 
              rows="4" 
              :placeholder="t('comments.commentPlaceholder')"
              :disabled="submitLoading"
              class="form-control"
            ></textarea>
            <div class="form-actions">
              <button 
                type="submit" 
                class="btn btn-primary" 
                :disabled="submitLoading || !newCommentText.trim()"
              >
                <span v-if="submitLoading" class="spinner spinner-sm"></span>
                {{ submitLoading ? t('comments.postingComment') : t('comments.postComment') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comments-page {
  max-width: 840px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.header-actions {
  display: flex;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ticket-title {
  font-size: 1.5rem;
  color: #0f172a;
  margin-bottom: 0.75rem;
}

.meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.description {
  color: #334155;
  line-height: 1.6;
  font-size: 1rem;
  margin: 0;
  white-space: pre-wrap;
}

.section-title {
  font-size: 1.2rem;
  color: #0f172a;
  border-bottom: 2px solid #f1f5f9;
  padding-bottom: 0.75rem;
  margin-bottom: 1.5rem;
}

.empty-state {
  text-align: center;
  color: #64748b;
  padding: 2.5rem 0;
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.comment-item {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 1.25rem;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.comment-author {
  font-weight: 600;
  color: #2563eb;
}

.comment-date {
  color: #94a3b8;
  font-size: 0.8rem;
}

.comment-text {
  color: #334155;
  line-height: 1.5;
  white-space: pre-wrap;
}

.add-comment-form h4 {
  margin: 0 0 0.75rem 0;
  color: #0f172a;
  font-size: 1rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.flex-column {
  flex-direction: column;
  align-items: flex-start;
}

.ticket-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.75rem;
}

.ticket-header-row .ticket-title {
  margin-bottom: 0;
}

.status-transitions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-success {
  background-color: var(--success-color, #10b981);
  color: #ffffff;
}

.btn-success:hover:not(:disabled) {
  background-color: #059669;
}
</style>

