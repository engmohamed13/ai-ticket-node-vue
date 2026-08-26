import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CustomersView from '../views/CustomersView.vue';
import { useAuthStore } from '../stores/auth';
import { fetchCustomers } from '../services/customers.service';

vi.mock('../services/customers.service', () => ({
  fetchCustomers: vi.fn(),
  fetchCustomer: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  fetchCustomerTickets: vi.fn(),
  fetchCustomerTimeline: vi.fn(),
  fetchCustomerNotes: vi.fn(),
  addCustomerNote: vi.fn(),
  fetchCustomerAttachments: vi.fn(),
  uploadCustomerAttachment: vi.fn(),
  deleteCustomerAttachment: vi.fn(),
  downloadCustomerAttachment: vi.fn()
}));

const mockedFetchCustomers = fetchCustomers as unknown as ReturnType<typeof vi.fn>;

const customersFixture = [
  { id: 1, name: 'Acme Corp', email: 'contact@acme.example', phone: null, company: 'Acme', address: null, city: null, country: null, status: 'ACTIVE', createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' },
  { id: 2, name: 'Beta LLC', email: 'hi@beta.example', phone: null, company: 'Beta', address: null, city: null, country: null, status: 'PROSPECT', createdAt: '2026-08-25T00:00:00Z', updatedAt: '2026-08-25T00:00:00Z' }
];

const signInAs = (permissions: string[]): void => {
  const auth = useAuthStore();
  auth.token = 'jwt';
  auth.user = {
    id: 99,
    name: 'Me',
    email: 'me@crm.local',
    isActive: true,
    roleKey: 'SYSTEM_ADMINISTRATOR',
    roleName: 'System Administrator',
    permissions: permissions as never,
    customerId: null,
    department: null,
    branch: null
  };
};

describe('CustomersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockedFetchCustomers.mockResolvedValue(customersFixture);
  });

  it('renders the create form and one row per customer when the user has customers:manage', async () => {
    signInAs(['customers:read', 'customers:manage']);

    const wrapper = mount(CustomersView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();

    expect(wrapper.find('[data-testid="create-customer-form"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="customer-row"]')).toHaveLength(2);
  });

  it('hides the create form and shows a readonly hint with only customers:read', async () => {
    signInAs(['customers:read']);

    const wrapper = mount(CustomersView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();

    expect(wrapper.find('[data-testid="create-customer-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="customers-readonly-hint"]').exists()).toBe(true);
  });

  it('calls loadCustomers with the typed search value on submit', async () => {
    signInAs(['customers:read']);

    const wrapper = mount(CustomersView, { global: { stubs: { RouterLink: true } } });
    await flushPromises();
    mockedFetchCustomers.mockClear();

    await wrapper.find('[data-testid="customer-search-input"]').setValue('acme');
    await wrapper.find('[data-testid="customer-search-submit"]').trigger('click');
    await flushPromises();

    expect(mockedFetchCustomers).toHaveBeenCalledWith({ search: 'acme', status: undefined });
  });
});
