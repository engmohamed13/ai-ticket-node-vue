# Story 25 — Views & Screens UI Refinement (Story: 13)

## Prerequisites

- Story 24 completed: [24-story-core-layout-improvements-13.md](24-story-core-layout-improvements-13.md). Core layout and i18n are integrated.
- Story 23 completed: [23-story-internationalization-setup-13.md](23-story-internationalization-setup-13.md). i18n translations exist.
- Story 22 completed: [22-story-design-system-enhancement-13.md](22-story-design-system-enhancement-13.md). Design system tokens available.

---

## Story Goal

Apply the modern design system and i18n to all existing views and screens. Improve layouts, spacing, typography, form styling, table presentation, and state handling (loading, empty, error) across the entire application.

Outcomes:

1. **Dashboard view** — improved layout with cards, stats, and visual hierarchy.
2. **Customers view** — consistent table styling, improved form, empty state.
3. **Tickets view** — modern ticket listing with filters, improved detail view.
4. **Communications view** — refined timeline and interaction creation.
5. **Knowledge Base views** — improved article listing and editing.
6. **User/Admin views** — polished user management and role permission editor.
7. **All views translated** — UI labels in English and Arabic.

---

## Context — Read These Files First

1. `frontend/src/views/` — list all 18 view files; this story refines each.
2. `frontend/src/style.css` — design tokens from Story 22.
3. `frontend/src/locales/` — translation structure from Story 23.
4. Existing views: SystemHealthView.vue, CommunicationsView.vue, CustomersView.vue, TicketsView.vue, DashboardView.vue, etc.

---

## Implementation Tasks

### High-level approach for each view:

**1. Dashboard View improvements:**
- Add `.page-header` with title and subtitle
- Replace hard-coded content with dashboard cards using `.card` class
- Add stats tiles with consistent styling
- Improve spacing with design tokens
- Add i18n labels for sections

**2. Customers View improvements:**
- Add page header with "Create Customer" action button
- Replace table with improved `.table-wrapper` styling
- Add filters and search UI (non-functional for now)
- Add empty state component
- Add loading and error states

**3. Tickets View improvements:**
- Add page header with breadcrumbs and "Create Ticket" button
- Improve table with status badges and priority indicators
- Add filter controls
- Enhance detail view with better form styling

**4. Communications View improvements:**
- Keep timeline functionality
- Improve form styling for interaction creation
- Add loading and error state components
- Ensure accessibility (labels, focus management)

**5. Knowledge Base improvements:**
- Improve article list layout
- Add category filters UI
- Enhance article editor form styling
- Add search functionality UI

**6. Users/Roles/Admin views:**
- Apply improved form styling
- Add better state management UI
- Ensure permission checks render correctly
- Improve table layouts

### General pattern for all views:

```vue
<script setup lang="ts">
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '../components/PageHeader.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';

const { t } = useI18n();
const store = useMyStore(); // e.g., useCustomersStore()

onMounted(() => {
  store.loadData();
});
</script>

<template>
  <div class="view">
    <PageHeader :title="t('module.title')" :subtitle="t('module.subtitle')">
      <template #actions>
        <button class="btn btn-primary">{{ t('common.create') }}</button>
      </template>
    </PageHeader>

    <AlertBanner 
      v-if="store.error" 
      type="error" 
      :message="store.error"
    />

    <LoadingState v-if="store.loading" />
    
    <EmptyState 
      v-else-if="!store.data.length"
      :title="t('common.noData')"
      :icon="'📭'"
    />

    <div v-else class="table-wrapper">
      <!-- Table content -->
    </div>
  </div>
</template>

<style scoped>
.view {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}
</style>
```

### Example view updates (DashboardView, CustomersView, TicketsView):

For each existing view, apply:
1. Add i18n usage with `useI18n()` and `t()` calls
2. Wrap in `.view` class with proper gap
3. Use PageHeader component at top
4. Wrap data displays in `.card` class
5. Add EmptyState and LoadingState components
6. Use AlertBanner for errors
7. Update form inputs with improved styling (padding, borders)
8. Use utility classes (`.gap-4`, `.mt-6`, etc.)
9. Ensure focus management and keyboard navigation

### Key updates per major view:

**DashboardView:**
- Grid layout of stat cards
- Recent activity list
- System status section
- i18n labels for all sections

**CustomersView:**
- Improved customer table
- Search/filter controls
- Create customer form or modal
- Customer detail card

**TicketsView:**
- Ticket list with status badges
- Filter sidebar or controls
- Create ticket form
- Ticket detail with timeline

**CommunicationsView:**
- Keep existing timeline
- Improve form for new interaction
- Better empty state
- i18n labels

**UsersView / RolesView:**
- Apply new form styling
- Improve table layout
- Better permission checkboxes
- Consistent empty states

---

## Edge Cases & Failure Modes

- **View renders before translation loads.** i18n is async in Story 23; fallback to English keys shows until translations load.
- **Form validation errors not styled.** Form errors must use `.form-field-error` class added in Story 22.
- **Empty state icon renders as emoji.** Emoji support is expected; alternative SVG icons can be added later.
- **Table too wide on mobile.** Horizontal scroll is acceptable; `overflow-x: auto` on `.table-wrapper` handles it.

---

## Test Plan

1. **Create `frontend/src/tests/views.smoke.spec.ts`** — mount each view:
   - Dashboard loads and renders without errors.
   - Customers/Tickets views render tables.
   - Forms render with proper labels.
   - EmptyState and LoadingState components display correctly.

2. **Manual visual inspection:**
   - All views have consistent spacing and typography.
   - i18n labels display correctly.
   - Buttons and forms styled per design system.

---

## Verification Steps

1. **Build:** `npm run build` exits 0.
2. **Tests:** `npm test` passes views smoke tests.
3. **Dev server:** `npm run dev` starts.
4. **Visual check:** Each major view (Dashboard, Customers, Tickets, Communications) looks modern and consistent.
5. **i18n:** Switch language; UI labels update in all views.
6. **Responsive:** Resize browser; layouts adapt correctly.

---

## Done Criteria

- [ ] All existing views apply the design system tokens and components.
- [ ] PageHeader, EmptyState, LoadingState, AlertBanner components used throughout views.
- [ ] All visible text is i18n-translated (English and Arabic).
- [ ] Forms styled with improved inputs, labels, and validation states.
- [ ] Tables styled with consistent padding, borders, hover states.
- [ ] Empty states render for views with no data.
- [ ] Loading and error states display correctly.
- [ ] Responsive behavior works on desktop, tablet, mobile.
- [ ] `npm run build` and `npm run typecheck` both exit 0.
- [ ] `npm test` passes all view smoke tests.

