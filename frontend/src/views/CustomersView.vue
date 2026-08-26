<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useCustomersStore } from '../stores/customers';
import { CUSTOMER_STATUSES } from '../types';
import type { CustomerStatus } from '../types';
import PageHeader from '../components/ui/PageHeader.vue';
import AlertBanner from '../components/ui/AlertBanner.vue';
import LoadingState from '../components/ui/LoadingState.vue';
import EmptyState from '../components/ui/EmptyState.vue';
import StatusBadge from '../components/ui/StatusBadge.vue';

const store = useCustomersStore();
const auth = useAuthStore();

const canManage = computed(() => auth.can('customers:manage'));

const searchInput = ref('');
const statusFilter = ref<CustomerStatus | ''>('');

const name = ref('');
const email = ref('');
const phone = ref('');
const company = ref('');
const address = ref('');
const city = ref('');
const country = ref('');
const status = ref<CustomerStatus>('ACTIVE');

const isEmpty = computed(() => !store.loading && !store.hasCustomers);

const statusVariant = (value: CustomerStatus): 'success' | 'neutral' | 'primary' | 'warning' => {
  switch (value) {
    case 'ACTIVE':
      return 'success';
    case 'PROSPECT':
      return 'primary';
    case 'INACTIVE':
      return 'neutral';
    case 'ARCHIVED':
      return 'warning';
  }
};

onMounted(() => {
  void store.loadCustomers();
});

const onSearch = async (): Promise<void> => {
  await store.loadCustomers({
    search: searchInput.value.trim() === '' ? undefined : searchInput.value.trim(),
    status: statusFilter.value === '' ? undefined : statusFilter.value
  });
};

const onCreate = async (): Promise<void> => {
  if (name.value.trim().length === 0 || email.value.trim().length === 0) return;

  const created = await store.submitCustomer({
    name: name.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim() === '' ? undefined : phone.value.trim(),
    company: company.value.trim() === '' ? undefined : company.value.trim(),
    address: address.value.trim() === '' ? undefined : address.value.trim(),
    city: city.value.trim() === '' ? undefined : city.value.trim(),
    country: country.value.trim() === '' ? undefined : country.value.trim(),
    status: status.value
  });

  if (created) {
    name.value = '';
    email.value = '';
    phone.value = '';
    company.value = '';
    address.value = '';
    city.value = '';
    country.value = '';
    status.value = 'ACTIVE';
  }
};
</script>

<template>
  <section class="view">
    <PageHeader title="Customers" subtitle="The customer directory, contact details, and status." />

    <AlertBanner v-if="store.error" variant="error" data-testid="customers-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="customers-notice">{{ store.notice }}</AlertBanner>

    <div class="card card-padded search-bar">
      <div class="form-field">
        <label for="customer-search">Search</label>
        <input
          id="customer-search"
          v-model="searchInput"
          data-testid="customer-search-input"
          type="text"
          placeholder="Name, email, phone, or company"
        />
      </div>
      <div class="form-field">
        <label for="customer-status-filter">Status</label>
        <select id="customer-status-filter" v-model="statusFilter" data-testid="customer-status-select">
          <option value="">All statuses</option>
          <option v-for="value in CUSTOMER_STATUSES" :key="value" :value="value">{{ value }}</option>
        </select>
      </div>
      <button class="btn btn-primary" type="button" data-testid="customer-search-submit" @click="onSearch">
        Search
      </button>
    </div>

    <div v-if="canManage" class="card">
      <div class="card-header">
        <h3 class="card-title">Create customer</h3>
      </div>
      <form class="card-padded" data-testid="create-customer-form" @submit.prevent="onCreate">
        <div class="form-grid">
          <div class="form-field">
            <label for="customer-name">Name</label>
            <input id="customer-name" v-model="name" data-testid="customer-name-input" type="text" required />
          </div>
          <div class="form-field">
            <label for="customer-email">Email</label>
            <input id="customer-email" v-model="email" data-testid="customer-email-input" type="email" required />
          </div>
          <div class="form-field">
            <label for="customer-phone">Phone</label>
            <input id="customer-phone" v-model="phone" data-testid="customer-phone-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-company">Company</label>
            <input id="customer-company" v-model="company" data-testid="customer-company-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-address">Address</label>
            <input id="customer-address" v-model="address" data-testid="customer-address-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-city">City</label>
            <input id="customer-city" v-model="city" data-testid="customer-city-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-country">Country</label>
            <input id="customer-country" v-model="country" data-testid="customer-country-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-status-create">Status</label>
            <select id="customer-status-create" v-model="status" data-testid="customer-status-input">
              <option v-for="value in CUSTOMER_STATUSES" :key="value" :value="value">{{ value }}</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" data-testid="create-customer-submit">Create customer</button>
        </div>
      </form>
    </div>
    <AlertBanner v-else variant="info" data-testid="customers-readonly-hint">
      You have read-only access to the customer directory.
    </AlertBanner>

    <LoadingState v-if="store.loading" data-testid="customers-loading">Loading customers…</LoadingState>

    <EmptyState
      v-else-if="isEmpty"
      title="No customers yet"
      description="Customers created here will show up in this list."
    />

    <div v-else class="table-wrapper">
      <table data-testid="customers-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Email</th>
            <th scope="col">Company</th>
            <th scope="col">Status</th>
            <th scope="col">Created</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in store.customers" :key="customer.id" data-testid="customer-row">
            <td class="cell-strong">
              <RouterLink :to="{ name: 'customer-detail', params: { id: customer.id } }">{{ customer.name }}</RouterLink>
            </td>
            <td>{{ customer.email }}</td>
            <td>{{ customer.company ?? '—' }}</td>
            <td>
              <StatusBadge :variant="statusVariant(customer.status)">{{ customer.status }}</StatusBadge>
            </td>
            <td>{{ new Date(customer.createdAt).toLocaleDateString() }}</td>
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

.search-bar {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.search-bar .form-field {
  margin-bottom: 0;
}
</style>
