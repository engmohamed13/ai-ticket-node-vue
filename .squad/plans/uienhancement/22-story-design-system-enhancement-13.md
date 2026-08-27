# Story 22 — Design System Enhancement & Component Library (Story: 13)

## Prerequisites

- Story 09 completed: [../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md](../authenticationandusermanagement/09-story-login-and-user-management-ui-3.md). The core authentication flow, protected routes, and basic UI shell (AppHeader, AppSidebar) exist.
- Story 06 completed: [../communicationchannels/06-story-communication-timeline-ui-2.md](../communicationchannels/06-story-communication-timeline-ui-2.md). The Communications view and timeline components exist.
- All existing views must remain functional: DashboardView, CustomersView, TicketsView, TicketDetailView, CommunicationsView, KnowledgeBaseView, UsersView, RolesView, and all other screens listed in the module inventory.

---

## Story Goal

Establish a consistent, modern CRM design system and create a reusable component library that ensures visual consistency, improves typography, spacing, colors, borders, and shadows across the entire application. This story sets the foundation for all subsequent UI refinements.

Outcomes:

1. **Enhanced design tokens** in `frontend/src/style.css` with improved typography scale, spacing consistency, color palette with semantic states, and modern shadows.
2. **Reusable UI component library** with improved Button, Input, Select, Badge, Alert, Card, Table, and Dialog components.
3. **Loading, empty, and error state components** for consistent state handling across all views.
4. **Responsive design utilities** ensuring desktop, tablet, and mobile work seamlessly.
5. **Accessibility compliance** with proper contrast, focus states, and keyboard navigation.

---

## Context — Read These Files First

1. `frontend/src/style.css` (722 lines) — read the whole file. The current design tokens, base styles, and component utilities (.btn, .badge, .alert, .card, .table). Task 1 enhances this with better typography, spacing, and shadow scale. Do not remove existing tokens or class names — only extend and refine.
2. [frontend/src/components/](frontend/src/components/) — list all existing components: AppHeader, AppSidebar, NotificationCenter, NotificationToasts, ui/AlertBanner, ui/EmptyState, ui/LoadingState, ui/PageHeader, ui/SlaIndicator, ui/StatusBadge. Tasks 2–8 improve and standardize these.
3. `frontend/src/views/SystemHealthView.vue` (142 lines) — the reference view for current styling patterns: loading state, error state, `.view` class with `.card` sections, and CSS custom properties.
4. `frontend/src/views/LoginView.vue` — reference for full-screen layout and form styling (tasks 9 will use these patterns).
5. `frontend/package.json` — confirm no external UI framework is already installed; `vue`, `vue-router`, and `pinia` are the only dependencies. Do **not** introduce new UI framework dependencies (no Bootstrap, Tailwind, Material Design).
6. Accessibility checklist: WCAG 2.1 AA level (readable contrast, keyboard navigation, visible focus, semantic HTML, proper labels). Reference: [../../../frontend/src/style.css:170-180](../../../frontend/src/style.css#L170-L180) for the existing `:focus-visible` pattern.

---

## Implementation Tasks

### 1 — Enhance design tokens in `frontend/src/style.css`

**File: `frontend/src/style.css`**

Modify the `:root` section (lines 9–93) to refine the design system:

**A. Add extended typography scale** (after line 84):
```css
  --font-3xl: 1.875rem;
  --font-4xl: 2.25rem;
  --font-xs-extra: 0.65rem;
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  --letter-spacing-tight: -0.01em;
  --letter-spacing-normal: 0;
  --letter-spacing-wide: 0.05em;
```

**B. Add extended spacing scale** (after line 66):
```css
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
```

**C. Add extended radius scale** (after line 71):
```css
  --radius-xs: 4px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
```

**D. Enhanced shadow scale** — replace lines 73–76 with:
```css
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 1px 3px rgba(15, 23, 42, 0.1), 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 6px rgba(15, 23, 42, 0.07), 0 2px 4px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 10px 15px rgba(15, 23, 42, 0.1), 0 4px 6px rgba(15, 23, 42, 0.05);
  --shadow-xl: 0 20px 25px rgba(15, 23, 42, 0.1), 0 8px 10px rgba(15, 23, 42, 0.04);
  --shadow-2xl: 0 25px 50px rgba(15, 23, 42, 0.15);
  --shadow-inner: inset 0 2px 4px rgba(15, 23, 42, 0.05);
```

**E. Add focus ring variant** (after line 88):
```css
  --focus-ring: 0 0 0 3px rgba(37, 99, 235, 0.1);
  --focus-ring-color: var(--color-primary);
```

**F. Add state opacity values** (after line 88):
```css
  --opacity-disabled: 0.6;
  --opacity-hover: 0.08;
```

Then update the `:focus-visible` rule (lines 175–179) to use the new tokens:
```css
:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
  box-shadow: var(--focus-ring);
}
```

**G. Add a dark mode palette** (after `:root` block):
```css
@media (prefers-color-scheme: dark) {
  :root {
    --text-main: var(--slate-100);
    --text-muted: var(--slate-400);
    --text-subtle: var(--slate-500);
    --border-color: var(--slate-700);
    --border-color-strong: var(--slate-600);
    --surface-color: var(--slate-800);
    --surface-sunken: var(--slate-900);
  }
}
```

**H. Update all button styles** (lines 217–306) for improved consistency:

Replace `.btn` definition with:
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  font-size: var(--font-sm);
  font-weight: 600;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  cursor: pointer;
  font-family: inherit;
  line-height: var(--line-height-tight);
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform 60ms ease-out;
  white-space: nowrap;
  user-select: none;
  position: relative;
}

