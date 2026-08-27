<script setup lang="ts">
/**
 * Consistent page header: optional breadcrumb trail, title + optional subtitle
 * on the left, a slot for primary actions (buttons/links) on the right.
 *
 * `breadcrumbs` is optional — a crumb with a `to` renders as a router link, one
 * without renders as plain text (that is the current page, so it is not a link).
 */
import type { RouteLocationRaw } from 'vue-router';

export interface Crumb {
  label: string;
  to?: RouteLocationRaw;
}

defineProps<{
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
}>();
</script>

<template>
  <div class="page-header">
    <div class="page-header-heading">
      <nav v-if="breadcrumbs && breadcrumbs.length > 0" class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li v-for="(crumb, index) in breadcrumbs" :key="index">
            <RouterLink v-if="crumb.to" :to="crumb.to">{{ crumb.label }}</RouterLink>
            <span v-else aria-current="page">{{ crumb.label }}</span>
          </li>
        </ol>
      </nav>
      <h2>{{ title }}</h2>
      <p v-if="subtitle">{{ subtitle }}</p>
      <slot />
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.breadcrumbs {
  margin-bottom: var(--space-2);
}

.breadcrumbs ol {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: var(--font-xs);
  color: var(--text-muted);
}

.breadcrumbs li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

/* Separator is decorative, so it lives in CSS rather than the accessibility tree. */
.breadcrumbs li:not(:last-child)::after {
  content: '/';
  color: var(--text-subtle);
}

.breadcrumbs a {
  color: var(--text-muted);
  text-decoration: none;
  border-radius: var(--radius-xs);
}

.breadcrumbs a:hover {
  color: var(--color-primary);
  text-decoration: underline;
}

.breadcrumbs [aria-current='page'] {
  color: var(--text-main);
  font-weight: 600;
}
</style>
