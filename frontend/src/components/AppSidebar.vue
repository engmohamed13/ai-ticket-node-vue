<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import LanguageSwitcher from './LanguageSwitcher.vue';

withDefaults(defineProps<{ open?: boolean }>(), { open: false });

const auth = useAuthStore();
const router = useRouter();
const { t, te } = useI18n();

/** Every route that declares a `navLabel`, minus the ones this user cannot enter. */
const navItems = computed(() =>
  router.getRoutes().filter((route) => {
    if (!route.meta.navLabel) return false;
    // Customer-portal routes are role-gated, not permission-gated: staff hold `tickets:read`
    // as well, so the permission check alone would list "My Tickets" for agents too.
    if (route.meta.customerOnly && auth.user?.roleKey !== 'CUSTOMER') return false;
    return !route.meta.permission || auth.can(route.meta.permission);
  })
);

/**
 * Nav labels are keyed by route name under `nav.*`. The route's own `meta.navLabel`
 * stays the fallback, so adding a route without a translation shows English rather
 * than a raw key — and `src/tests/i18n.spec.ts` catches the missing key.
 */
const navLabel = (name: string, fallback: string): string =>
  te(`nav.${name}`) ? t(`nav.${name}`) : fallback;

/** Small set of route-name → icon paths, purely decorative (aria-hidden). */
const ICONS: Record<string, string> = {
  dashboard: 'M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z',
  'system-health': 'M22 12h-4l-3 9-6-18-3 9H2',
  communications: 'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  tickets: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 000-4V7zM10 5v14',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  roles: 'M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z',
  portal: 'M4 7a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 000-4V7zM10 5v14',
  kb: 'M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z',
  'management-dashboard': 'M18 20V10M12 20V4M6 20v-6'
};
</script>

<template>
  <aside class="app-sidebar" :class="{ 'is-open': open }">
    <nav data-testid="sidebar-nav" :aria-label="t('common.a11y.primaryNav')">
      <RouterLink
        v-for="item in navItems"
        :key="item.name as string"
        :to="{ name: item.name }"
        class="nav-link"
        data-testid="sidebar-link"
      >
        <svg
          v-if="ICONS[item.name as string]"
          class="nav-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path :d="ICONS[item.name as string]" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
        <span>{{ navLabel(item.name as string, item.meta.navLabel as string) }}</span>
      </RouterLink>
    </nav>
    <!-- On narrow screens the header hides its language toggle, so the drawer carries one. -->
    <div class="sidebar-footer">
      <LanguageSwitcher />
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background-color: var(--surface-color);
  /* Logical property: becomes the left edge in RTL without a second rule. */
  border-inline-end: 1px solid var(--border-color);
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.sidebar-footer {
  display: none;
  margin-top: auto;
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-color);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--font-sm);
  font-weight: 500;
  border-inline-end: 3px solid transparent;
  transition:
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.nav-icon {
  flex-shrink: 0;
  color: var(--text-subtle);
  transition: color var(--transition-fast);
}

.nav-link:hover {
  background-color: var(--surface-sunken);
  color: var(--text-main);
}

.nav-link.router-link-active {
  background-color: var(--color-primary-bg);
  color: var(--color-primary);
  font-weight: 600;
  border-inline-end-color: var(--color-primary);
}

.nav-link.router-link-active .nav-icon {
  color: var(--color-primary);
}

@media (max-width: 900px) {
  .app-sidebar {
    position: fixed;
    top: var(--header-height);
    bottom: 0;
    /* Anchored to the inline start edge: left in LTR, right in RTL. */
    inset-inline-start: 0;
    z-index: 35;
    width: 260px;
    box-shadow: var(--shadow-lg);
    /* Slides out towards the start edge; the sign flips with the writing mode so the
       drawer leaves the screen in the correct direction under RTL too. */
    transform: translateX(calc(-100% * var(--dir, 1)));
    transition: transform var(--transition);
    overflow-y: auto;
  }

  .app-sidebar.is-open {
    transform: translateX(0);
  }
}

/* The header hides its own language toggle at this width, so the drawer carries one.
   Kept in step with the `.header-language` breakpoint in AppHeader.vue — widening one
   without the other puts two switchers on screen at once. */
@media (max-width: 560px) {
  .sidebar-footer {
    display: block;
  }
}
</style>
