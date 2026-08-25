<script setup lang="ts">
/**
 * Consistent page header: title + optional subtitle on the left,
 * a slot for primary actions (buttons/links) on the right.
 */
defineProps<{
  title: string;
  subtitle?: string;
}>();
</script>

<template>
  <div class="page-header">
    <div class="page-header-heading">
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
      <slot />
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>
