# Story 24 — Core Layout & Navigation UI Improvements (Story: 13)

## Prerequisites

- Story 23 completed: [23-story-internationalization-setup-13.md](23-story-internationalization-setup-13.md). i18n is configured and language switching works.
- Story 22 completed: [22-story-design-system-enhancement-13.md](22-story-design-system-enhancement-13.md). Design tokens and components are available.

---

## Story Goal

Refine the core application layout (header, sidebar, breadcrumbs, page headers), integrate i18n throughout the shell, and improve responsive behavior for mobile and tablet. This ensures a consistent, accessible, modern foundation for all views.

Outcomes:

1. **Improved AppHeader** — modern styling with language switcher, user menu, and status pill.
2. **Enhanced AppSidebar** — improved navigation with better spacing, icons, and responsive mobile drawer.
3. **Breadcrumb navigation** — implemented across views for better navigation context.
4. **Page headers** — consistent heading, subtitle, and action area layout.
5. **Responsive mobile layout** — sidebar drawer on mobile, optimized touch targets.
6. **i18n integration in shell** — all UI labels translated (navigation, headers, buttons).

---

## Context — Read These Files First

1. `frontend/src/components/AppHeader.vue` (52 lines) — existing header; improve styling per Story 22 updates.
2. `frontend/src/components/AppSidebar.vue` (60 lines) — existing sidebar; enhance with icons and i18n.
3. `frontend/src/App.vue` (49 lines) — root layout shell; may need responsive drawer state.
4. `frontend/src/router/index.ts` — all routes and `meta.navLabel` declarations.
5. `frontend/src/style.css` — Story 22 enhancements (shadows, spacing, responsive breakpoints).

---

## Implementation Tasks

### 1 — Enhance AppHeader with i18n and improved layout

**File: `frontend/src/components/AppHeader.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useHealthStore } from '../stores/health';
import LanguageSwitcher from './LanguageSwitcher.vue';

const auth = useAuthStore();
const router = useRouter();
const health = useHealthStore();
const { t } = useI18n();

const onLogout = async (): Promise<void> => {
  await auth.signOut();
  await router.push({ name: 'login' });
};

const userMenuOpen = computed(() => false); // Placeholder for future dropdown
</script>

<template>
  <header class="app-header">
    <div class="header-container">
      <h1 class="header-brand">{{ t('common.appTitle') }}</h1>
      
      <div class="header-right">
        <LanguageSwitcher />
        
        <div v-if="auth.isAuthenticated" class="header-user">
          <div class="user-info">
            <span class="user-name">{{ auth.user?.name }}</span>
            <span class="user-role">{{ auth.user?.roleName }}</span>
          </div>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            @click="onLogout"
          >
            {{ t('common.logout') }}
          </button>
        </div>
        
        <span 
          class="status-pill" 
          :data-status="health.status ?? 'unknown'"
          :title="`System Status: ${health.status}`"
        >
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
  gap: var(--space-6);
}

.header-brand {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--color-primary);
  margin: 0;
  white-space: nowrap;
  min-width: max-content;
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
    gap: var(--space-3);
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

### 2 — Enhance AppSidebar with i18n and icons

**File: `frontend/src/components/AppSidebar.vue`**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const { t } = useI18n();

const navItems = computed(() =>
  router.getRoutes().filter((route) => {
    if (!route.meta.navLabel) return false;
    return !route.meta.permission || auth.can(route.meta.permission);
  })
);

const getNavIcon = (name: string | symbol | null | undefined): string => {
  const iconMap: Record<string, string> = {
    'dashboard': '📊',
    'system-health': '❤️',
    'customers': '👥',
    'tickets': '🎫',
    'communications': '💬',
    'users': '👤',
    'roles': '🔐',
    'knowledge-base': '📚',
    'customer-portal': '🌐',
    'reports': '📈',
    'administration': '⚙️'
  };
  return iconMap[String(name)] || '•';
};
</script>

<template>
  <aside class="app-sidebar">
    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.name as string"
        :to="{ name: item.name }"
        class="nav-link"
      >
        <span class="nav-icon">{{ getNavIcon(item.name) }}</span>
        <span class="nav-label">{{ t(`common.${item.meta.navLabel || item.name}`) || item.meta.navLabel }}</span>
      </RouterLink>
    </nav>
  </aside>
</template>

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

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: var(--space-4);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.8rem;
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

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  font-size: 1rem;
  flex-shrink: 0;
}

.nav-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  .app-sidebar.open {
    left: 0;
  }
}
</style>
```

### 3 — Create Breadcrumb component

**File: `frontend/src/components/Breadcrumbs.vue`** (create)

