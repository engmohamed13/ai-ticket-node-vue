<script setup lang="ts"></script>

<template>
  <section class="state-page">
    <div class="state-card card card-padded">
      <svg class="state-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9.5 9.5a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
      </svg>
      <h2>Page not found</h2>
      <p class="lead">The page you're looking for doesn't exist or may have moved.</p>
      <RouterLink :to="{ name: 'dashboard' }" class="btn btn-primary">Go back home</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.state-page {
  display: flex;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  max-width: 460px;
}

.state-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--text-subtle);
  margin-bottom: var(--space-1);
}

.lead {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: var(--font-sm);
}
</style>
