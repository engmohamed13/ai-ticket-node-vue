<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <aside class="app-sidebar">
    <nav class="sidebar-nav">
      <RouterLink to="/" class="nav-item" exact-active-class="active">
        <span class="nav-icon">📊</span>
        <span class="nav-text">{{ t('nav.dashboard') }}</span>
      </RouterLink>

      <RouterLink to="/tickets" class="nav-item" exact-active-class="active">
        <span class="nav-icon">🎫</span>
        <span class="nav-text">{{ t('nav.tickets') }}</span>
      </RouterLink>

      <RouterLink to="/tickets/new" class="nav-item" exact-active-class="active">
        <span class="nav-icon">➕</span>
        <span class="nav-text">{{ t('nav.createTicket') }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 240px;
  background-color: #ffffff;
  border-inline-end: 1px solid #e2e8f0;
  min-height: calc(100vh - 64px);
  padding: 1.5rem 1rem;
  flex-shrink: 0;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  color: #64748b;
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.nav-item:hover {
  background-color: #f1f5f9;
  color: #1e293b;
}

.nav-item.active {
  background-color: #eff6ff;
  color: #2563eb;
}

.nav-icon {
  font-size: 1.15rem;
}

@media (max-width: 768px) {
  .app-sidebar {
    width: 100%;
    min-height: auto;
    border-inline-end: none;
    border-bottom: 1px solid #e2e8f0;
    padding: 0.75rem 1rem;
  }

  .sidebar-nav {
    flex-direction: row;
    justify-content: space-around;
  }

  .nav-item {
    padding: 0.5rem 0.75rem;
    font-size: 0.85rem;
  }
}
</style>