.btn:active:not(:disabled) {
  transform: scale(0.98);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}
```

Add new button sizes after `.btn-icon`:
```css
.btn-lg {
  padding: 0.8rem 1.5rem;
  font-size: var(--font-base);
}

.btn-xs {
  padding: 0.3rem 0.5rem;
  font-size: var(--font-xs);
}

.btn-block {
  width: 100%;
}

.btn-loading {
  pointer-events: none;
}

.btn-with-icon {
  gap: 0.6rem;
}
```

**I. Improve form styles** (lines 310–398):

Update `input, select, textarea` base rule:
```css
input,
select,
textarea {
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--border-color-strong);
  border-radius: var(--radius-sm);
  font-family: inherit;
  font-size: var(--font-base);
  color: var(--text-main);
  background-color: var(--surface-color);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background-color var(--transition-fast);
  width: 100%;
}

input:hover,
select:hover,
textarea:hover {
  border-color: var(--border-color-strong);
}

input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--focus-ring);
}

input:disabled,
select:disabled,
textarea:disabled {
  background-color: var(--surface-sunken);
  color: var(--text-muted);
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}
```

Add form state classes after `.form-actions`:
```css
.form-field-error input,
.form-field-error select,
.form-field-error textarea {
  border-color: var(--color-down-solid);
  box-shadow: 0 0 0 3px var(--color-down-bg);
}

.form-field-success input,
.form-field-success select,
.form-field-success textarea {
  border-color: var(--color-ok-solid);
  background-color: var(--color-ok-bg);
  color: var(--color-ok);
}

.form-field-hint {
  font-size: var(--font-xs);
  color: var(--text-muted);
  margin-top: 0.25rem;
}
```

**J. Improve card styles** (lines 530–554):

Replace the `.card` rules with:
```css
.card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition:
    box-shadow var(--transition),
    border-color var(--transition);
}

.card:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--border-color-strong);
}

.card-padded {
  padding: var(--space-6);
}

.card-compact {
  padding: var(--space-4);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-color);
}

.card-title {
  font-size: var(--font-lg);
  font-weight: 700;
  margin: 0;
  color: var(--text-main);
}

.card-subtitle {
  font-size: var(--font-sm);
  color: var(--text-muted);
  margin-top: 0.25rem;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-color);
  background-color: var(--surface-sunken);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
```

**K. Improve table styles** (lines 560–602):

Replace the table rules with:
```css
.table-wrapper {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow-x: auto;
  overflow-y: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-sm);
  line-height: var(--line-height-normal);
}

