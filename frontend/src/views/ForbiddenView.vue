<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const { t } = useI18n();

const roleName = computed(() => auth.user?.roleName ?? t('auth.forbidden.unknownRole'));
</script>

<template>
  <section class="state-page" data-testid="forbidden-view">
    <div class="state-card card card-padded">
      <svg class="state-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      <h2>{{ t('auth.forbidden.title') }}</h2>
      <!-- One translatable sentence with the role as a slot, so Arabic can put the
           role wherever its grammar needs it rather than mid-string. -->
      <i18n-t keypath="auth.forbidden.description" tag="p" class="lead" scope="global">
        <template #role>
          <strong>{{ roleName }}</strong>
        </template>
      </i18n-t>
      <RouterLink :to="{ name: 'dashboard' }" class="btn btn-primary">
        {{ t('auth.forbidden.backToDashboard') }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.state-page {
  display: flex;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  max-width: 460px;
}

.state-icon {
  width: 2.5rem;
  height: 2.5rem;
  color: var(--color-down-solid);
  margin-bottom: var(--space-1);
}

.lead {
  color: var(--text-muted);
  line-height: 1.6;
  font-size: var(--font-sm);
}
</style>
