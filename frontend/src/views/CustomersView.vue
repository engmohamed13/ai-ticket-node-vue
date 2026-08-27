<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
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
const { t, locale } = useI18n();

/** Enum value → translated label. The value stays the wire format; only the label changes. */
const statusLabel = (value: CustomerStatus): string => t(`customers.status.${value}`);

const formatDate = (value: string): string => new Date(value).toLocaleDateString(locale.value);

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
    <PageHeader :title="t('customers.title')" :subtitle="t('customers.subtitle')" />

    <AlertBanner v-if="store.error" variant="error" data-testid="customers-error">{{ store.error }}</AlertBanner>
    <AlertBanner v-if="store.notice" variant="success" data-testid="customers-notice">{{ store.notice }}</AlertBanner>

    <div class="card card-padded search-bar">
      <div class="form-field">
        <label for="customer-search">{{ t('customers.searchLabel') }}</label>
        <input
          id="customer-search"
          v-model="searchInput"
          data-testid="customer-search-input"
          type="text"
          :placeholder="t('customers.searchPlaceholder')"
        />
      </div>
      <div class="form-field">
        <label for="customer-status-filter">{{ t('customers.statusLabel') }}</label>
        <select id="customer-status-filter" v-model="statusFilter" data-testid="customer-status-select">
          <option value="">{{ t('customers.allStatuses') }}</option>
          <option v-for="value in CUSTOMER_STATUSES" :key="value" :value="value">{{ statusLabel(value) }}</option>
        </select>
      </div>
      <button class="btn btn-primary" type="button" data-testid="customer-search-submit" @click="onSearch">
        {{ t('common.actions.search') }}
      </button>
    </div>

    <div v-if="canManage" class="card">
      <div class="card-header">
        <h3 class="card-title">{{ t('customers.createTitle') }}</h3>
      </div>
      <form class="card-padded" data-testid="create-customer-form" @submit.prevent="onCreate">
        <div class="form-grid">
          <div class="form-field">
            <label for="customer-name">{{ t('customers.fields.name') }}</label>
            <input id="customer-name" v-model="name" data-testid="customer-name-input" type="text" required />
          </div>
          <div class="form-field">
            <label for="customer-email">{{ t('customers.fields.email') }}</label>
            <input id="customer-email" v-model="email" data-testid="customer-email-input" type="email" required />
          </div>
          <div class="form-field">
            <label for="customer-phone">{{ t('customers.fields.phone') }}</label>
            <input id="customer-phone" v-model="phone" data-testid="customer-phone-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-company">{{ t('customers.fields.company') }}</label>
            <input id="customer-company" v-model="company" data-testid="customer-company-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-address">{{ t('customers.fields.address') }}</label>
            <input id="customer-address" v-model="address" data-testid="customer-address-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-city">{{ t('customers.fields.city') }}</label>
            <input id="customer-city" v-model="city" data-testid="customer-city-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-country">{{ t('customers.fields.country') }}</label>
            <input id="customer-country" v-model="country" data-testid="customer-country-input" type="text" />
          </div>
          <div class="form-field">
            <label for="customer-status-create">{{ t('customers.fields.status') }}</label>
            <select id="customer-status-create" v-model="status" data-testid="customer-status-input">
              <option v-for="value in CUSTOMER_STATUSES" :key="value" :value="value">{{ statusLabel(value) }}</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" data-testid="create-customer-submit">{{ t('customers.createSubmit') }}</button>
        </div>
      </form>
    </div>
    <AlertBanner v-else variant="info" data-testid="customers-readonly-hint">
      {{ t('customers.readOnlyHint') }}
    </AlertBanner>

    <LoadingState v-if="store.loading" data-testid="customers-loading">{{ t('customers.loading') }}</LoadingState>

    <EmptyState
      v-else-if="isEmpty"
      :title="t('customers.emptyTitle')"
      :description="t('customers.emptyDescription')"
    />

    <div v-else class="table-wrapper">
      <table data-testid="customers-table">
        <thead>
          <tr>
            <th scope="col">{{ t('customers.fields.name') }}</th>
            <th scope="col">{{ t('customers.fields.email') }}</th>
            <th scope="col">{{ t('customers.fields.company') }}</th>
            <th scope="col">{{ t('customers.fields.status') }}</th>
            <th scope="col">{{ t('customers.fields.created') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in store.customers" :key="customer.id" data-testid="customer-row">
            <td class="cell-strong">
              <RouterLink :to="{ name: 'customer-detail', params: { id: customer.id } }">{{ customer.name }}</RouterLink>
            </td>
            <td>{{ customer.email }}</td>
            <td>{{ customer.company ?? t('common.states.none') }}</td>
            <td>
              <StatusBadge :variant="statusVariant(customer.status)">{{ statusLabel(customer.status) }}</StatusBadge>
            </td>
            <td>{{ formatDate(customer.createdAt) }}</td>
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
