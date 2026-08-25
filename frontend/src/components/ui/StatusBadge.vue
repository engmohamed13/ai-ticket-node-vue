<script setup lang="ts">
/**
 * Small colored status pill. Root element receives fallthrough attrs
 * (e.g. data-testid), and the only text inside it is the default slot,
 * so exact-text assertions on the root element are unaffected.
 */
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  }>(),
  { variant: 'neutral' }
);
</script>

<template>
  <span class="badge" :class="`badge-${variant}`"><slot /></span>
</template>
