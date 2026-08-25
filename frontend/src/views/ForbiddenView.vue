<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<template>
  <section data-testid="forbidden-view">
    <h2>Access denied</h2>
    <p class="lead">
      Your role <strong>{{ auth.user?.roleName ?? 'unknown' }}</strong> does not have permission to
      open that screen. Contact a System Administrator if you need access.
    </p>
    <RouterLink :to="{ name: 'dashboard' }" class="btn btn-primary">Back to Dashboard</RouterLink>
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
