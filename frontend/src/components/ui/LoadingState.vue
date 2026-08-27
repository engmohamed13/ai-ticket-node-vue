<script setup lang="ts">
/**
 * Async placeholder. Three shapes, one component:
 *  - `spinner` (default): inline spinner + the slot label. Unchanged behaviour.
 *  - `skeleton`: stacked shimmer lines, for card/detail bodies.
 *  - `table`: shimmer rows, for a table body that has not arrived yet.
 *
 * Root receives fallthrough attrs (e.g. data-testid) so call sites keep whatever
 * hook they already use, and the slot label is always rendered for screen readers.
 */
withDefaults(
  defineProps<{
    variant?: 'spinner' | 'skeleton' | 'table';
    /** Skeleton lines, or table rows, to draw. */
    rows?: number;
    /** Table columns to draw per row; ignored by the other variants. */
    columns?: number;
  }>(),
  { variant: 'spinner', rows: 3, columns: 4 }
);
</script>

<template>
  <p v-if="variant === 'spinner'" class="loading-state" role="status">
    <span class="spinner" aria-hidden="true"></span>
    <slot />
  </p>

  <div v-else-if="variant === 'skeleton'" class="skeleton-block" role="status">
    <span class="sr-only"><slot /></span>
    <span v-for="line in rows" :key="line" class="skeleton skeleton-text" aria-hidden="true"></span>
  </div>

  <div v-else class="skeleton-table" role="status">
    <span class="sr-only"><slot /></span>
    <div v-for="row in rows" :key="row" class="skeleton-row" aria-hidden="true">
      <span v-for="col in columns" :key="col" class="skeleton skeleton-cell"></span>
    </div>
  </div>
</template>

<style scoped>
.skeleton-table {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
</style>
