<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import AppHeader from './components/AppHeader.vue';
import AppSidebar from './components/AppSidebar.vue';

const route = useRoute();
const showShell = computed(() => route.meta.public !== true);
</script>

<template>
  <div v-if="showShell" class="app-layout">
    <AppHeader />
    <div class="app-body">
      <AppSidebar />
      <main class="main-content">
        <RouterView />
      </main>
    </div>
  </div>
  <RouterView v-else />
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

@media (max-width: 768px) {
  .app-body {
    flex-direction: column;
  }

  .main-content {
    padding: 1rem;
  }
}
</style>
