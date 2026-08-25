<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useUsersStore } from '../stores/users';

const store = useUsersStore();
const auth = useAuthStore();

onMounted(() => {
  void store.loadDirectory();
});

const name = ref('');
const email = ref('');
const password = ref('');
const roleId = ref('');
const branchId = ref('');
const departmentId = ref('');
const customerId = ref('');

const passwordDrafts = ref<Record<number, string>>({});

const canManage = computed(() => auth.can('users:manage'));

const departmentsForBranch = computed(() =>
  branchId.value === ''
    ? store.departments
    : store.departments.filter((department) => department.branchId === Number(branchId.value))
);

const selectedRoleKey = computed(
  () => store.roles.find((role) => role.id === Number(roleId.value))?.key
);
const requiresCustomer = computed(() => selectedRoleKey.value === 'CUSTOMER');

const onCreate = async (): Promise<void> => {
  if (name.value.trim().length === 0 || email.value.trim().length === 0 || password.value.length === 0) return;
  if (roleId.value === '') return;

  const created = await store.submitUser({
    name: name.value.trim(),
    email: email.value.trim(),
    password: password.value,
    roleId: Number(roleId.value),
    departmentId: departmentId.value === '' ? undefined : Number(departmentId.value),
    branchId: branchId.value === '' ? undefined : Number(branchId.value),
    customerId: customerId.value === '' ? undefined : Number(customerId.value)
  });

  if (created) {
    name.value = '';
    email.value = '';
    password.value = '';
  }
};

const onResetPassword = async (userId: number): Promise<void> => {
  const draft = passwordDrafts.value[userId];
  if (!draft || draft.length < 8) return;
  const success = await store.resetPassword(userId, draft);
  if (success) {
    delete passwordDrafts.value[userId];
  }
};

const onDeactivate = async (userId: number): Promise<void> => {
  await store.deactivate(userId);
};
</script>

<template>
  <section>
    <h2>Users</h2>

    <div v-if="store.error" class="panel panel-error" data-testid="users-error">{{ store.error }}</div>
    <div v-if="store.notice" class="panel panel-notice" data-testid="users-notice">{{ store.notice }}</div>
    <p v-if="store.loading" data-testid="users-loading">Loading users…</p>

    <form v-if="canManage" class="create-form" data-testid="create-user-form" @submit.prevent="onCreate">
      <h3>Create user</h3>
      <div class="form-row">
        <label for="user-name">Name</label>
        <input id="user-name" v-model="name" data-testid="user-name-input" type="text" required />
      </div>
      <div class="form-row">
        <label for="user-email">Email</label>
        <input id="user-email" v-model="email" data-testid="user-email-input" type="email" required />
      </div>
      <div class="form-row">
        <label for="user-password">Password</label>
        <input id="user-password" v-model="password" data-testid="user-password-input" type="password" required />
      </div>
      <div class="form-row">
        <label for="user-role">Role</label>
        <select id="user-role" v-model="roleId" data-testid="user-role-select">
          <option value="">Select a role…</option>
          <option v-for="role in store.roles" :key="role.id" :value="role.id">{{ role.name }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="user-branch">Branch</label>
        <select id="user-branch" v-model="branchId" data-testid="user-branch-select">
          <option value="">No branch</option>
          <option v-for="branch in store.branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
        </select>
      </div>
      <div class="form-row">
        <label for="user-department">Department</label>
        <select id="user-department" v-model="departmentId" data-testid="user-department-select">
          <option value="">No department</option>
          <option v-for="department in departmentsForBranch" :key="department.id" :value="department.id">
            {{ department.name }}
          </option>
        </select>
      </div>
      <div v-if="requiresCustomer" class="form-row">
        <label for="user-customer">Customer ID</label>
        <input id="user-customer" v-model="customerId" data-testid="user-customer-input" type="number" />
      </div>
      <button class="btn btn-primary" type="submit" data-testid="create-user-submit">Create user</button>
    </form>
    <p v-else class="hint" data-testid="users-readonly-hint">You have read-only access to the user directory.</p>

    <div class="table-wrapper">
      <table data-testid="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Branch</th>
            <th>Department</th>
            <th>Status</th>
            <th v-if="canManage">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in store.users" :key="user.id" data-testid="user-row">
            <td>{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.roleName }}</td>
            <td>{{ user.branch?.name ?? '—' }}</td>
            <td>{{ user.department?.name ?? '—' }}</td>
            <td data-testid="user-status">{{ user.isActive ? 'Active' : 'Inactive' }}</td>
            <td v-if="canManage" class="actions-cell">
              <input
                v-model="passwordDrafts[user.id]"
                data-testid="reset-password-input"
                type="password"
                placeholder="New password"
              />
              <button
                class="btn btn-primary"
                type="button"
                data-testid="reset-password-button"
                @click="onResetPassword(user.id)"
              >
                Reset password
              </button>
              <button
                class="btn btn-primary"
                type="button"
                data-testid="deactivate-button"
                :disabled="!user.isActive || user.id === auth.user?.id"
                @click="onDeactivate(user.id)"
              >
                Deactivate
              </button>
            </td>
          </tr>
        </tbody>
      </table>
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

.hint {
  color: var(--text-muted);
}

.create-form {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.5rem;
}

.table-wrapper {
  background-color: var(--surface-color);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1.25rem;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  color: var(--text-muted);
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.actions-cell input {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-family: inherit;
  width: 140px;
}
</style>
