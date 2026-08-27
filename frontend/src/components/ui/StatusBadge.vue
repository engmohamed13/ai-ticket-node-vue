<script setup lang="ts">
/**
 * Small colored status pill. Root element receives fallthrough attrs
 * (e.g. data-testid), and the only text inside it is the default slot,
 * so exact-text assertions on the root element are unaffected.
 */
withDefaults(
  defineProps<{
    variant?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'md';
  }>(),
  { variant: 'neutral', size: 'md' }
);
</script>

<template>
  <span class="badge" :class="[`badge-${variant}`, { 'badge-sm': size === 'sm' }]"><slot /></span>
</template>