thead th {
  position: sticky;
  top: 0;
  text-align: left;
  color: var(--text-muted);
  font-size: var(--font-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  padding: 1rem;
  background-color: var(--surface-sunken);
  border-bottom: 1px solid var(--border-color);
  white-space: nowrap;
  vertical-align: middle;
}

tbody td {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-main);
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover {
  background-color: var(--surface-sunken);
}

tbody tr:focus-within {
  background-color: var(--color-primary-bg);
  box-shadow: inset 3px 0 0 var(--color-primary);
}

.table-cell-numeric {
  text-align: right;
  font-family: 'SFMono-Regular', Consolas, monospace;
}

.table-cell-centered {
  text-align: center;
}

.table-empty {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--text-muted);
}
```

**L. Enhance alert styles** (lines 462–505):

Replace alert definitions with:
```css
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-size: var(--font-sm);
  line-height: var(--line-height-relaxed);
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 0.15rem;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.alert-body {
  flex: 1;
  min-width: 0;
}

.alert-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.alert-close:hover {
  opacity: 1;
}

.alert-error {
  background-color: var(--color-down-bg);
  border-color: var(--color-down-border);
  color: var(--color-down);
}

.alert-success {
  background-color: var(--color-ok-bg);
  border-color: var(--color-ok-border);
  color: var(--color-ok);
}

.alert-warning {
  background-color: var(--color-degraded-bg);
  border-color: var(--color-degraded-border);
  color: var(--color-degraded);
}

.alert-info {
  background-color: var(--color-info-bg);
  border-color: var(--color-info-border);
  color: var(--color-info);
}
```

**M. Add modal/dialog styling** (after table styles):
```css
/* ==========================================================================
   Dialogs / Modals
   ========================================================================== */

.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
}

.dialog {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  animation: slideUp 200ms ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(2rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dialog-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-title {
  font-size: var(--font-lg);
  font-weight: 700;
  margin: 0;
}

.dialog-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: var(--text-muted);
  font-size: 1.5rem;
  line-height: 1;
  transition: color var(--transition-fast);
}

.dialog-close:hover {
  color: var(--text-main);
}

.dialog-content {
  padding: var(--space-5) var(--space-6);
}

.dialog-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border-color);
  background-color: var(--surface-sunken);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
}
```

**N. Add utility classes for common patterns** (at the end):
```css
/* Utility classes */
.text-truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-clamp-2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.text-center {
  text-align: center;
}

.text-right {
  text-align: right;
}

.text-uppercase {
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
}

.text-muted {
  color: var(--text-muted);
}

.text-subtle {
  color: var(--text-subtle);
}

.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.gap-5 { gap: var(--space-5); }
.gap-6 { gap: var(--space-6); }

.mt-1 { margin-top: var(--space-1); }
.mt-2 { margin-top: var(--space-2); }
.mt-3 { margin-top: var(--space-3); }
.mt-4 { margin-top: var(--space-4); }
.mt-6 { margin-top: var(--space-6); }

.mb-1 { margin-bottom: var(--space-1); }
.mb-2 { margin-bottom: var(--space-2); }
.mb-3 { margin-bottom: var(--space-3); }
.mb-4 { margin-bottom: var(--space-4); }
.mb-6 { margin-bottom: var(--space-6); }

.px-1 { padding-left: var(--space-1); padding-right: var(--space-1); }
.px-2 { padding-left: var(--space-2); padding-right: var(--space-2); }
.px-3 { padding-left: var(--space-3); padding-right: var(--space-3); }
.px-4 { padding-left: var(--space-4); padding-right: var(--space-4); }

