<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useHealthStore } from '../stores/health';
import { useAuthStore } from '../stores/auth';

const healthStore = useHealthStore();
const auth = useAuthStore();
const router = useRouter();

const statusLabel = computed(() => healthStore.payload?.status ?? 'unknown');
const statusClass = computed(() => `pill-${statusLabel.value}`);

const onLogout = async (): Promise<void> => {
  await auth.signOut();
  await router.push({ name: 'login' });
};
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <h1 class="app-title">CustomerSupportCRM</h1>
      <span class="status-pill" :class="statusClass" data-testid="header-status-pill">{{ statusLabel }}</span>
    </div>
    <div v-if="auth.isAuthenticated" class="header-user" data-testid="header-user">
      <span class="user-name">{{ auth.user?.name }}</span>
      <span class="user-role" data-testid="header-role">{{ auth.user?.roleName }}</span>
      <button class="btn btn-primary" type="button" data-testid="logout-button" @click="onLogout">
        Logout
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background-color: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-title {
  font-size: 1.1rem;
  margin: 0;
}

.status-pill {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: capitalize;
  background-color: #e2e8f0;
  color: #475569;
}

.pill-ok {
  background-color: var(--color-ok-bg);
  color: var(--color-ok);
}

.pill-degraded {
  background-color: var(--color-degraded-bg);
  color: var(--color-degraded);
}

.header-user {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-role {
  color: var(--text-muted);
  font-size: 0.8rem;
}
</style>
