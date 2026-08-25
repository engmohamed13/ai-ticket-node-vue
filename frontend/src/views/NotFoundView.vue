<script setup lang="ts">
</script>

<template>
  <section>
    <h2>Page not found</h2>
    <RouterLink :to="{ name: 'dashboard' }">Go back home</RouterLink>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