.py-1 { padding-top: var(--space-1); padding-bottom: var(--space-1); }
.py-2 { padding-top: var(--space-2); padding-bottom: var(--space-2); }
.py-3 { padding-top: var(--space-3); padding-bottom: var(--space-3); }
.py-4 { padding-top: var(--space-4); padding-bottom: var(--space-4); }
```

### 2 — Improve and standardize UI components

**File: `frontend/src/components/ui/PageHeader.vue`** — enhance to support subtitle, breadcrumbs, and action buttons

```vue
<script setup lang="ts">
export interface Props {
  title: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

defineProps<Props>();
</script>

<template>
  <div class="page-header">
    <div class="page-header-heading">
      <h1>{{ title }}</h1>
      <p v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</p>
      <nav v-if="breadcrumbs?.length" class="breadcrumbs" aria-label="Breadcrumb">
        <ol class="breadcrumb-list">
          <li v-for="(crumb, idx) in breadcrumbs" :key="idx" class="breadcrumb-item">
            <RouterLink v-if="crumb.href" :to="crumb.href">{{ crumb.label }}</RouterLink>
            <span v-else>{{ crumb.label }}</span>
          </li>
        </ol>
      </nav>
    </div>
    <div v-if="$slots.actions" class="page-header-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.page-header-heading h1 {
  margin: 0;
  font-size: var(--font-2xl);
  color: var(--text-main);
}

.page-header-subtitle {
  color: var(--text-muted);
  font-size: var(--font-sm);
  margin-top: 0.35rem;
}

.breadcrumbs {
  margin-top: 0.75rem;
}

.breadcrumb-list {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: var(--font-xs);
}

.breadcrumb-item {
  color: var(--text-muted);
}

.breadcrumb-item:not(:last-child)::after {
  content: '/';
  margin-left: 0.5rem;
  color: var(--text-subtle);
}

.breadcrumb-item a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-item a:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.page-header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}
</style>
```

**File: `frontend/src/components/ui/EmptyState.vue`** — enhance with icon and actions

```vue
<script setup lang="ts">
export interface Props {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
}

defineProps<Props>();

defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-state-icon">{{ icon }}</div>
    <h3 class="empty-state-title">{{ title }}</h3>
    <p class="empty-state-description">{{ description }}</p>
    <button
      v-if="actionLabel"
      class="btn btn-primary"
      type="button"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-4);
  padding: var(--space-8) var(--space-4);
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state-icon {
  font-size: 3rem;
}

.empty-state-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.empty-state-description {
  font-size: var(--font-sm);
  color: var(--text-muted);
  max-width: 32rem;
  margin: 0;
}
</style>
```

**File: `frontend/src/components/ui/LoadingState.vue`** — enhanced with skeleton loader

```vue
<script setup lang="ts">
export interface Props {
  message?: string;
  rows?: number;
  type?: 'spinner' | 'skeleton' | 'skeleton-table';
}

withDefaults(defineProps<Props>(), {
  message: 'Loading...',
  rows: 3,
  type: 'spinner'
});
</script>

<template>
  <div class="loading-container">
    <div v-if="type === 'spinner'" class="loading-state">
      <div class="spinner" />
      <p>{{ message }}</p>
    </div>

    <div v-else-if="type === 'skeleton'" class="skeleton-loader">
      <div v-for="i in rows" :key="i" class="skeleton-line">
        <div class="skeleton skeleton-text" />
      </div>
    </div>

    <div v-else-if="type === 'skeleton-table'" class="skeleton-table">
      <div class="skeleton-row">
        <div v-for="i in 5" :key="`header-${i}`" class="skeleton skeleton-cell-header" />
      </div>
      <div v-for="row in rows" :key="row" class="skeleton-row">
        <div v-for="i in 5" :key="`cell-${row}-${i}`" class="skeleton skeleton-cell" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.loading-container {
  width: 100%;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  color: var(--text-muted);
}

.spinner {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 3px solid var(--border-color);
  border-top-color: var(--color-primary);
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.skeleton-loader {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
}

.skeleton-line {
  height: 1rem;
}

.skeleton {
  position: relative;
  overflow: hidden;
  background-color: var(--border-color);
  border-radius: var(--radius-sm);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.skeleton-text {
  height: 1rem;
  width: 100%;
}

.skeleton-table {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: var(--space-4);
}

.skeleton-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-3);
}

.skeleton-cell-header {
  height: 1.5rem;
}

.skeleton-cell {
  height: 1rem;
}
</style>
```

**File: `frontend/src/components/ui/StatusBadge.vue`** — enhanced with more status types

```vue
<script setup lang="ts">
type BadgeType = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

export interface Props {
  label: string;
  type?: BadgeType;
  size?: 'sm' | 'md';
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  type: 'neutral',
  size: 'md'
});
</script>

