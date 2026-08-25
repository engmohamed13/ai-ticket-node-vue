<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useUsersStore } from '../stores/users';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

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
const isEmpty = computed(() => !store.loading && store.users.length === 0);

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
  <section class="view">
    <PageHeader title="Users" subtitle="The user directory, roles, and org assignments." />

    <AlertBanner v-if="store.error" variant="error" data-testid="users-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="users-notice">{{ store.notice }}</AlertBanner>

    <div v-if="canManage" class="card">
      <div class="card-header">
        <h3 class="card-title">Create user</h3>
      </div>
      <form class="card-padded" data-testid="create-user-form" @submit.prevent="onCreate">
        <div class="form-grid">
          <div class="form-field">
            <label for="user-name">Name</label>
            <input id="user-name" v-model="name" data-testid="user-name-input" type="text" required />
          </div>
          <div class="form-field">
            <label for="user-email">Email</label>
            <input id="user-email" v-model="email" data-testid="user-email-input" type="email" required />
          </div>
          <div class="form-field">
            <label for="user-password">Password</label>
            <input id="user-password" v-model="password" data-testid="user-password-input" type="password" required />
          </div>
          <div class="form-field">
            <label for="user-role">Role</label>
            <select id="user-role" v-model="roleId" data-testid="user-role-select">
              <option value="">Select a role…</option>
              <option v-for="role in store.roles" :key="role.id" :value="role.id">{{ role.name }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="user-branch">Branch</label>
            <select id="user-branch" v-model="branchId" data-testid="user-branch-select">
              <option value="">No branch</option>
              <option v-for="branch in store.branches" :key="branch.id" :value="branch.id">{{ branch.name }}</option>
            </select>
          </div>
          <div class="form-field">
            <label for="user-department">Department</label>
            <select id="user-department" v-model="departmentId" data-testid="user-department-select">
              <option value="">No department</option>
              <option v-for="department in departmentsForBranch" :key="department.id" :value="department.id">
                {{ department.name }}
              </option>
            </select>
          </div>
          <div v-if="requiresCustomer" class="form-field">
            <label for="user-customer">Customer ID</label>
            <input id="user-customer" v-model="customerId" data-testid="user-customer-input" type="number" />
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" data-testid="create-user-submit">Create user</button>
        </div>
      </form>
    </div>
    <AlertBanner v-else variant="info" data-testid="users-readonly-hint">You have read-only access to the user directory.</AlertBanner>

    <LoadingState v-if="store.loading" data-testid="users-loading">Loading users…</LoadingState>

    <EmptyState
      v-else-if="isEmpty"
      title="No users yet"
      description="Users created by an administrator will show up here."
    />

    <div v-else class="table-wrapper">
      <table data-testid="users-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Role</th>
            <th scope="col">Branch</th>
            <th scope="col">Department</th>
            <th scope="col">Status</th>
            <th v-if="canManage" scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in store.users" :key="user.id" data-testid="user-row">
            <td class="cell-strong">{{ user.name }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.roleName }}</td>
            <td>{{ user.branch?.name ?? '—' }}</td>
            <td>{{ user.department?.name ?? '—' }}</td>
            <td data-testid="user-status">
              <StatusBadge :variant="user.isActive ? 'success' : 'neutral'">{{ user.isActive ? 'Active' : 'Inactive' }}</StatusBadge>
            </td>
            <td v-if="canManage" class="actions-cell">
              <input
                v-model="passwordDrafts[user.id]"
                data-testid="reset-password-input"
                type="password"
                placeholder="New password"
                aria-label="New password"
              />
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                data-testid="reset-password-button"
                @click="onResetPassword(user.id)"
              >
                Reset
              </button>
              <button
                class="btn btn-danger btn-sm"
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
.cell-strong {
  font-weight: 600;
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.actions-cell input {
  padding: 0.4rem 0.6rem;
  width: 140px;
}
</style>
