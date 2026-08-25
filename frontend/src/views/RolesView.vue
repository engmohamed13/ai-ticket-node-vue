<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useUsersStore } from '../stores/users';
import type { Permission } from '../types';

const store = useUsersStore();
const auth = useAuthStore();

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
  <section>
    <h2>Roles &amp; Permissions</h2>

    <div v-if="store.error" class="panel panel-error" data-testid="roles-error">{{ store.error }}</div>
    <div v-if="store.notice" class="panel panel-notice" data-testid="roles-notice">{{ store.notice }}</div>
    <p v-if="store.loading" data-testid="roles-loading">Loading roles…</p>

    <div class="role-cards">
      <div v-for="role in store.roles" :key="role.id" class="role-card" data-testid="role-card">
        <h3>{{ role.name }} <code>{{ role.key }}</code></h3>

        <p v-if="role.key === 'SYSTEM_ADMINISTRATOR'" class="admin-warning" data-testid="admin-role-warning">
          The System Administrator role must keep Users manage and Roles manage.
        </p>

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

        <button
          v-if="canManage"
          class="btn btn-primary"
          type="button"
          data-testid="save-role-button"
          @click="onSave(role.id)"
        >
          Save
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.panel {
  padding: 1rem 1.25rem;
  border-radius: 8px;
}

.panel-error {
  background-color: var(--color-down-bg);
  color: var(--color-down);
}

.panel-notice {
  background-color: var(--color-ok-bg);
  color: var(--color-ok);
}

.role-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.role-card {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.role-card h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.role-card code {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 400;
}

.admin-warning {
  background-color: var(--color-degraded-bg, #fef3c7);
  color: var(--color-degraded, #92400e);
  padding: 0.6rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin: 0;
}

.permission-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 0.5rem;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.role-card button {
  align-self: flex-start;
}
</style>