<template>
  <span :class="['badge', `badge-${type}`, `badge-${size}`]">
    <span v-if="icon" class="badge-icon">{{ icon }}</span>
    {{ label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 600;
  white-space: nowrap;
  text-transform: capitalize;
}

.badge-sm {
  padding: 0.2rem 0.6rem;
  font-size: var(--font-xs-extra);
}

.badge-neutral {
  background-color: var(--slate-100);
  color: var(--slate-700);
}

.badge-primary {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
}

.badge-success {
  background-color: var(--color-ok-bg);
  color: var(--color-ok);
}

.badge-warning {
  background-color: var(--color-degraded-bg);
  color: var(--color-degraded);
}

.badge-danger {
  background-color: var(--color-down-bg);
  color: var(--color-down);
}

.badge-info {
  background-color: var(--color-info-bg);
  color: var(--color-info);
}

.badge-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
}
</style>
```

**File: `frontend/src/components/ui/AlertBanner.vue`** — component-based alerts

```vue
<script setup lang="ts">
import { ref } from 'vue';

type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface Props {
  type?: AlertType;
  title?: string;
  message: string;
  dismissible?: boolean;
  icon?: string;
}

withDefaults(defineProps<Props>(), {
  type: 'info',
  dismissible: true
});

const isVisible = ref(true);

const close = (): void => {
  isVisible.value = false;
};
</script>

<template>
  <div v-if="isVisible" :class="['alert', `alert-${type}`]" role="alert">
    <div v-if="icon" class="alert-icon">{{ icon }}</div>
    <div class="alert-body">
      <strong v-if="title" class="alert-title">{{ title }}</strong>
      <p class="alert-message">{{ message }}</p>
    </div>
    <button
      v-if="dismissible"
      class="alert-close"
      type="button"
      aria-label="Close alert"
      @click="close"
    >
      ✕
    </button>
  </div>
</template>

<style scoped>
.alert {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  font-size: var(--font-sm);
  line-height: var(--line-height-relaxed);
}

.alert-icon {
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.alert-body {
  flex: 1;
  min-width: 0;
}

.alert-title {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.alert-message {
  margin: 0;
}

.alert-close {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  opacity: 0.6;
  font-weight: 700;
  transition: opacity var(--transition-fast);
  line-height: 1;
}

.alert-close:hover {
  opacity: 1;
}

.alert-error {
  background-color: var(--color-down-bg);
  border-color: var(--color-down-border);
  color: var(--color-down);
}

.alert-success {
  background-color: var(--color-ok-bg);
  border-color: var(--color-ok-border);
  color: var(--color-ok);
}

.alert-warning {
  background-color: var(--color-degraded-bg);
  border-color: var(--color-degraded-border);
  color: var(--color-degraded);
}

.alert-info {
  background-color: var(--color-info-bg);
  border-color: var(--color-info-border);
  color: var(--color-info);
}
</style>
```

### 3 — Enhance header and sidebar navigation

**File: `frontend/src/components/AppHeader.vue`** — improve layout and styling

Add responsive layout and improved styling (existing logic remains; update only template layout and styles):

```vue
<template>
  <header class="app-header">
    <div class="header-container">
      <h1 class="header-brand">CRM</h1>
      <div class="header-center">
        <!-- Application title or breadcrumbs can go here -->
      </div>
      <div class="header-right">
        <div v-if="auth.isAuthenticated" class="header-user" data-testid="header-user">
          <div class="user-info">
            <span class="user-name">{{ auth.user?.name }}</span>
            <span class="user-role" data-testid="header-role">{{ auth.user?.roleName }}</span>
          </div>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            data-testid="logout-button"
            @click="onLogout"
          >
            Sign out
          </button>
        </div>
        <span class="status-pill" :data-status="health.status ?? 'unknown'">
          {{ health.status ?? 'Unknown' }}
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  height: var(--header-height);
  background-color: var(--surface-color);
  border-bottom: 1px solid var(--border-color);
  padding: 0 var(--space-4);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: var(--shadow-xs);
}

.header-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-4);
  max-width: 100%;
}

.header-brand {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
  white-space: nowrap;
  min-width: max-content;
}

