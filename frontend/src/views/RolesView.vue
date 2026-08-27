<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/auth';
import { useUsersStore } from '../stores/users';
import type { Permission } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';

const store = useUsersStore();
const auth = useAuthStore();
const { t } = useI18n();

const canManage = computed(() => auth.can('roles:manage'));

onMounted(() => {
  void store.loadRoleMatrix();
});

const drafts = ref<Record<number, Permission[]>>({});

watch(
  () => store.roles,
  (roles) => {
    for (const role of roles) {
      drafts.value[role.id] = [...role.permissions];
    }
  },
  { immediate: true }
);

const isChecked = (roleId: number, key: Permission): boolean => (drafts.value[roleId] ?? []).includes(key);

const toggle = (roleId: number, key: Permission): void => {
  const current = drafts.value[roleId] ?? [];
  drafts.value[roleId] = current.includes(key)
    ? current.filter((entry) => entry !== key)
    : [...current, key];
};

const onSave = async (roleId: number): Promise<void> => {
  await store.saveRolePermissions(roleId, drafts.value[roleId] ?? []);
};
</script>

<template>
  <section class="view">
    <PageHeader :title="t('admin.roles.title')" :subtitle="t('admin.roles.subtitle')" />

    <AlertBanner v-if="store.error" variant="error" data-testid="roles-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="roles-notice">{{ store.notice }}</AlertBanner>
    <LoadingState v-if="store.loading" data-testid="roles-loading">{{ t('admin.roles.loading') }}</LoadingState>

    <div class="role-cards">
      <div v-for="role in store.roles" :key="role.id" class="card role-card" data-testid="role-card">
        <div class="card-header role-card-header">
          <div>
            <h3 class="card-title">{{ role.name }}</h3>
            <code>{{ role.key }}</code>
          </div>
          <button
            v-if="canManage"
            class="btn btn-primary btn-sm"
            type="button"
            data-testid="save-role-button"
            @click="onSave(role.id)"
          >
            {{ t('common.actions.save') }}
          </button>
        </div>

        <div class="card-padded role-card-body">
          <AlertBanner v-if="role.key === 'SYSTEM_ADMINISTRATOR'" variant="warning" data-testid="admin-role-warning">
            {{ t('admin.roles.adminWarning') }}
          </AlertBanner>

          <div class="permission-list">
            <label v-for="permission in store.permissions" :key="permission.id" class="permission-item">
              <input
                type="checkbox"
                data-testid="permission-checkbox"
                :value="permission.key"
                :checked="isChecked(role.id, permission.key)"
                :disabled="!canManage"
                @change="toggle(role.id, permission.key)"
              />
              {{ permission.description }}
            </label>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.role-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.role-card-header {
  gap: var(--space-3);
}

.role-card-header code {
  font-size: var(--font-xs);
  color: var(--text-muted);
  font-weight: 400;
  background: none;
  padding: 0;
}

.role-card-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.permission-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.6rem 1rem;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: var(--font-sm);
  font-weight: 400;
  color: var(--text-main);
  cursor: pointer;
}

.permission-item input {
  width: auto;
  margin-top: 0.15rem;
  accent-color: var(--color-primary);
}
</style>
