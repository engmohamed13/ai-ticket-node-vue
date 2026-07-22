<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import api from '../services/api';
import type { Ticket } from '../types';

const { t } = useI18n();
const tickets = ref<Ticket[]>([]);
const loading = ref(true);
const error = ref('');
const router = useRouter();

const fetchTickets = async () => {
  try {
    loading.value = true;
    error.value = '';
    const response = await api.get('/tickets');
    tickets.value = response.data.data;
  } catch (err: any) {
    error.value = t('dashboard.failedStats');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchTickets();
});

const totalTickets = computed(() => tickets.value.length);
const openTickets = computed(() => tickets.value.filter(t => t.status === 'Open').length);
const closedTickets = computed(() => tickets.value.filter(t => t.status === 'Closed').length);
const highPriorityTickets = computed(() => tickets.value.filter(t => t.priority === 'High').length);

const goToTickets = (filter?: { status?: string; priority?: string }) => {
  if (!filter) {
    router.push('/tickets');
  } else {
    router.push({ path: '/tickets', query: filter });
  }
};
const goToCreate = () => router.push('/tickets/new');
</script>

<template>
  <div class="dashboard-page">
    <div class="page-header">
      <div>
        <h1>{{ t('dashboard.welcomeTitle') }}</h1>
        <p class="welcome-text">{{ t('dashboard.welcomeText') }}</p>
      </div>
      <div class="header-actions">
        <button @click="goToCreate" class="btn btn-primary">{{ t('dashboard.createTicket') }}</button>
        <button @click="goToTickets()" class="btn btn-secondary">{{ t('dashboard.viewAllTickets') }}</button>
      </div>
    </div>

    <div v-if="loading" class="state-container">
      <div class="spinner"></div>
      <p>{{ t('dashboard.loadingStats') }}</p>
    </div>
    
    <div v-else-if="error" class="state-container error">
      <p>⚠️ {{ error }}</p>
      <button @click="fetchTickets" class="btn btn-secondary mt-2">{{ t('common.tryAgain') }}</button>
    </div>
    
    <div v-else class="stats-grid">
      <div class="stat-card" @click="goToTickets()">
        <div class="stat-icon bg-blue">📋</div>
        <div class="stat-content">
          <h3>{{ t('dashboard.totalTickets') }}</h3>
          <p class="stat-number">{{ totalTickets }}</p>
        </div>
      </div>
      
      <div class="stat-card" @click="goToTickets({ status: 'open' })">
        <div class="stat-icon bg-yellow">⏳</div>
        <div class="stat-content">
          <h3>{{ t('dashboard.openTickets') }}</h3>
          <p class="stat-number">{{ openTickets }}</p>
        </div>
      </div>
      
      <div class="stat-card" @click="goToTickets({ status: 'closed' })">
        <div class="stat-icon bg-green">✅</div>
        <div class="stat-content">
          <h3>{{ t('dashboard.closedTickets') }}</h3>
          <p class="stat-number">{{ closedTickets }}</p>
        </div>
      </div>
      
      <div class="stat-card" @click="goToTickets({ priority: 'high' })">
        <div class="stat-icon bg-red">🔥</div>
        <div class="stat-content">
          <h3>{{ t('dashboard.highPriority') }}</h3>
          <p class="stat-number">{{ highPriorityTickets }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 2rem;
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

.welcome-text {
  margin-top: 0.35rem;
  color: #64748b;
  font-size: 1rem;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.stat-card {
  background: #ffffff;
  border-radius: 14px;
  padding: 1.5rem;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  user-select: none;
}

.stat-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 0 12px 20px -4px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04);
  border-color: #cbd5e1;
}

.stat-card:active {
  transform: translateY(-1px) scale(0.99);
  box-shadow: 0 4px 8px -2px rgba(0, 0, 0, 0.06);
}

.stat-icon {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
  transition: transform 0.25s ease;
}

.stat-card:hover .stat-icon {
  transform: scale(1.08);
}

.bg-blue { background-color: #eff6ff; }
.bg-yellow { background-color: #fffbeb; }
.bg-green { background-color: #ecfdf5; }
.bg-red { background-color: #fef2f2; }

.stat-content h3 {
  margin: 0 0 0.25rem 0;
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
}

.stat-number {
  margin: 0;
  color: #0f172a;
  font-size: 1.85rem;
  font-weight: 700;
}
</style>