.header-center {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  justify-content: flex-end;
}

.header-user {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.user-name {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--text-main);
}

.user-role {
  font-size: var(--font-xs);
  color: var(--text-muted);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: var(--radius-full);
  font-size: var(--font-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-wide);
  background-color: var(--slate-100);
  color: var(--slate-600);
  white-space: nowrap;
}

.status-pill::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: currentColor;
}

.status-pill[data-status='ok'] {
  background-color: var(--color-ok-bg);
  color: var(--color-ok);
}

.status-pill[data-status='degraded'] {
  background-color: var(--color-degraded-bg);
  color: var(--color-degraded);
}

.status-pill[data-status='down'] {
  background-color: var(--color-down-bg);
  color: var(--color-down);
}

@media (max-width: 768px) {
  .app-header {
    padding: 0 var(--space-3);
  }

  .header-container {
    gap: var(--space-2);
  }

  .user-info {
    display: none;
  }

  .user-name,
  .user-role {
    display: none;
  }
}
</style>
```

**File: `frontend/src/components/AppSidebar.vue`** — improve navigation styling and responsive behavior

Update the styling for better visual hierarchy and mobile responsiveness (keep the script setup unchanged):

```vue
<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  background-color: var(--surface-color);
  border-right: 1px solid var(--border-color);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xs);
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: var(--space-4);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--font-sm);
  font-weight: 500;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
  border: 1px solid transparent;
  cursor: pointer;
}

.nav-link:hover {
  background-color: var(--surface-sunken);
  color: var(--text-main);
}

.nav-link:focus-visible {
  outline: none;
  border-color: var(--color-primary);
  background-color: var(--color-primary-bg);
}

.nav-link.router-link-active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  border-color: var(--color-primary);
  font-weight: 600;
}

