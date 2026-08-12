<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import type { Ticket } from '../types';

const { t } = useI18n();
const tickets = ref<Ticket[]>([]);
const searchQuery = ref('');
const loading = ref(true);
const error = ref('');
const router = useRouter();
const route = useRoute();

let searchTimeout: any = null;

const fetchTickets = async () => {
  try {
    loading.value = true;
    error.value = '';
    const params = searchQuery.value.trim() ? { search: searchQuery.value.trim() } : {};
    const response = await api.get('/tickets', { params });
    tickets.value = response.data.data;
  } catch (err: any) {
    error.value = t('tickets.failedTickets');
  } finally {
    loading.value = false;
  }
};

const onSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    fetchTickets();
  }, 300);
};

const clearSearch = () => {
  searchQuery.value = '';
  fetchTickets();
};

const deleteTicket = async (id: number) => {
  if (!confirm(t('tickets.confirmDelete'))) return;
  try {
    await api.delete(`/tickets/${id}`);
    tickets.value = tickets.value.filter(t => t.id !== id);
  } catch (err: any) {
    alert(t('tickets.failedDelete'));
  }
};

const goToCreate = () => router.push('/tickets/new');
const goToEdit = (id: number) => router.push(`/tickets/${id}/edit`);
const goToComments = (id: number) => router.push(`/tickets/${id}/comments`);

const clearFilter = () => {
  router.push('/tickets');
};

const activeFilterKey = computed(() => {
  const status = route.query.status as string | undefined;
  const priority = route.query.priority as string | undefined;

  if (status?.toLowerCase() === 'open') return 'filterOpen';
  if (status?.toLowerCase() === 'closed') return 'filterClosed';
  if (priority?.toLowerCase() === 'high') return 'filterHighPriority';
  return 'filterAll';
});

const isFilterActive = computed(() => {
  return activeFilterKey.value !== 'filterAll';
});

const filteredTickets = computed(() => {
  const status = route.query.status as string | undefined;
  const priority = route.query.priority as string | undefined;

  return tickets.value.filter(ticket => {
    if (status) {
      if (ticket.status.toLowerCase() !== status.toLowerCase()) return false;
    }
    if (priority) {
      if (ticket.priority.toLowerCase() !== priority.toLowerCase()) return false;
    }
    return true;
  });
});

onMounted(() => {
  fetchTickets();
});

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'Open': return 'badge-open';
    case 'In Progress': return 'badge-in-progress';
    case 'Closed': return 'badge-closed';
    default: return '';
  }
};

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'High': return 'badge-priority-high';
    case 'Medium': return 'badge-priority-medium';
    case 'Low': return 'badge-priority-low';
    default: return '';
  }
};
</script>

