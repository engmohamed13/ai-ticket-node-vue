<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router';
import { computed } from 'vue';
import AppHeader from './components/AppHeader.vue';
import AppSidebar from './components/AppSidebar.vue';

const route = useRoute();

const isAuthenticated = computed(() => {
  return route.meta.requiresAuth === true;
});
</script>

<template>
  <div class="app-layout">
    <AppHeader v-if="isAuthenticated" />
    <div v-if="isAuthenticated" class="app-body">
      <AppSidebar />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
    <main v-else class="auth-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
}

.app-body {
  display: flex;
  flex: 1;
}

.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1280px;
  width: 100%;
  box-sizing: border-box;
}

.auth-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

@media (max-width: 768px) {
  .app-body {
    flex-direction: column;
  }

  .main-content {
    padding: 1rem;
  }
}
</style>