@media (max-width: 768px) {
  .app-sidebar {
    position: fixed;
    left: -100%;
    top: var(--header-height);
    width: 80%;
    max-width: 300px;
    height: calc(100vh - var(--header-height));
    transition: left var(--transition);
    z-index: 50;
  }

  .app-sidebar.open {
    left: 0;
  }
}
</style>
```

### 4 — Add responsive layout utility classes

**File: `frontend/src/style.css`** — add at the end:

```css
/* Responsive breakpoints */
@media (max-width: 640px) {
  .hide-sm {
    display: none;
  }

  .app-layout {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .hide-md {
    display: none;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .show-lg {
    display: block;
  }
}

/* Container queries for responsive components */
@supports (container-type: inline-size) {
  .card {
    container-type: inline-size;
  }

  @container (max-width: 400px) {
    .card-padded {
      padding: var(--space-4);
    }
  }
}

/* Print styles */
@media print {
  .hide-print,
  .app-header,
  .app-sidebar,
  .btn-print {
    display: none;
  }

  body {
    background-color: white;
  }

  .card {
    box-shadow: none;
    break-inside: avoid;
  }
}
```

---

## Edge Cases & Failure Modes

- **Browser does not support CSS custom properties.** Accepted: modern browsers (Chrome 49+, Firefox 31+, Safari 9.1+, Edge 15+) all support it. Fallback is not provided — this is a modern-only app.
- **Dark mode preference when using light color scheme.** `@media (prefers-color-scheme: dark)` is honoured for users with system dark mode enabled; explicit light/dark toggle is **out of scope** for this story.
- **Very long text in buttons/badges causes overflow.** `.text-truncate` and `.text-clamp-2` classes are available; component developers use them when needed. Buttons have `white-space: nowrap` to prevent wrapping.
- **Animations disabled by user.** `@media (prefers-reduced-motion: reduce)` already reduces spinner and skeleton animations to remove motion-sickness concerns.
- **Focus ring outline at edge of viewport.** `outline-offset: 2px` may clip focus rings at viewport edges in some browsers — accepted as a minor accessibility trade-off.
- **Form input with error state and focus.** Error border (1px solid red) may conflict with focus ring. Resolved: focus ring uses box-shadow (3px) which layers over the border.
- **Disabled button still receives keyboard focus.** `pointer-events: none` does not prevent focus; `.btn:disabled` remains keyboard-navigable but visually disabled (`opacity: var(--opacity-disabled)`). Accepted: modern accessible practice.
- **Very long breadcrumb list wraps awkwardly.** Breadcrumbs are horizontal flex; wrapping is CSS-natural but may look odd. Component developer can use `.text-truncate` on long items.
- **Modal backdrop color too dark for some contrast.** `rgba(15, 23, 42, 0.5)` is 50% opacity; adjusted for readability. Can be tweaked per feature if needed.

---

## Test Plan

1. **Create `frontend/src/tests/designTokens.spec.ts`** — no mocks:
   - All CSS custom properties are defined (color, spacing, typography, shadows, radius, transitions).
   - Colour contrast ratios meet WCAG AA for text on `--surface-color` and `--surface-sunken`.
   - No hardcoded hex values appear in components (all use tokens).

2. **Modify `frontend/src/tests/router.spec.ts`** — add assertions:
   - Routes still resolve as before.
   - No new routing logic introduced.

3. **Smoke test: `frontend/src/tests/components.smoke.spec.ts`** — mount each enhanced component:
   - `PageHeader` renders with title, subtitle, breadcrumbs, and actions slot.
   - `EmptyState` renders icon, title, description, and optional action button.
   - `LoadingState` renders spinner, skeleton (rows), and skeleton-table modes.
   - `StatusBadge` renders with all badge types and sizes.
   - `AlertBanner` renders with all alert types, title, message, and close button.
   - `AppHeader` renders brand, user info, and status pill.
   - `AppSidebar` renders nav links and applies `.router-link-active` class.

4. **Visual regression tests** (manual, not automated):
   - Open `http://localhost:5173/` → login as `admin@crm.local` → visual inspection of:
     - Header layout and alignment.
     - Sidebar nav links, hover, and active states.
     - Button styles (primary, secondary, danger, sm, lg) on any form.
     - Alert/badge display on any view.
     - Empty state and loading state appearance.
     - Dark mode toggle in browser dev tools (if enabled).

---

## Verification Steps

1. **Frontend typecheck/build:** from `frontend/`, `npm run build` exits 0 and `npm run typecheck` exits 0.
2. **Tests:** from `frontend/`, `npm test` runs all new and existing tests with no failures.
3. **CSS validation:** No console errors or warnings about undefined CSS variables.
4. **Responsive check:** Open DevTools and test viewport sizes: 360px (mobile), 768px (tablet), 1920px (desktop). Layout does not break.
5. **Accessibility check:**
   - Keyboard navigation: Tab through all interactive elements (buttons, inputs, links) — all reachable.
   - Focus rings: Every interactive element shows a visible focus ring on Tab.
   - Contrast: Use browser devtools accessibility inspector — all text passes WCAG AA.
   - Screen reader: Use NVDA/JAWS to read a page — semantic markup and labels present.
6. **Manual visual inspection:**
   - Login page styled with modern card layout and spacing.
   - Dashboard grid layout clean and spacious.
   - Tables have proper padding, borders, and hover states.
   - Forms have proper labels, input styling, and error states (no visual implementation yet).
   - All buttons consistent in size and styling.
7. **Component demo:** Create a simple demo view listing all enhanced components and states (to be removed before final merge).

---

## Done Criteria

- [ ] `frontend/src/style.css` has been enhanced with extended typography, spacing, radius, shadows, dark mode support, and utility classes. No existing tokens or class names removed; all existing classes still work.
- [ ] All UI components in `frontend/src/components/ui/` are enhanced with improved styling, accessibility, and responsiveness.
- [ ] `AppHeader.vue` and `AppSidebar.vue` are styled with modern CRM aesthetics, responsive mobile layout, and improved navigation.
- [ ] Design system follows WCAG 2.1 AA accessibility guidelines: readable contrast, keyboard navigation, visible focus rings, semantic HTML.
- [ ] All existing views still render without visual regression or broken functionality.
- [ ] `npm run build` and `npm run typecheck` both exit 0.
- [ ] `npm test` passes all tests in the suite.
- [ ] Manual responsive design check passes on mobile (360px), tablet (768px), and desktop (1920px).

