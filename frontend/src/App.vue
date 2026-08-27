<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import AppHeader from './components/AppHeader.vue';
import AppSidebar from './components/AppSidebar.vue';
import NotificationToasts from './components/NotificationToasts.vue';
import { useAuthStore } from './stores/auth';
import { useNotificationsStore } from './stores/notifications';

const route = useRoute();
const auth = useAuthStore();
const notifications = useNotificationsStore();
const { t } = useI18n();
const showShell = computed(() => route.meta.public !== true);

/**
 * The notification inbox is polled for as long as there is a session, and only then — the
 * login screen must not fire authenticated requests. Signing out clears the previous user's
 * inbox so nothing leaks into the next session on a shared machine.
 */
watch(
  () => auth.isAuthenticated,
  (signedIn) => {
    if (signedIn) void notifications.startPolling();
    else notifications.clear();
  },
  { immediate: true }
);

onUnmounted(() => notifications.stopPolling());

// Mobile nav drawer state — purely presentational, lives here so the toggle
// button in AppHeader and the drawer in AppSidebar share one source of truth.
const navOpen = ref(false);
watch(
  () => route.fullPath,
  () => {
    navOpen.value = false;
  }
);
</script>

<template>
  <a href="#main-content" class="skip-link">{{ t('common.a11y.skipToContent') }}</a>
  <div v-if="showShell" class="app-layout">
    <AppHeader @toggle-nav="navOpen = !navOpen" />
    <div class="app-body">
      <AppSidebar :open="navOpen" />
      <div v-if="navOpen" class="nav-backdrop" @click="navOpen = false"></div>
      <main id="main-content" class="main-content" tabindex="-1">
        <RouterView />
      </main>
    </div>
    <NotificationToasts />
  </div>
  <RouterView v-else />
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-sunken);
}

.app-body {
  display: flex;
  flex: 1;
  position: relative;
}

.main-content {
  flex: 1;
  min-width: 0;
  padding: var(--space-6) var(--space-8);
  max-width: 1360px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;
}

.main-content:focus-visible {
  outline: none;
}

.nav-backdrop {
  display: none;
}

@media (max-width: 900px) {
  .main-content {
    padding: var(--space-4) var(--space-4) var(--space-8);
  }

  .nav-backdrop {
    display: block;
    position: fixed;
    inset: var(--header-height) 0 0 0;
    background-color: rgba(15, 23, 42, 0.4);
    z-index: 30;
  }
}
</style>
