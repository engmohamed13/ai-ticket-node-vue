<script setup lang="ts">
</script>

<template>
  <section>
    <h2>Dashboard</h2>
    <p class="lead">
      CustomerSupportCRM runs on Vue 3 + Vite talking to an Express API, backed by PostgreSQL
      (<code>CustomerCRM</code>).
    </p>
    <RouterLink :to="{ name: 'system-health' }" class="btn btn-primary">View System Health</RouterLink>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 640px;
}

.lead {
  color: var(--text-muted);
  line-height: 1.6;
}
</style>
