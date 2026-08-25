<script setup lang="ts">
/** Generic empty/blank-slate state — used for empty lists and full-page states (403/404). */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div class="empty-state">
    <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5" />
      <path d="M3 9h18" stroke="currentColor" stroke-width="1.5" />
      <path d="M7 14h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
    </svg>
    <p class="empty-state-title">{{ title }}</p>
    <p v-if="description" class="empty-state-description">{{ description }}</p>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