<template>
  <div class="tickets-page">
    <div class="page-header">
      <div>
        <h1>{{ t('tickets.title') }}</h1>
        <p class="subtitle">{{ t('tickets.subtitle') }}</p>
      </div>
      <button @click="goToCreate" class="btn btn-primary">{{ t('tickets.createTicketBtn') }}</button>
    </div>

    <!-- Search Section -->
    <div class="search-section card">
      <div class="search-container">
        <span class="search-icon">🔍</span>
        <input
          id="search-input"
          v-model="searchQuery"
          @input="onSearchInput"
          type="text"
          :placeholder="t('tickets.searchPlaceholder')"
          class="form-control search-input"
        />
        <button v-if="searchQuery" @click="clearSearch" type="button" class="btn-clear-search" title="Clear search">✖</button>
      </div>
    </div>

    <!-- Active Filter Indicator Banner -->

    <div class="filter-banner card">
      <div class="filter-info">
        <span class="filter-icon">🔍</span>
        <span class="filter-text">
          {{ t('tickets.showingFilter', { filter: t(`tickets.${activeFilterKey}`) }) }}
        </span>
        <span class="filter-count">({{ filteredTickets.length }})</span>
      </div>
      <button v-if="isFilterActive" @click="clearFilter" class="btn btn-secondary btn-sm">
        ✖ {{ t('tickets.clearFilter') }}
      </button>
    </div>

    <div v-if="loading" class="state-container">
      <div class="spinner"></div>
      <p>{{ t('tickets.loadingTickets') }}</p>
    </div>
    
    <div v-else-if="error" class="state-container error">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchTickets" class="btn btn-secondary mt-2">{{ t('common.tryAgain') }}</button>
    </div>
    
    <div v-else-if="filteredTickets.length === 0" class="state-container empty">
      <div class="empty-icon">📁</div>
      <h3>{{ t('tickets.noTicketsTitle') }}</h3>
      <p>{{ t('tickets.noTicketsDesc') }}</p>
      <div class="empty-actions mt-3">
        <button v-if="isFilterActive" @click="clearFilter" class="btn btn-secondary">
          {{ t('tickets.clearFilter') }}
        </button>
        <button @click="goToCreate" class="btn btn-primary">
          {{ t('tickets.createFirstBtn') }}
        </button>
      </div>
    </div>
    
    <div v-else class="tickets-grid">
      <div v-for="ticket in filteredTickets" :key="ticket.id" class="card ticket-card">
        <div class="card-header">
          <h3 class="ticket-title">#{{ ticket.id }} {{ ticket.title }}</h3>
          <span :class="['badge', getStatusBadgeClass(ticket.status)]">
            {{ t(`status.${ticket.status}`) }}
          </span>
        </div>
        
        <p class="description">{{ ticket.description || t('tickets.noDescription') }}</p>
        
        <div class="card-footer">
          <span class="priority">
            {{ t('priority.priorityLabel') }}: 
            <strong :class="getPriorityClass(ticket.priority)">
              {{ t(`priority.${ticket.priority}`) }}
            </strong>
          </span>
          
          <div class="actions">
            <button @click="goToComments(ticket.id)" class="btn btn-sm btn-outline" :title="t('tickets.comments')">
              💬 {{ t('tickets.comments') }}
            </button>
            <button @click="goToEdit(ticket.id)" class="btn btn-sm btn-outline" :title="t('tickets.edit')">
              ✏️ {{ t('tickets.edit') }}
            </button>
            <button @click="deleteTicket(ticket.id)" class="btn btn-sm btn-danger-outline" :title="t('tickets.delete')">
              🗑️ {{ t('tickets.delete') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tickets-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

h1 {
  font-size: 1.85rem;
  color: #0f172a;
}

.subtitle {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 1rem;
}

.filter-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background-color: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.filter-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #334155;
  font-size: 0.95rem;
}

.filter-icon {
  font-size: 1rem;
}

.filter-count {
  color: #64748b;
  font-weight: 500;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
  opacity: 0.6;
}

.empty h3 {
  margin: 0 0 0.5rem 0;
  color: #1e293b;
}

.empty-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
}

.tickets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.ticket-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.ticket-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 12px -2px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.ticket-title {
  font-size: 1.1rem;
  color: #0f172a;
  font-weight: 700;
  line-height: 1.4;

  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.description {
  color: #475569;
  font-size: 0.925rem;
  line-height: 1.5;
  margin: 0 0 1.5rem 0;
  flex-grow: 1;

  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.priority {
  font-size: 0.85rem;
  color: #64748b;
}

.actions {
  display: flex;
  gap: 0.4rem;
}

.search-section {
  padding: 1rem;
  background-color: #ffffff;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.search-container {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
}

.search-icon {
  position: absolute;
  left: 1rem;
  color: #94a3b8;
  font-size: 1rem;
  pointer-events: none;
}

html[dir="rtl"] .search-icon {
  left: auto;
  right: 1rem;
}

.search-input {
  width: 100%;
  padding-left: 2.5rem;
  padding-right: 2.5rem;
  height: 42px;
}

.btn-clear-search {
  position: absolute;
  right: 1rem;
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

html[dir="rtl"] .btn-clear-search {
  right: auto;
  left: 1rem;
}

.btn-clear-search:hover {
  color: #475569;
}
</style>

