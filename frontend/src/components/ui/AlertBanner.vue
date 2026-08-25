<script setup lang="ts">
/**
 * Shared alert/notice banner. Root element receives fallthrough attrs
 * (e.g. data-testid) so call sites keep whatever hook they already use.
 * Slot content stays the only text inside the banner, so any exact-text
 * assertion on the root element keeps working unchanged.
 */
withDefaults(
  defineProps<{
    variant?: 'error' | 'success' | 'warning' | 'info';
  }>(),
  { variant: 'info' }
);
</script>

<template>
  <div class="alert" :class="`alert-${variant}`" :role="variant === 'error' ? 'alert' : 'status'">
    <svg
      v-if="variant === 'error'"
      class="alert-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
      <path d="M12 8v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
    <svg
      v-else-if="variant === 'success'"
      class="alert-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
      <path d="M8.5 12.5l2.3 2.3L15.5 9.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <svg
      v-else-if="variant === 'warning'"
      class="alert-icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path d="M12 3.5l9.5 16.5H2.5L12 3.5z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      <path d="M12 10v4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="17" r="1" fill="currentColor" />
    </svg>
    <svg v-else class="alert-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" />
      <path d="M12 11v5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
    </svg>
    <div class="alert-body"><slot /></div>
  </div>
</template>
