import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CustomerDetailView from '../views/CustomerDetailView.vue';
import { useAuthStore } from '../stores/auth';
import {
  fetchCustomer,
  fetchCustomerAttachments,
  fetchCustomerNotes,
  fetchCustomerTickets,
  fetchCustomerTimeline
} from '../services/customers.service';

vi.mock('vue-router', async () => {
  const actual = await vi.importActual<typeof import('vue-router')>('vue-router');
  return { ...actual, useRoute: () => ({ params: { id: '1' } }) };
});

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

const mockedFetchCustomer = fetchCustomer as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerAttachments = fetchCustomerAttachments as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerNotes = fetchCustomerNotes as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerTickets = fetchCustomerTickets as unknown as ReturnType<typeof vi.fn>;
const mockedFetchCustomerTimeline = fetchCustomerTimeline as unknown as ReturnType<typeof vi.fn>;

const sampleCustomer = {
  id: 1,
  name: 'John',
  email: 'john@example.com',
  phone: null,
  company: null,
  address: null,
  city: null,
  country: null,
  status: 'ACTIVE',
  createdAt: '2026-08-25T00:00:00Z',
  updatedAt: '2026-08-25T00:00:00Z'
};

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

const mountView = () => mount(CustomerDetailView, { global: { stubs: { RouterLink: true } } });

describe('CustomerDetailView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('shows the loading state while the detail request is in flight', async () => {
    signInAs(['customers:read']);
    let resolveFetch: (() => void) | undefined;
    mockedFetchCustomer.mockReturnValue(new Promise((resolve) => { resolveFetch = () => resolve(sampleCustomer); }));
    mockedFetchCustomerNotes.mockResolvedValue([]);
    mockedFetchCustomerAttachments.mockResolvedValue([]);
    mockedFetchCustomerTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="customer-detail-loading"]').exists()).toBe(true);

    resolveFetch?.();
    await flushPromises();
  });

  it('shows the not-found state when the customer fails to load', async () => {
    signInAs(['customers:read']);
    mockedFetchCustomer.mockRejectedValue(new Error('Customer not found'));
    mockedFetchCustomerNotes.mockResolvedValue([]);
    mockedFetchCustomerAttachments.mockResolvedValue([]);
    mockedFetchCustomerTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Customer not found');
  });

  it('renders the loaded profile with empty states for notes, attachments, tickets, and timeline', async () => {
    signInAs(['customers:read']);
    mockedFetchCustomer.mockResolvedValue(sampleCustomer);
    mockedFetchCustomerNotes.mockResolvedValue([]);
    mockedFetchCustomerAttachments.mockResolvedValue([]);
    mockedFetchCustomerTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="customer-profile"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('No notes yet');
    expect(wrapper.text()).toContain('No attachments yet');
    expect(wrapper.text()).toContain('No tickets yet');
    expect(wrapper.text()).toContain('No interactions yet');
  });

  it('hides manage-only controls but keeps the download button for a read-only role', async () => {
    signInAs(['customers:read']);
    mockedFetchCustomer.mockResolvedValue(sampleCustomer);
    mockedFetchCustomerNotes.mockResolvedValue([]);
    mockedFetchCustomerAttachments.mockResolvedValue([
      { id: 1, fileName: 'a.txt', mimeType: 'text/plain', sizeBytes: 3, customerId: 1, uploadedById: 1, createdAt: '2026-08-25T00:00:00Z' }
    ]);
    mockedFetchCustomerTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="edit-customer-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="add-note-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="attachment-file-input"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="delete-attachment-button"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="download-attachment-button"]').exists()).toBe(true);
  });

  it('shows manage-only controls for a customers:manage role', async () => {
    signInAs(['customers:read', 'customers:manage']);
    mockedFetchCustomer.mockResolvedValue(sampleCustomer);
    mockedFetchCustomerNotes.mockResolvedValue([]);
    mockedFetchCustomerAttachments.mockResolvedValue([]);
    mockedFetchCustomerTickets.mockResolvedValue([]);
    mockedFetchCustomerTimeline.mockResolvedValue([]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('[data-testid="edit-customer-button"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="add-note-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="attachment-file-input"]').exists()).toBe(true);
  });
});
