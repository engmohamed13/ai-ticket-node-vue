<script setup lang="ts">
/**
 * Inline spinner + label for async loads. Root receives fallthrough attrs
 * (e.g. data-testid) so call sites keep whatever hook they already use.
 */
</script>

<template>
  <p class="loading-state" role="status">
    <span class="spinner" aria-hidden="true"></span>
    <slot />
  </p>
</template>