```vue
<script setup lang="ts">
export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface Props {
  items: Breadcrumb[];
}

defineProps<Props>();
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <li v-for="(item, idx) in items" :key="idx" class="breadcrumb-item">
        <RouterLink v-if="item.href" :to="item.href" class="breadcrumb-link">
          {{ item.label }}
        </RouterLink>
        <span v-else class="breadcrumb-text">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  margin: 0;
  padding: 0;
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
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.breadcrumb-item::after {
  content: '/';
  color: var(--text-subtle);
}

.breadcrumb-item:last-child::after {
  display: none;
}

.breadcrumb-link {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.breadcrumb-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.breadcrumb-text {
  color: var(--text-main);
  font-weight: 500;
}
</style>
```

### 4 — Update App.vue for responsive drawer

**File: `frontend/src/App.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppSidebar from './components/AppSidebar.vue';

const route = useRoute();
const sidebarOpen = ref(false);

const showShell = computed(() => route.meta.public !== true);

const closeSidebar = (): void => {
  sidebarOpen.value = false;
};
</script>

<template>
  <div v-if="showShell" class="app-layout">
    <AppHeader />
    <div class="app-body">
      <AppSidebar :class="{ open: sidebarOpen }" />
      <main class="main-content" @click="closeSidebar">
        <RouterView />
      </main>
    </div>
  </div>
  <RouterView v-else @click="closeSidebar" />
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: var(--surface-sunken);
}

.app-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
}

@media (max-width: 768px) {
  .main-content {
    padding: var(--space-4);
  }
}
</style>
```

### 5 — Add i18n to router navigation labels

**File: `frontend/src/locales/en/navigation.json`** (create)

```json
{
  "dashboard": "Dashboard",
  "systemHealth": "System Health",
  "customers": "Customers",
  "tickets": "Tickets",
  "communications": "Communications",
  "users": "Users",
  "roles": "Roles & Permissions",
  "knowledgeBase": "Knowledge Base",
  "administration": "Administration",
  "reports": "Reports"
}
```

**File: `frontend/src/locales/ar/navigation.json`** (create)

```json
{
  "dashboard": "لوحة التحكم",
  "systemHealth": "صحة النظام",
  "customers": "العملاء",
  "tickets": "التذاكر",
  "communications": "الاتصالات",
  "users": "المستخدمون",
  "roles": "الأدوار والصلاحيات",
  "knowledgeBase": "قاعدة المعرفة",
  "administration": "الإدارة",
  "reports": "التقارير"
}
```

---

## Edge Cases & Failure Modes

- **Navigation label missing i18n key.** Fallback to untranslated English label; developers must add i18n keys for new routes.
- **Sidebar too narrow on desktop.** `--sidebar-width: 232px` is a standard width; can be adjusted in design tokens if needed.
- **Mobile sidebar blocks content when open.** Fixed position sidebar overlay is intentional; click outside closes it (`@click="closeSidebar"` on main-content).
- **Breadcrumb URL missing.** Last breadcrumb renders as text (not a link); correct behavior for current page.
- **Header language switcher and logo conflict on very small screens.** Logo may need to be hidden on screens < 360px; can be added as future optimization.

---

## Test Plan

1. **Create `frontend/src/tests/AppHeader.spec.ts`** (mount with setActivePinia, useRouter stub):
   - Language switcher renders and is clickable.
   - Logout button calls `auth.signOut()`.
   - User info displays when authenticated.

2. **Create `frontend/src/tests/AppSidebar.spec.ts`** (mount with real router or stubs):
   - Nav links render per permission.
   - Active link has `.router-link-active` class.
   - Icons render per route name.

3. **Create `frontend/src/tests/Breadcrumbs.spec.ts`**:
   - Renders items with RouterLink or text.
   - Last item renders without `/` separator.

4. **Manual responsive test:**
   - Desktop (1920px): sidebar visible, header full width.
   - Tablet (768px): sidebar responsive drawer.
   - Mobile (360px): header compact, sidebar drawer.

---

## Verification Steps

1. **Build:** `npm run build` exits 0.
2. **Tests:** `npm test` passes AppHeader, AppSidebar, Breadcrumbs tests.
3. **Dev server:** `npm run dev` starts; app loads with improved header/sidebar layout.
4. **i18n labels:** Navigation labels translate when language changes.
5. **Responsive:** Resize browser; layout adapts correctly at 640px, 768px, 1024px breakpoints.

---

## Done Criteria

- [ ] AppHeader displays user info, logout button, language switcher, and status pill with improved styling.
- [ ] AppSidebar renders navigation with icons, i18n labels, and active state highlighting.
- [ ] Breadcrumbs component is created and can be integrated into views.
- [ ] Responsive mobile drawer (sidebar hidden, toggleable).
- [ ] All navigation labels are i18n-translated.
- [ ] `npm run build` and `npm run typecheck` both exit 0.
- [ ] Manual testing shows improved header/sidebar layout and responsive behavior.

