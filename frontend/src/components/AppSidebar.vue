<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();

/** Every route that declares a `navLabel`, minus the ones this user cannot enter. */
const navItems = computed(() =>
  router.getRoutes().filter((route) => {
    if (!route.meta.navLabel) return false;
    return !route.meta.permission || auth.can(route.meta.permission);
  })
);
</script>

<template>
  <aside class="app-sidebar">
    <nav data-testid="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.name as string"
        :to="{ name: item.name }"
        class="nav-link"
        data-testid="sidebar-link"
      >
        {{ item.meta.navLabel }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.app-sidebar {
  width: 220px;
  flex-shrink: 0;
  background-color: #ffffff;
  border-right: 1px solid #e2e8f0;
  padding: 1.5rem 0;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.6rem 1.5rem;
  color: #475569;
  text-decoration: none;
  font-size: 0.95rem;
}

.nav-link:hover {
  background-color: #f1f5f9;
}

.nav-link.router-link-active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 600;
  border-right: 3px solid #2563eb;
}

@media (max-width: 768px) {
  .app-sidebar {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid #e2e8f0;
  }

  nav {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0 1rem;
  }
}
</style>
