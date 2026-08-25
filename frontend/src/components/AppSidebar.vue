<script setup lang="ts">
</script>

<template>
  <aside class="app-sidebar">
    <nav>
      <RouterLink :to="{ name: 'dashboard' }" class="nav-link">Dashboard</RouterLink>
      <RouterLink :to="{ name: 'system-health' }" class="nav-link">System Health</RouterLink>
      <RouterLink :to="{ name: 'communications' }" class="nav-link">Communications</RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 220px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  padding: 1.5rem 0;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.6rem 1.5rem;
  color: #475569;
  text-decoration: none;
  font-size: 0.95rem;
}

.nav-link:hover {
  background-color: #f1f5f9;
}

.nav-link.router-link-active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 600;
  border-right: 3px solid #2563eb;
}

@media (max-width: 768px) {
  .app-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  nav {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0 1rem;
  }
}
</style>
